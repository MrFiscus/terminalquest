const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DungeonMasterMode = "unknown-command" | "help-tutor";

type DungeonMasterContext = {
  goal?: unknown;
  requiredCommands?: unknown;
  winCondition?: unknown;
  currentRoom?: unknown;
};

const unknownCommandSystemPrompt =
  "You are the Dungeon Master of a 16-bit fantasy realm. The player interacts with this world via a Linux Terminal. When the player types something that looks like a command but it is not available, stay in character while being technically helpful. Briefly explain the real Linux meaning if relevant. If they use 'sudo', remind them they are not the King of this realm yet. If they use 'grep' or 'find', describe them as advanced scrying spells not yet learned. Always steer them back to: ls, cd, mkdir, rm, or mv. Tone: grounded, helpful, medieval, concise.";

const helpTutorSystemPrompt =
  "You are the Dungeon Master of a 16-bit fantasy realm and also a Linux tutor. The player may ask for help in plain English. First answer the player's actual question, then guide them toward the next useful action in the game. Teach beginner Linux concepts simply. Be concise, actionable, and helpful. Use the current goal and required commands if provided. Keep the medieval tone light and grounded. Prioritize clarity over roleplay.";

const safeText = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.slice(0, 160) : fallback;

const safeCommands = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((cmd): cmd is string => typeof cmd === "string").slice(0, 8).join(", ")
    : "";

const shortCommand = (input: string) => input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

const fallbackReply = (input: string, mode: DungeonMasterMode, context: DungeonMasterContext = {}) => {
  const base = shortCommand(input);
  if (mode === "unknown-command") {
    if (base === "sudo") return "You are not yet King of this realm. Try ls, cd, mkdir, rm, or mv.";
    if (base === "grep") return "Grep is an advanced scrying spell you have not learned. Try ls or cd for now.";
    if (base === "find") return "Find is an advanced scrying spell you have not learned. Try ls, cd, mkdir, rm, or mv.";
    return `The rune '${base || input}' is unknown here. Try ls, cd, mkdir, rm, or mv.`;
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
  const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-5-haiku-latest";
  if (!ANTHROPIC_API_KEY) return fallbackReply(input, mode, context);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: mode === "help-tutor" ? 120 : 70,
      temperature: mode === "help-tutor" ? 0.35 : 0.45,
      system: mode === "help-tutor" ? helpTutorSystemPrompt : unknownCommandSystemPrompt,
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
    const mode: DungeonMasterMode = body.mode === "help-tutor" ? "help-tutor" : "unknown-command";
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
