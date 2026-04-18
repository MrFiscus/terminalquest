const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const validCommands = "ls, cd, mkdir, pwd, cat, mv, rm, find, file";

const prompt = (input: {
  roomName: string;
  currentPath: string;
  weakCommands: string[];
  recentMistakes: string[];
  difficulty: string;
}) => `You are a level generator for a Linux-terminal dungeon game.

Generate ONLY the player's current room.
Do NOT generate the full dungeon.
Do NOT describe unexplored rooms beyond their names.
Output ONLY valid JSON.
Keep the response minimal.
Limit response to under 150 tokens.

INPUT:
Weak Commands: ${input.weakCommands.join(",")}
Recent Mistakes: ${input.recentMistakes.join(",")}
Difficulty: ${input.difficulty}
Current Path: ${input.currentPath}

OUTPUT FORMAT:
{
  "roomName": "short-room-name",
  "goal": "short objective",
  "visibleItems": [
    {
      "name": "item-name",
      "type": "file|scroll|chest|potion"
    }
  ],
  "visibleExits": [
    {
      "name": "directory-name",
      "type": "folder"
    }
  ],
  "requiredCommands": ["cmd1", "cmd2"],
  "hint": "max 12 words"
}

CONSTRAINTS:
- Use only these commands: ${validCommands}
- Show only what exists in the current room
- visibleExits must be adjacent directories only
- Do not generate coordinates
- Do not generate a full map
- Keep items to max 3
- Keep exits to max 3
- Prefer weakCommands in requiredCommands
- Goal should support learning by interaction`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const input = {
      roomName: typeof body.roomName === "string" ? body.roomName : "room",
      currentPath: typeof body.currentPath === "string" ? body.currentPath : "/home/user",
      weakCommands: Array.isArray(body.weakCommands)
        ? body.weakCommands.filter((cmd: unknown): cmd is string => typeof cmd === "string").slice(0, 5)
        : [],
      recentMistakes: Array.isArray(body.recentMistakes)
        ? body.recentMistakes.filter((cmd: unknown): cmd is string => typeof cmd === "string").slice(0, 5)
        : [],
      difficulty: typeof body.difficulty === "string" ? body.difficulty : "normal",
    };

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
        max_tokens: 260,
        temperature: 0.4,
        system: "Return only compact valid JSON. No markdown.",
        messages: [{ role: "user", content: prompt(input) }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic room error", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Anthropic API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const room = data?.content
      ?.map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text ?? "" : ""))
      ?.join("")
      ?.trim() ?? "{}";

    return new Response(JSON.stringify({ room }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-room error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
