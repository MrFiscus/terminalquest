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
  conversationHistory?: unknown;
  playerFamiliarity?: unknown;
};

// ---------------------------------------------------------------------
// Familiarity-tiered brevity guide
// ---------------------------------------------------------------------
// Demo mode (familiarity 0) keeps the Socratic / longer hint behaviour
// established by DEMO_CONTEXT — the wizard nudges and explains.
// As familiarity climbs, answers compress and become more tactical.
// Returns the per-tier system-prompt directive, max_tokens, temperature.

type BrevityTier = "demo" | "novice" | "adept" | "master";

function familiarityTier(value: unknown): BrevityTier {
  if (typeof value !== "number" || !Number.isFinite(value)) return "novice";
  if (value <= 0) return "demo";
  if (value < 34) return "novice";
  if (value < 67) return "adept";
  return "master";
}

function brevityGuide(tier: BrevityTier): {
  limit: string;
  tutorRules: string;
  maxTokens: number;
  temperature: number;
} {
  switch (tier) {
    case "demo":
      return {
        limit: "Up to 3 short sentences — lead with discovery, never give exact commands unless explicitly asked.",
        tutorRules: [
          "- Default to a hint or leading question, not the literal command.",
          "- Reveal exact commands only on explicit asks (\"what command\", \"tell me exactly\", \"give me the syntax\").",
          "- Mention the *concept* (e.g. \"a way to seek living things\") rather than the keyword.",
        ].join("\n"),
        maxTokens: 200,
        temperature: 0.55,
      };
    case "novice":
      return {
        limit: "Exactly 2 short sentences. First sentence answers; second teaches the underlying Linux idea in plain words.",
        tutorRules: [
          "- Name one specific item / door / command relevant right now.",
          "- Pair the suggestion with a one-clause reason (\"…because cd moves you between directories\").",
          "- Use backticks around any literal command. No flavour padding.",
        ].join("\n"),
        maxTokens: 120,
        temperature: 0.4,
      };
    case "adept":
      return {
        limit: "1–2 sentences, ≤30 words total. Drop preamble and pleasantries.",
        tutorRules: [
          "- Single concrete next move first; one short why-clause if it adds value.",
          "- Always backtick any literal command.",
          "- Skip the medieval flourishes — keep it dry and direct.",
        ].join("\n"),
        maxTokens: 90,
        temperature: 0.35,
      };
    case "master":
      return {
        limit: "EXACTLY one sentence, ≤18 words. No preamble, no flavour, no \"perhaps\".",
        tutorRules: [
          "- One tactical move. No explanation unless the player explicitly asked why.",
          "- Backtick any literal command.",
          "- If the answer is obvious from inventory + room state, just give it.",
        ].join("\n"),
        maxTokens: 70,
        temperature: 0.3,
      };
  }
}

const liveReactionSystemPrompt =
  "You are the Dungeon Master reacting live to a player's Linux command behavior in a 16-bit dungeon. Be specific to the event, teach one useful thing, and keep it to one short sentence. Sound like a clever mentor, not a generic tutorial. Do not invent game state. Only suggest commands available in this game: ls, cd, mkdir, pwd, cat, mv, rm, find, file, hint.";

const commandFlavorSystemPrompt = `You are the in-world voice of a Linux dungeon — a smart guide, not a tooltip.

THREE-PART FORMULA (mandatory, in this order):
1. Fantasy reaction — one short clause about what JUST happened in the world.
   Use the actual room / item / file / directory from the context. Past tense.
2. Linux meaning — "In Linux, <command> <plain-language definition>." One clause.
3. (Optional) Tiny next-step hint — ONLY if a clear next move is obvious from
   the room state. Skip this part otherwise.

LENGTH (hard cap):
- 1–2 sentences.
- 12–28 words total — count them.
- No preamble, no opening flourishes, no "thou hast successfully…".

TONE:
- Wise companion, not a chatbot. No robotic phrasing.
- Mention the actual file / door / directory by name when it's in context.
- Never reference being an AI, model, prompt, or wizard rules.
- Past tense for the world reaction; present tense for the Linux meaning.

GOOD EXAMPLES (study the rhythm):
- ls in a chamber:
  "The room reveals its secrets. In Linux, ls lists what is in the current directory."
- cd vault:
  "You step into the vault. In Linux, cd changes your current directory."
- mkdir shrine:
  "A new shrine rises from stone. In Linux, mkdir creates a new directory."
- rm broken_key:
  "The broken key crumbles away. In Linux, rm removes files or directories."
- mv relic.txt ~/inventory:
  "The relic shifts into your pack. In Linux, mv moves a file from one place to another."
- cat note.txt:
  "The note unfurls in your hands. In Linux, cat prints a file's contents to the terminal."

BAD EXAMPLES (do NOT produce):
- "You used mv. mv moves files." (too flat, no fantasy)
- "You have successfully used the ls command, which is a command in Linux that allows users to view files and folders." (robotic, way too long)
- "Try ls" (no fantasy, no Linux meaning, just an order)
- "Behold, brave adventurer, thou hast invoked the mighty ls spell of seeing!" (all flavour, no teaching)`;

const runReportSystemPrompt =
  "You are the Dungeon Master writing the final coaching note after a completed Linux dungeon. Use the provided stats. Give one personalized sentence that names the player's strength or weakness and one concrete next lesson. Be encouraging, specific, and concise.";

const mistakeCoachSystemPrompt = `You are the in-world voice of a Linux dungeon, coaching a failed command. Same rhythm as flavor, adapted for failures.

THREE-PART FORMULA (mandatory, in this order):
1. Fantasy reaction — one short clause about what just went wrong in the world,
   using the actual command / file / door from the context. Past tense.
2. Linux reason — "<command> failed because <plain-language reason>." One clause.
3. Corrected pattern — show the right shape using backticks, like \`cd hallway\`.

LENGTH (hard cap):
- 2 sentences max.
- 14–32 words total — count them.

TONE:
- Patient mentor, not condescending. Never say "wrong" or "incorrect".
- Mention the exact failing command and file/door names.
- Only suggest commands that exist in this game: ls, cd, mkdir, pwd, cat, mv, rm, find, file.

GOOD EXAMPLES:
- cd vault (door is locked):
  "The vault door does not yield. cd cannot pass a locked threshold — find the key first, then try \`cd vault\`."
- mv relic.txt (no destination):
  "The relic slips from your grip. mv needs a destination — try \`mv relic.txt ~/inventory\`."
- ls -lah (flag not in this game):
  "The shell shrugs at the unknown rune. This dungeon ignores flags — plain \`ls\` will reveal what is here."
- cd vautl (typo):
  "You knocked on the wrong stone. cd needs an exact name — try \`cd vault\` instead."

BAD EXAMPLES (do NOT produce):
- "Your command failed." (no teaching, no specifics)
- "ERROR: invalid syntax." (system-tone, no fantasy)
- "You should have known to type the correct command." (condescending)`;

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

const wizardPersonalityPrompt = (context: DungeonMasterContext, limit?: string) => {
  const tier = familiarityTier(context.playerFamiliarity);
  const guide = brevityGuide(tier);
  const effectiveLimit = limit ?? guide.limit;
  return `You are an ancient wizard who advises adventurers in a Linux terminal dungeon. Players ask you questions by typing in a terminal. You have deep knowledge of both Linux and medieval magic.

CURRENT GAME STATE:
- Current room: ${safeText(context.currentRoom, "unknown")}
- Current path: ${safeText(context.currentPath, "unknown")}
- Items visible: ${safeList(context.roomFiles) || "none"}
- Doors available: ${safeList(context.roomDoors) || "none"}
- Inventory: ${safeList(context.inventory) || "empty"}
- Goal: ${safeText(context.goal, "Find the goal item and move it into your inventory.")}
- Win condition: ${safeText(context.winCondition, "mv <file> ~/inventory")}
- Commands used so far: ${safeList(context.commandsUsed) || "none"}
- Mistakes made: ${safeCount(context.mistakeCount)}

YOUR PERSONALITY:
- Wise, warm, slightly mysterious
- You speak in medieval terms but are always clear
- You genuinely want the player to succeed
- You never just say try ls - give specific actionable advice
- You reference the actual room the player is in
- You know what items and doors are in their current room

RESPONSE RULES:
- ${effectiveLimit}
- Player familiarity tier: ${tier}. Tier-specific style:
${guide.tutorRules}
- Reference actual item/door names from the game state
- Never repeat the same advice twice in a row
- Every word must teach or move the player forward — no filler.

EXAMPLE GOOD RESPONSES:
Player: "what do i do"
Bad: "Try using ls to look around."
Good: "The ${safeText(context.currentRoom, "{currentRoom}")} holds secrets waiting to be revealed. Type ls to see what lies before you, then cd into any door that calls to you."

Player: "git push"
Bad: "That command does not work here."
Good: "Git is a version control spell unknown in this realm. But mv can move thy findings — try mv ${safeList(context.roomFiles).split(", ")[0] || "{item}"} ~/inventory."

ALWAYS personalize responses using:
- Current room name
- Items visible in room
- Doors available
- What player has in inventory
- What they just typed`;
};

const unknownCommandSystemPrompt = (context: DungeonMasterContext) => `You are the Dungeon Master of Terminal Quest, a 16-bit fantasy dungeon where Linux commands control the world.
The player interacts by typing Linux commands in a terminal.

${wizardPersonalityPrompt(context, "Max 2 sentences for unknown commands")}

AVAILABLE COMMANDS: ls, cd, mv, cat, find, mkdir, rm, pwd, file
TONE: Helpful medieval wizard, grounded, never condescending`;

const helpTutorSystemPrompt = (context: DungeonMasterContext) => `You are the Dungeon Master and Linux tutor of Terminal Quest.
The player asked for help in plain English.

${wizardPersonalityPrompt(context, "Max 3 sentences for help questions")}

YOUR ROLE:
- Answer their actual question first and directly
- Then give ONE specific actionable next step
- Teach the Linux concept simply if relevant
- Reference the actual room items and doors by name
- Never give the full walkthrough, just next step
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
    return `Player just ran: "${input}"
Command name: "${safeText(context.command)}"
Current room: "${safeText(context.currentRoom)}"
Items visible in room: ${safeList(context.roomFiles) || "none"}
Doors visible: ${safeList(context.roomDoors) || "none"}
Inventory: ${safeList(context.inventory) || "empty"}
What the terminal showed: "${safeText(context.resultSummary)}"
(Only as a fallback meaning hint): "${safeText(context.fallback)}"

Apply the THREE-PART FORMULA from the system prompt:
1. Fantasy reaction (past tense, name the actual file/room/door),
2. "In Linux, <command> <plain meaning>.",
3. Optionally one tiny next-step hint if the next move is obvious.

Hard limit: 1–2 sentences, 12–28 words total.
Do not start with "Dungeon Master:". Do not write a flag list or markdown.`;
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
Command name: "${safeText(context.command)}"
Current room: "${safeText(context.currentRoom)}"
Items visible: ${safeList(context.roomFiles) || "none"}
Doors visible: ${safeList(context.roomDoors) || "none"}
Inventory: ${safeList(context.inventory) || "empty"}
What the terminal showed: "${safeText(context.resultSummary)}"
Recent mistakes: "${safeRecent(context.mistakes)}"
(Fallback explanation hint): "${safeText(context.fallback)}"

Apply the FAILURE THREE-PART FORMULA from the system prompt:
1. Fantasy reaction to what went wrong (past tense, name the file/door),
2. "<command> failed because <plain reason>.",
3. The corrected pattern in backticks (e.g. \`cd hallway\`).

Hard limit: 1–2 sentences, 14–32 words total.
Never say "wrong" or "incorrect". Do not start with "Dungeon Master:".`;
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
Items here: "${safeList(context.roomFiles)}"
Doors here: "${safeList(context.roomDoors)}"
Inventory: "${safeList(context.inventory)}"

Reply in 1-3 short sentences.
First answer the player's actual question.
Then explain what the player should do next.
Teach briefly if useful.
Be specific and actionable.
Only suggest commands available in this game: ls, cd, mkdir, pwd, cat, mv, rm, find, file.`;
};

async function askClaude(input: string, mode: DungeonMasterMode, context: DungeonMasterContext) {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-haiku-20240307";
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
  // Help-tutor + unknown-command answer length scales with the saved
  // familiarity tier (demo=long Socratic, master=one tactical line).
  // Other modes keep their original budgets.
  const guide = brevityGuide(familiarityTier(context.playerFamiliarity));
  const maxTokens =
    mode === "help-tutor" || mode === "unknown-command" ? guide.maxTokens :
    mode === "run-report" || mode === "profile-summary" || mode === "level-intro" ? 110 :
    80;
  const temperature =
    mode === "help-tutor" || mode === "unknown-command" ? guide.temperature :
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
