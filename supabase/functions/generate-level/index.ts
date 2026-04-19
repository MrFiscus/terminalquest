const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const difficultyDefaults: Record<string, number> = {
  easy: 20,
  medium: 55,
  hard: 85,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roomCountForFamiliarity = (familiarity: unknown, difficulty: string) => {
  const fallback = difficultyDefaults[difficulty] ?? 55;
  const value = typeof familiarity === "number" && Number.isFinite(familiarity)
    ? clamp(Math.round(familiarity), 0, 100)
    : fallback;
  return clamp(Math.round(3 + (value / 100) * 7), 3, 10);
};

const prompt = (
  difficulty: string,
  familiarity: number,
  roomCount: number,
  generationSeed: string,
  weakCommands: string[],
  recentMistakes: string[],
) => `You generate a dungeon level for a Linux terminal learning game.

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
f=${familiarity}
rooms=${roomCount}
seed=${generationSeed}
w=${weakCommands.join(",")}
m=${recentMistakes.join(",")}

COMMANDS:
ls, cd, mkdir, pwd, cat, mv, rm, find, file

	OUTPUT:
	{
	  "goal": "",
	  "required": [],
	  "rooms": [
	    {
	      "id": "",
	      "items": [{"name": "", "type": "key"}],
	      "exits": [{"target": "", "locked": true, "requiredKey": ""}]
	    }
	  ],
	  "lockedRoom": "room-id-that-is-locked",
	  "keyRoom": "room-id-that-has-the-key",
	  "keyName": "skeleton.key",
	  "start": "",
	  "hint": ""
	}
	
	LOCKED DOORS:
	- One room must have a locked exit requiring a key item
	- One room must contain a key item with type: "key"
	- The key must be in a different room than the locked door
	- The locked room must contain the target file
	- Use keyName "skeleton.key" unless adapting names is essential
	- Add "locked": true and "requiredKey": "skeleton.key" to the exit leading to lockedRoom
	- lockedRoom is the room behind the locked exit
	- keyRoom is the room containing keyName

CONSTRAINTS:
- exactly ${roomCount} rooms
- room count is always 3-10
- max 2 items per room
- each room must have at least 1 exit
- rooms must form a connected graph
- low f: simple chain or one branch
- high f: more branches and traversal
- no coordinates
- no descriptions
- short ids, one word
- use seed to vary names and structure between runs

LEARNING RULES:
- required must include weak commands
- goal must involve finding or moving a file
- adapt visibly to weak commands
- weak cd: more branching exits
- weak mv: item movement is central
- weak ls: rooms reward listing contents
- weak mkdir: include folder creation in required/hint

OPTIMIZATION:
- reuse room ids in exits
- keep text short
- avoid long names`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const difficulty = typeof body.difficulty === "string" && difficultyDefaults[body.difficulty]
      ? body.difficulty
      : "easy";
    const fallbackFamiliarity = difficultyDefaults[difficulty] ?? 55;
    const familiarity = typeof body.familiarity === "number" && Number.isFinite(body.familiarity)
      ? clamp(Math.round(body.familiarity), 0, 100)
      : fallbackFamiliarity;
    const roomCount = roomCountForFamiliarity(familiarity, difficulty);
    const generationSeed = typeof body.generationSeed === "string"
      ? body.generationSeed.slice(0, 40)
      : crypto.randomUUID().slice(0, 12);
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
        messages: [{ role: "user", content: prompt(difficulty, familiarity, roomCount, generationSeed, weakCommands, recentMistakes) }],
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
