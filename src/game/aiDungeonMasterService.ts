import { supabase } from "@/integrations/supabase/client";

export type DungeonMasterMode = "unknown-command" | "help-tutor";

export interface DungeonMasterContext {
  goal?: string;
  requiredCommands?: string[];
  winCondition?: string;
  currentRoom?: string;
}

const fallbackReplies: Record<string, string> = {
  sudo: "You are not yet King of this realm. Try ls, cd, mkdir, rm, or mv.",
  grep: "Grep is an advanced scrying spell you have not learned. Try ls or cd for now.",
  find: "Find is an advanced scrying spell you have not learned. Try ls, cd, mkdir, rm, or mv.",
};

const replyCache = new Map<string, string>();

const shortCommand = (input: string) => input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

const normalizeInput = (input: string) => input.trim().toLowerCase().replace(/\s+/g, " ");

const targetFromWinCondition = (winCondition?: string) => {
  const match = winCondition?.match(/^mv\s+(.+?)\s+~\/inventory$/i);
  return match?.[1] ?? "the goal item";
};

const isLinuxBasicsQuestion = (input: string) =>
  /\b(new|beginner|learn|linux|terminal|command|commands|work|works|explain|how does this)\b/.test(input);

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
  const goal = context.goal || "Find the goal item and carry it to your inventory.";
  const winCondition = context.winCondition || "mv <file> ~/inventory";
  const currentRoom = context.currentRoom || "this room";
  const targetItem = targetFromWinCondition(context.winCondition);

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

  return fallbackTutorReply(input, context);
}

export async function askDungeonMaster(input: string, context: DungeonMasterContext = {}): Promise<string> {
  const cleanInput = input.trim();
  const mode: DungeonMasterMode =
    classifyTerminalInput(cleanInput) === "help-like" ? "help-tutor" : "unknown-command";
  const base = shortCommand(cleanInput);

  if (mode === "unknown-command" && fallbackReplies[base]) {
    return fallbackReplies[base];
  }

  const cacheKey = JSON.stringify({
    mode,
    input: normalizeInput(cleanInput),
    context: mode === "help-tutor" ? context : undefined,
  });
  if (replyCache.has(cacheKey)) return replyCache.get(cacheKey)!;

  try {
    const { data, error } = await supabase.functions.invoke("dungeon-master", {
      body: { input: cleanInput, mode, context: mode === "help-tutor" ? context : undefined },
    });
    if (error) throw error;

    const message = typeof data?.message === "string" ? data.message.trim() : "";
    const reply = message || fallbackDungeonMasterReply(cleanInput, mode, context);
    replyCache.set(cacheKey, reply);
    return reply;
  } catch {
    return fallbackDungeonMasterReply(cleanInput, mode, context);
  }
}
