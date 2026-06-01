import { supabase } from "@/integrations/supabase/client";
import { withAiFallback } from "./aiFallback";

export type DungeonMasterMode =
  | "unknown-command"
  | "help-tutor"
  | "live-reaction"
  | "command-flavor"
  | "run-report"
  | "mistake-coach"
  | "hint-ladder"
  | "level-intro"
  | "profile-summary"
  | "chronicle-narration";

export interface DungeonMasterContext {
  tutorialId?: string;
  tutorialProgress?: Record<string, boolean>;
  goal?: string;
  requiredCommands?: string[];
  winCondition?: string;
  currentRoom?: string;
  currentPath?: string;
  inventory?: string[];
  roomFiles?: string[];
  roomDoors?: string[];
  commandsUsed?: string[];
  mistakeCount?: number;
  brokenDoorName?: string;
  repairCommand?: string;
  roomHintFiles?: string[];
  command?: string;
  resultSummary?: string;
  recentCommands?: string[];
  mistakes?: string[];
  demoScript?: string;
  eventKind?: string;
  fallback?: string;
  hintStage?: number;
  weakCommands?: string[];
  reportFacts?: {
    title?: string;
    time?: string;
    commandsUsed?: number;
    mistakesMade?: number;
    strongestCommand?: string;
    weakestCommand?: string;
    skillUnlocked?: string;
    nextLesson?: string;
  };
  profileFacts?: {
    playerName?: string;
    totalLevels?: number;
    totalCommands?: number;
    favoriteCommand?: string;
    weakCommands?: string[];
    recentMistakes?: number;
  };
  /**
   * Recent back-and-forth between the player and the wizard. The most
   * recent exchange comes last. Lets the model produce continuous,
   * follow-up-aware answers instead of treating every question as if
   * it were the first.
   */
  conversationHistory?: Array<{ role: "player" | "wizard"; text: string }>;
  /**
   * 0–100 Linux familiarity slider value. The wizard tunes verbosity
   * with this — beginners get walked through the steps, experts get
   * single-sentence tactical hints.
   */
  playerFamiliarity?: number;
}

const LANTERN_CATACOMBS_ID = "lantern-catacombs";

function hasRecentCommand(context: DungeonMasterContext, exact: string) {
  return context.recentCommands?.some((command) => normalizeInput(command) === normalizeInput(exact)) ?? false;
}

function isExplicitCommandAsk(input: string) {
  return /\b(what command|what should i type|what do i type|what next exactly|exact command|give me the command|tell me exactly|show me the command|next step)\b/.test(input);
}

function lanternStepReply(input: string, context: DungeonMasterContext): string | null {
  if (context.tutorialId !== LANTERN_CATACOMBS_ID) return null;

  const normalized = normalizeInput(input);
  const path = context.currentPath ?? "";
  const progress = context.tutorialProgress ?? {};
  const inventory = new Set(context.inventory ?? []);
  const files = new Set(context.roomFiles ?? []);
  const doors = new Set(context.roomDoors?.map((door) => door.replace(/\(locked\)/g, "")) ?? []);
  const explicit = isExplicitCommandAsk(normalized) || isGoalClarifier(normalized) || /\b(stuck|lost|hint|help|what now)\b/.test(normalized);

  if (path.endsWith("/catacombs/entrance")) {
    if (!progress.echoChildMet) {
      return "Start simple: type `help`, then `ls`, then `echo hello`.";
    }
    if (files.has("lantern.txt") && !hasRecentCommand(context, "cat lantern.txt")) {
      return explicit
        ? "Read the clue now: type `cat lantern.txt`."
        : "Read the clue with `cat lantern.txt`, then keep moving.";
    }
    if (doors.has("hallway")) {
      return "You have what you need here. Continue with `cd hallway`.";
    }
  }

  if (path.endsWith("/catacombs/entrance/hallway")) {
    if (!progress.cartographerMet) {
      return "First orient yourself: type `pwd`.";
    }
    if (!hasRecentCommand(context, "find bell")) {
      return explicit
        ? "Search for the clue by name: type `find bell`."
        : "Search for the clue by name with `find bell`.";
    }
    if (files.has("strange_bell.txt") && !hasRecentCommand(context, "cat strange_bell.txt")) {
      return explicit
        ? "Read what you found: type `cat strange_bell.txt`."
        : "Read what you found with `cat strange_bell.txt`.";
    }
    if (!progress.gateOpened) {
      return "Use the word the stone is waiting for: type `echo OPEN`.";
    }
    return "The gate is open now. Move on with `cd sealed_gate`.";
  }

  if (path.endsWith("/sealed_gate")) {
    if (!progress.elyraAskedWhoami) {
      if (!hasRecentCommand(context, "man ls")) {
        return "Elyra wants knowledge first. Type `man ls`.";
      }
      return "Now answer Elyra directly: type `whoami`.";
    }
    if (!inventory.has("lantern.key")) {
      return "Take the key into your inventory with `mv lantern.key ~/inventory`.";
    }
    return "You are ready to finish the tutorial. Type `cd sanctum`.";
  }

  if (path.endsWith("/sanctum")) {
    return "You have reached the sanctum. The next adaptive dungeon should follow from here.";
  }

  return null;
}

const fallbackReplies: Record<string, string> = {
  sudo: "Thou art not the root of this realm. Try ls to see what power you do have.",
  grep: "grep is a master scrying spell, not yet in thy grimoire. Use find <name> to search instead.",
  find: "The find spell reveals all. Try: find relic.txt to locate thy quarry.",
  python: "This realm speaks only the shell tongue. Thy scripting arts have no power here.",
  python3: "This realm speaks only the shell tongue. Thy scripting arts have no power here.",
  node: "This realm speaks only the shell tongue. Thy scripting arts have no power here.",
  npm: "This realm speaks only the shell tongue. Thy scripting arts have no power here.",
  git: "No version control exists in this dungeon, adventurer. Try ls to see what truly lies before you.",
};

const replyCache = new Map<string, string>();
const isTestRuntime = import.meta.env.MODE === "test";

const shortCommand = (input: string) => input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

const normalizeInput = (input: string) => input.trim().toLowerCase().replace(/\s+/g, " ");

const normalizeCacheInput = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, " ");

const targetFromWinCondition = (winCondition?: string) => {
  const match = winCondition?.match(/^mv\s+(.+?)\s+~\/inventory$/i);
  return match?.[1] ?? "the goal item";
};

const isLinuxBasicsQuestion = (input: string) =>
  /\b(new|beginner|learn|linux|terminal|command|commands|work|works|explain|how does this)\b/.test(input);

export function isGoalClarifier(input: string): boolean {
  const normalized = normalizeInput(input);
  return /\b(what do i do|what now|what is my goal|my goal|goal|objective|quest|win|finish|complete|help)\b/.test(normalized);
}

export function buildGoalClarifierReply(context: DungeonMasterContext = {}): string {
  const tutorialReply = lanternStepReply("what is my goal", context);
  if (tutorialReply) return tutorialReply;

  const goal = context.goal || "Find the goal item and move it into your inventory.";
  const commands = context.requiredCommands ?? [];
  const target = targetFromWinCondition(context.winCondition);

  if (context.winCondition) {
    return `Your goal is to move ${target} into your inventory. Seek it, then use \`${context.winCondition}\`.`;
  }

  const useful = commands.filter((cmd) => ["find", "ls", "cd", "mv", "mkdir"].includes(cmd)).slice(0, 3);
  const commandText = useful.length ? ` Useful commands: ${useful.join(", ")}.` : "";
  return `Your goal is: ${goal}.${commandText}`;
}

function isRepairQuestion(input: string): boolean {
  return /\b(repair|fix|mend|build|rebuild|broken|doorway|door)\b/.test(input);
}

function buildRepairReply(context: DungeonMasterContext): string | null {
  if (!context.brokenDoorName) return null;
  const hintFile = context.roomHintFiles?.[0];
  if (hintFile) {
    return `The ${context.brokenDoorName} door is broken. Type \`ls\` to survey this room, then read the clue with \`cat\`. The clue will tell you how to repair the door.`;
  }
  return `The ${context.brokenDoorName} door is broken. Type \`ls\` to look for a clue in this room, then use \`cat <file>\` to read it.`;
}

export function classifyTerminalInput(input: string): "command-like" | "help-like" {
  const normalized = normalizeInput(input);
  const first = shortCommand(normalized);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (!normalized) return "command-like";
  if (["hi", "hello", "hey"].includes(normalized)) return "help-like";
  if (["sudo", "grep", "find"].includes(first)) return "command-like";
  if (/[?]/.test(normalized)) return "help-like";

  const helpPattern =
    /\b(i|im|i'm|am|lost|help|what|where|how|why|when|which|can|could|should|next|now|win|goal|item|file|move|go|do|does|explain|linux|terminal|command)\b/;
  if (helpPattern.test(normalized)) return "help-like";
  if (words.length >= 3) return "help-like";

  return "command-like";
}

function fallbackTutorReply(input: string, context: DungeonMasterContext): string {
  const normalized = normalizeInput(input);
  const tutorialReply = lanternStepReply(normalized, context);
  if (tutorialReply) return tutorialReply;
  const goal = context.goal || "Find the goal item and carry it to your inventory.";
  const winCondition = context.winCondition || "mv <file> ~/inventory";
  const currentRoom = context.currentRoom || "this room";
  const targetItem = targetFromWinCondition(context.winCondition);

  const repairReply = isRepairQuestion(normalized) ? buildRepairReply(context) : null;
  if (repairReply) return repairReply;

  if (isLinuxBasicsQuestion(normalized)) {
    return "Linux works by typing commands into a terminal. Here, use ls to list the room, cd <door> to enter a directory, and mv <file> ~/inventory to move a file.";
  }
  if (/\b(win|finish|goal|complete)\b/.test(normalized)) {
    return `Your quest is: ${goal} To finish, type ${winCondition}.`;
  }
  if (/\b(move|carry|put|inventory|mv)\b/.test(normalized)) {
    return `Use mv to move a file: ${winCondition}. In Linux, mv means "move" or "rename."`;
  }
  if (/\b(where|item|file|find)\b/.test(normalized)) {
    return `Look for ${targetItem} with ls in each room. Use cd <door> to enter another room.`;
  }
  if (/\b(lost|what now|next|go|do)\b/.test(normalized)) {
    return `You are in ${currentRoom}. Type ls to see doors and files, then cd <door> to explore.`;
  }
  if (/\b(cd|door|directory|folder)\b/.test(normalized)) {
    return "Use cd <door-name> to enter a directory door. Type ls first if you need the door names.";
  }
  if (/\b(ls|look|see)\b/.test(normalized)) {
    return `Type ls to list what is in ${currentRoom}. Files are things to inspect or move; doors are directories.`;
  }

  return `Type ls to list ${currentRoom}, then use cd <door> to explore. Your goal is: ${goal}`;
}

export function fallbackDungeonMasterReply(
  input: string,
  mode: DungeonMasterMode,
  context: DungeonMasterContext = {},
): string {
  const base = shortCommand(input);
  if (mode === "unknown-command") {
    return fallbackReplies[base] ?? `The rune '${base || input}' is unknown here. Try ls, cd, mkdir, rm, or mv.`;
  }
  if (
    mode === "command-flavor" ||
    mode === "live-reaction" ||
    mode === "run-report" ||
    mode === "mistake-coach" ||
    mode === "hint-ladder" ||
    mode === "level-intro" ||
    mode === "profile-summary" ||
    mode === "chronicle-narration"
  ) {
    return context.fallback || "The dungeon listens, then answers in a low, practical whisper.";
  }

  return fallbackTutorReply(input, context);
}

async function askDungeonMasterMode(
  input: string,
  mode: DungeonMasterMode,
  context: DungeonMasterContext = {},
): Promise<string> {
  const cleanInput = input.trim();
  const cacheKey = JSON.stringify({
    mode,
    input: normalizeCacheInput(cleanInput),
    context,
  });
  if (replyCache.has(cacheKey)) return replyCache.get(cacheKey)!;

  if (isTestRuntime) {
    return sanitizeDungeonMasterReply(fallbackDungeonMasterReply(cleanInput, mode, context));
  }

  const fallback = () => sanitizeDungeonMasterReply(fallbackDungeonMasterReply(cleanInput, mode, context));
  const reply = await withAiFallback(async () => {
    const { data, error } = await supabase.functions.invoke("dungeon-master", {
      body: { input: cleanInput, mode, context },
    });
    if (error) throw error;

    const message = typeof data?.message === "string" ? data.message.trim() : "";
    return sanitizeDungeonMasterReply(message || fallbackDungeonMasterReply(cleanInput, mode, context));
  }, fallback, `dungeon-master:${mode}`);
  replyCache.set(cacheKey, reply);
  return reply;
}

export async function askDungeonMaster(input: string, context: DungeonMasterContext = {}): Promise<string> {
  const cleanInput = input.trim();
  const mode: DungeonMasterMode =
    classifyTerminalInput(cleanInput) === "help-like" ? "help-tutor" : "unknown-command";
  const base = shortCommand(cleanInput);
  const normalized = normalizeInput(cleanInput);

  if (mode === "help-tutor") {
    const tutorialReply = lanternStepReply(normalized, context);
    if (tutorialReply) return tutorialReply;
  }

  if (mode === "help-tutor" && isGoalClarifier(cleanInput)) {
    return buildGoalClarifierReply(context);
  }

  if (mode === "help-tutor" && isRepairQuestion(normalized)) {
    const repairReply = buildRepairReply(context);
    if (repairReply) return repairReply;
  }

  if (mode === "unknown-command" && fallbackReplies[base]) {
    return fallbackReplies[base];
  }

  return askDungeonMasterMode(cleanInput, mode, context);
}

export function stripDungeonMasterPrefix(text: string) {
  return text.replace(/^Dungeon Master:\s*/i, "").trim();
}

export function sanitizeDungeonMasterReply(text: string): string {
  return stripDungeonMasterPrefix(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(
      /`?find\s+~\s+-name\s+["']?([A-Za-z0-9._-]+)["']?`?/gi,
      (_match, target: string) => `find ${target}`,
    );
}

export async function askCommandFlavor(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "command-flavor", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askLiveDungeonMasterReaction(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "live-reaction", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askRunReportFeedback(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "run-report", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askMistakeCoach(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "mistake-coach", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askHintLadder(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "hint-ladder", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askLevelIntro(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "level-intro", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askProfileSummary(
  input: string,
  context: DungeonMasterContext,
  fallback: string,
): Promise<string> {
  return askDungeonMasterMode(input, "profile-summary", {
    ...context,
    fallback: stripDungeonMasterPrefix(fallback),
  });
}

export async function askChronicleNarration(
  input: string,
  context: DungeonMasterContext,
): Promise<string> {
  const fallback = "A deed is done in the dark silence.";
  return askDungeonMasterMode(input, "chronicle-narration", {
    ...context,
    fallback,
  });
}
