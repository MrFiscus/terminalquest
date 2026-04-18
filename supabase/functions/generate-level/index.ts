const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roomCounts: Record<string, number> = {
  easy: 4,
  medium: 6,
  hard: 8,
};

const prompt = (difficulty: string, weakCommands: string[], recentMistakes: string[]) => `You generate a dungeon level for a Linux terminal learning game.

STRICT RULES:
- Output ONLY valid JSON
- No explanation
- Keep everything minimal

GAME MODEL:
- Rooms = directories
- Items = files
- Exits = folders

INPUT:
d=${difficulty}
w=${weakCommands.join(",")}
m=${recentMistakes.join(",")}

COMMANDS:
ls, cd, mkdir, pwd, cat, mv, rm, find, file

OUTPUT:
{
  "goal": "",
  "required": [],
  "rooms": [
    {"id":"","items":[],"exits":[]}
  ],
  "start": "",
  "hint": ""
}

CONSTRAINTS:
- easy: exactly 4 rooms
- medium: exactly 6 rooms
- hard: exactly 8 rooms
- max 2 items per room
- each room must have at least 1 exit
- rooms must form a connected graph
- no coordinates
- no descriptions
- short ids, one word

LEARNING RULES:
- required must include weak commands
- goal must involve finding or moving a file

OPTIMIZATION:
- reuse room ids in exits
- keep text short
- avoid long names`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const difficulty = typeof body.difficulty === "string" && roomCounts[body.difficulty]
      ? body.difficulty
      : "easy";
    const weakCommands = Array.isArray(body.weakCommands)
      ? body.weakCommands.filter((cmd: unknown): cmd is string => typeof cmd === "string").slice(0, 5)
      : [];
    const recentMistakes = Array.isArray(body.recentMistakes)
      ? body.recentMistakes.filter((cmd: unknown): cmd is string => typeof cmd === "string").slice(0, 5)
      : [];

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Anthropic not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 520,
        temperature: 0.35,
        system: "Return only compact valid JSON. No markdown.",
        messages: [{ role: "user", content: prompt(difficulty, weakCommands, recentMistakes) }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic level error", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Anthropic API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const level = data?.content
      ?.map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text ?? "" : ""))
      ?.join("")
      ?.trim() ?? "{}";

    return new Response(JSON.stringify({ level }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-level error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
