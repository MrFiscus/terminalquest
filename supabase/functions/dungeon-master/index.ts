const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DungeonMasterMode =
  | "unknown-command"
  | "help-tutor"
  | "live-reaction"
  | "command-flavor"
  | "run-report"
  | "mistake-coach"
  | "hint-ladder"
  | "level-intro"
  | "profile-summary";

type DungeonMasterContext = {
  goal?: unknown;
  requiredCommands?: unknown;
  winCondition?: unknown;
  currentRoom?: unknown;
  currentPath?: unknown;
  inventory?: unknown;
  roomFiles?: unknown;
  roomDoors?: unknown;
  commandsUsed?: unknown;
  mistakeCount?: unknown;
  command?: unknown;
  resultSummary?: unknown;
  recentCommands?: unknown;
  mistakes?: unknown;
  demoScript?: unknown;
  eventKind?: unknown;
  fallback?: unknown;
  hintStage?: unknown;
  weakCommands?: unknown;
  reportFacts?: unknown;
  profileFacts?: unknown;
};

const liveReactionSystemPrompt =
  "You are the Dungeon Master reacting live to a player's Linux command behavior in a 16-bit dungeon. Be specific to the event, teach one useful thing, and keep it to one short sentence. Sound like a clever mentor, not a generic tutorial. Do not invent game state. Only suggest commands available in this game: ls, cd, mkdir, pwd, cat, mv, rm, find, file, hint.";

const commandFlavorSystemPrompt =
  "You are the magical terminal voice for a 16-bit Linux dungeon. Rewrite a command result as one concise in-world sentence while preserving the real command meaning. Do not add new mechanics, items, rewards, or instructions not present in the context. Keep it vivid but practical.";

const runReportSystemPrompt =
  "You are the Dungeon Master writing the final coaching note after a completed Linux dungeon. Use the provided stats. Give one personalized sentence that names the player's strength or weakness and one concrete next lesson. Be encouraging, specific, and concise.";

const mistakeCoachSystemPrompt =
  "You are a Linux tutor inside a 16-bit dungeon. Explain why a failed command failed in one short sentence, then give the corrected pattern if obvious. Be concrete. Only mention commands available in this game: ls, cd, mkdir, pwd, cat, mv, rm, find, file, hint.";

const hintLadderSystemPrompt =
  "You are the Dungeon Master giving staged hints for a Linux dungeon. Use the provided exact fallback as the source of truth. Rewrite it as one concise hint. Earlier stages should be suggestive; later stages may be direct. Do not invent new objectives or commands.";

const levelIntroSystemPrompt =
  "You are the Dungeon Master introducing a generated Linux dungeon. Use the player's weak commands and mode. In 1-2 short sentences, make the adaptive lesson obvious and give the first useful command. Do not reveal the full solution unless demo mode is mentioned.";

const profileSummarySystemPrompt =
  "You are a Linux learning coach writing a player's profile title and summary. Use the stats only. Give one short archetype line and one concrete next skill. Keep it encouraging and specific.";

const safeText = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.slice(0, 160) : fallback;

const safeLongText = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.slice(0, 2400) : fallback;

const safeCommands = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((cmd): cmd is string => typeof cmd === "string").slice(0, 8).join(", ")
    : "";

const safeList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 16).join(", ")
    : "";

const safeCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "0";

const unknownCommandSystemPrompt = (context: DungeonMasterContext) => `You are the Dungeon Master of Terminal Quest, a 16-bit fantasy dungeon where Linux commands control the world.
The player interacts by typing Linux commands in a terminal.

CURRENT GAME STATE:
- Current room: ${safeText(context.currentRoom, "unknown")}
- Current path: ${safeText(context.currentPath, "unknown")}
- Items in room: ${safeList(context.roomFiles) || "none"}
- Exits in room: ${safeList(context.roomDoors) || "none"}
- Player inventory: ${safeList(context.inventory) || "empty"}
- Commands used so far: ${safeList(context.commandsUsed) || "none"}
- Mistakes made: ${safeCount(context.mistakeCount)}

YOUR ROLE:
- If player types an unknown command, explain what it does in real Linux briefly, then redirect to available commands
- If player seems lost, look at their current room and inventory and give a specific actionable hint
- Never give away the full solution, just the next step
- Always stay in medieval dungeon character
- Be concise, max 2 sentences
- Reference actual items and rooms by name when possible

AVAILABLE COMMANDS: ls, cd, mv, cat, find, mkdir, rm, pwd, file
TONE: Helpful medieval wizard, grounded, never condescending`;

const helpTutorSystemPrompt = (context: DungeonMasterContext) => `You are the Dungeon Master and Linux tutor of Terminal Quest.
The player asked for help in plain English.

CURRENT GAME STATE:
- Current room: ${safeText(context.currentRoom, "unknown")}
- Items here: ${safeList(context.roomFiles) || "none"}
- Exits here: ${safeList(context.roomDoors) || "none"}
- Inventory: ${safeList(context.inventory) || "empty"}
- Goal: ${safeText(context.goal, "Find the goal item and move it into your inventory.")}
- Win condition: ${safeText(context.winCondition, "mv <file> ~/inventory")}

YOUR ROLE:
- Answer their actual question first and directly
- Then give ONE specific actionable next step
- Teach the Linux concept simply if relevant
- Reference the actual room items and doors by name
- Never give the full walkthrough, just next step
- Be concise, max 3 sentences
- Light medieval tone but prioritize clarity`;

const safeRecent = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((cmd): cmd is string => typeof cmd === "string").slice(-8).join(", ")
    : "";

const safeReportFacts = (value: unknown) => {
  if (!value || typeof value !== "object") return "";
  const facts = value as Record<string, unknown>;
  return [
    `Title: ${safeText(facts.title)}`,
    `Time: ${safeText(facts.time)}`,
    `Commands used: ${typeof facts.commandsUsed === "number" ? facts.commandsUsed : ""}`,
    `Mistakes: ${typeof facts.mistakesMade === "number" ? facts.mistakesMade : ""}`,
    `Strongest command: ${safeText(facts.strongestCommand)}`,
    `Weakest command: ${safeText(facts.weakestCommand)}`,
    `Skill unlocked: ${safeText(facts.skillUnlocked)}`,
    `Next lesson: ${safeText(facts.nextLesson)}`,
  ].join("\n");
};

const safeProfileFacts = (value: unknown) => {
  if (!value || typeof value !== "object") return "";
  const facts = value as Record<string, unknown>;
  return [
    `Player: ${safeText(facts.playerName)}`,
    `Levels: ${typeof facts.totalLevels === "number" ? facts.totalLevels : ""}`,
    `Commands: ${typeof facts.totalCommands === "number" ? facts.totalCommands : ""}`,
    `Favorite command: ${safeText(facts.favoriteCommand)}`,
    `Weak commands: ${safeCommands(facts.weakCommands)}`,
    `Recent mistakes: ${typeof facts.recentMistakes === "number" ? facts.recentMistakes : ""}`,
  ].join("\n");
};

const shortCommand = (input: string) => input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

const fallbackReply = (input: string, mode: DungeonMasterMode, context: DungeonMasterContext = {}) => {
  const base = shortCommand(input);
  if (mode === "unknown-command") {
    if (base === "sudo") return "Thou art not the root of this realm. Try ls to see what power you do have.";
    if (base === "grep") return "grep is a master scrying spell, not yet in thy grimoire. Use find <name> to search instead.";
    if (base === "find") return "The find spell reveals all. Try: find relic.txt to locate thy quarry.";
    if (["python", "python3", "node", "npm"].includes(base)) return "This realm speaks only the shell tongue. Thy scripting arts have no power here.";
    if (base === "git") return "No version control exists in this dungeon, adventurer. Try ls to see what truly lies before you.";
    return `The rune '${base || input}' is unknown here. Try ls, cd, mkdir, rm, or mv.`;
  }
  if (
    mode === "live-reaction" ||
    mode === "command-flavor" ||
    mode === "run-report" ||
    mode === "mistake-coach" ||
    mode === "hint-ladder" ||
    mode === "level-intro" ||
    mode === "profile-summary"
  ) {
    return safeText(context.fallback, "The dungeon listens, then answers in a low, practical whisper.");
  }

  const winCondition = safeText(context.winCondition, "mv <file> ~/inventory");
  const goal = safeText(context.goal, "Find the goal item and move it into your inventory.");
  return `Use commands like ls, cd, and mv to explore. Your goal is: ${goal} To finish, type ${winCondition}.`;
};

const userPrompt = (input: string, mode: DungeonMasterMode, context: DungeonMasterContext) => {
  if (mode === "unknown-command") {
    return `Input: "${input}"
Reply in 1 short helpful sentence.
If relevant, briefly explain the command.
Steer toward ls, cd, mkdir, rm, or mv.`;
  }

  if (mode === "live-reaction") {
    return `Command: "${input}"
Event: "${safeText(context.eventKind)}"
Current room: "${safeText(context.currentRoom)}"
Goal: "${safeText(context.goal)}"
Recent commands: "${safeRecent(context.recentCommands)}"
Recent mistakes: "${safeRecent(context.mistakes)}"
Fallback idea: "${safeText(context.fallback)}"

Reply in exactly 1 short sentence.
React to the player's behavior, then give one useful Linux/game nudge if needed.
Do not start with "Dungeon Master:".`;
  }

  if (mode === "command-flavor") {
    return `Command: "${input}"
Command name: "${safeText(context.command)}"
Current room: "${safeText(context.currentRoom)}"
Result summary: "${safeText(context.resultSummary)}"
Fallback meaning: "${safeText(context.fallback)}"

Reply in exactly 1 short sentence.
Make it feel like the terminal is magical, but preserve the command meaning.
Do not start with "Dungeon Master:".`;
  }

  if (mode === "run-report") {
    return `Final command: "${input}"
Goal: "${safeText(context.goal)}"
Win condition: "${safeText(context.winCondition)}"
Report facts:
${safeReportFacts(context.reportFacts)}
Recent commands: "${safeRecent(context.recentCommands)}"
Mistakes: "${safeRecent(context.mistakes)}"
Fallback feedback: "${safeText(context.fallback)}"

Reply in 1-2 short sentences.
Use the facts, name a strength or weakness, and give the next lesson.
Do not start with "Dungeon Master:".`;
  }

  if (mode === "mistake-coach") {
    return `Failed command: "${input}"
Current room: "${safeText(context.currentRoom)}"
Command: "${safeText(context.command)}"
Observed result: "${safeText(context.resultSummary)}"
Recent mistakes: "${safeRecent(context.mistakes)}"
Fallback explanation: "${safeText(context.fallback)}"

Reply in exactly 1 short sentence.
Explain the mistake in beginner Linux terms and give the corrected command shape if clear.
Do not start with "Dungeon Master:".`;
  }

  if (mode === "hint-ladder") {
    return `Player typed: "${input}"
Hint stage: "${typeof context.hintStage === "number" ? context.hintStage : ""}"
Current room: "${safeText(context.currentRoom)}"
Goal: "${safeText(context.goal)}"
Source hint: "${safeText(context.fallback)}"

Reply in exactly 1 short sentence.
Use the source hint as truth.
Do not start with "Dungeon Master:".`;
  }

  if (mode === "level-intro") {
    return `Dungeon label: "${input}"
Goal: "${safeText(context.goal)}"
Required commands: "${safeCommands(context.requiredCommands)}"
Weak commands: "${safeCommands(context.weakCommands)}"
Mode/event: "${safeText(context.eventKind)}"
Fallback intro: "${safeText(context.fallback)}"

Reply in 1-2 short sentences.
Explain what this dungeon is training and suggest the first useful command.
Do not start with "Dungeon Master:".`;
  }

  if (mode === "profile-summary") {
    return `Profile facts:
${safeProfileFacts(context.profileFacts)}
Fallback summary: "${safeText(context.fallback)}"

Reply in exactly 2 short sentences.
Sentence 1: "Shell Archetype: <name>."
Sentence 2: Give the next skill to practice.
Do not start with "Dungeon Master:".`;
  }

  return `Player message: "${input}"
Goal: "${safeText(context.goal)}"
Required commands: "${safeCommands(context.requiredCommands)}"
Win condition: "${safeText(context.winCondition)}"
Current room: "${safeText(context.currentRoom)}"

Reply in 1-3 short sentences.
First answer the player's actual question.
Then explain what the player should do next.
Teach briefly if useful.
Be specific and actionable.
Only suggest commands available in this game: ls, cd, mkdir, pwd, cat, mv, rm, find, file.`;
};

async function askClaude(input: string, mode: DungeonMasterMode, context: DungeonMasterContext) {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
  if (!ANTHROPIC_API_KEY) return fallbackReply(input, mode, context);

  const systemPrompt =
    mode === "help-tutor" ? helpTutorSystemPrompt(context) :
    mode === "live-reaction" ? liveReactionSystemPrompt :
    mode === "command-flavor" ? commandFlavorSystemPrompt :
    mode === "run-report" ? runReportSystemPrompt :
    mode === "mistake-coach" ? mistakeCoachSystemPrompt :
    mode === "hint-ladder" ? hintLadderSystemPrompt :
    mode === "level-intro" ? levelIntroSystemPrompt :
    mode === "profile-summary" ? profileSummarySystemPrompt :
    unknownCommandSystemPrompt(context);
  const demoScript = safeLongText(context.demoScript);
  const systemWithDemoContext = demoScript
    ? `GAME CONTEXT: ${demoScript}

${systemPrompt}${
        mode === "help-tutor"
          ? "\nYou have full knowledge of this dungeon solution. Guide the player to their next correct step based on what they just typed."
          : ""
      }`
    : systemPrompt;
  const maxTokens =
    mode === "help-tutor" ? 120 :
    mode === "run-report" || mode === "profile-summary" || mode === "level-intro" ? 110 :
    80;
  const temperature =
    mode === "help-tutor" ? 0.35 :
    mode === "command-flavor" ? 0.55 :
    0.45;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemWithDemoContext,
      messages: [{ role: "user", content: userPrompt(input, mode, context) }],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic error", response.status, await response.text());
    return fallbackReply(input, mode, context);
  }

  const data = await response.json();
  const text = data?.content
    ?.map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text ?? "" : ""))
    ?.join("")
    ?.trim();
  return text || fallbackReply(input, mode, context);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const input = typeof body.input === "string"
      ? body.input
      : typeof body.command === "string"
        ? body.command
        : "";
    const allowedModes = new Set<DungeonMasterMode>([
      "unknown-command",
      "help-tutor",
      "live-reaction",
      "command-flavor",
      "run-report",
      "mistake-coach",
      "hint-ladder",
      "level-intro",
      "profile-summary",
    ]);
    const requestedMode = typeof body.mode === "string" ? body.mode : "";
    const mode: DungeonMasterMode = allowedModes.has(requestedMode as DungeonMasterMode)
      ? requestedMode as DungeonMasterMode
      : "unknown-command";
    const context = body.context && typeof body.context === "object"
      ? body.context as DungeonMasterContext
      : {};

    if (!input) {
      return new Response(JSON.stringify({ error: "Missing input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = await askClaude(input, mode, context);
    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dungeon-master error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
