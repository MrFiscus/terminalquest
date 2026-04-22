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

// Tiny FNV-1a hash used for seed-derived jitter. Keeps the edge function
// free of deps while letting us derive reproducible variation per-seed.
function seedHash(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffled<T>(items: T[], seed: string): T[] {
  const arr = items.slice();
  let h = seedHash(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 2246822507);
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const roomCountForFamiliarity = (familiarity: unknown, difficulty: string, seed: string) => {
  const fallback = difficultyDefaults[difficulty] ?? 55;
  const value = typeof familiarity === "number" && Number.isFinite(familiarity)
    ? clamp(Math.round(familiarity), 0, 100)
    : fallback;
  const base = Math.round(3 + (value / 100) * 7);
  // ±1 seed-derived jitter so two players at the same familiarity don't
  // always get the same room count. Still clamped to [3, 10].
  const jitter = (seedHash(`${seed}:rooms`) % 3) - 1;
  return clamp(base + jitter, 3, 10);
};

// Goal-phrase templates. The model picks one via the seed, giving the
// same (difficulty, familiarity) input noticeably different framing
// between runs instead of the usual "find and move X".
const goalTemplates = [
  "find {{file}} and move it to ~/inventory",
  "recover {{file}} from the deepest sealed chamber",
  "locate {{file}} hidden behind the locked door and claim it",
  "uncover {{file}} and carry it home to ~/inventory",
  "retrieve {{file}} after reading the scroll that names it",
  "breach the vault holding {{file}} and bring it back",
];

const flavorNouns = [
  "relic", "codex", "tablet", "sigil", "rune", "tome", "charter",
  "cipher", "amulet", "seal", "chart", "fragment", "ledger", "effigy",
];
const flavorAdjectives = [
  "ember", "hollow", "obsidian", "moonlit", "rusted", "whispering",
  "sunken", "bone", "ashen", "ivory", "wraith", "frozen", "twin", "cracked",
];

const prompt = (
  difficulty: string,
  familiarity: number,
  roomCount: number,
  generationSeed: string,
  weakCommands: string[],
  recentMistakes: string[],
) => {
  // Everything below pulls from the seed so two requests with different
  // seeds actually produce different levels instead of paraphrases.
  const shuffledCommands = shuffled(
    ["ls", "cd", "mkdir", "pwd", "cat", "mv", "rm", "find", "file"],
    generationSeed,
  ).join(", ");
  const templateIdx = seedHash(`${generationSeed}:goal`) % goalTemplates.length;
  const goalTemplate = goalTemplates[templateIdx];
  const adj = flavorAdjectives[seedHash(`${generationSeed}:adj`) % flavorAdjectives.length];
  const noun = flavorNouns[seedHash(`${generationSeed}:noun`) % flavorNouns.length];
  const targetHint = `${adj}-${noun}.txt`;
  // "Primary weak focus" — the single command this level is designed
  // around. Picking one (instead of asking the model to cover all) forces
  // structural variation between runs.
  const weakPool = weakCommands.length ? weakCommands : ["cd", "ls", "mv", "find"];
  const weakFocus = weakPool[seedHash(`${generationSeed}:focus`) % weakPool.length];
  const graphShape = shuffled(
    ["linear-chain", "single-branch", "two-branch", "hub-and-spoke", "snake", "T-junction"],
    generationSeed,
  )[0];

  return `You generate a dungeon level for a Linux terminal learning game.

STRICT RULES:
- Output ONLY valid JSON (no markdown, no prose)
- Keep all text fields short

GAME MODEL:
- Rooms = directories
- Items = files
- Exits = folders

INPUT:
d=${difficulty}
f=${familiarity}
rooms=${roomCount}
seed=${generationSeed}
w=${weakCommands.join(",") || "none"}
m=${recentMistakes.join(",") || "none"}
primaryWeak=${weakFocus}
graphShape=${graphShape}
goalTemplate="${goalTemplate}"
targetHint="${targetHint}"

COMMANDS (ordering randomized via seed — preserve this order when relevant):
${shuffledCommands}

VARIATION RULES (NON-NEGOTIABLE):
- The seed above MUST drive visible differences between runs.
- Use goalTemplate as a starting point — substitute {{file}} with a creative,
  thematic filename (you may use targetHint or invent a better one).
- Choose room ids that fit the graphShape: "linear-chain" rooms should
  read as a corridor, "hub-and-spoke" rooms should orbit a central room,
  "T-junction" should have one room with two divergent exits, etc.
- Two requests with different seeds should differ in: goal wording, room
  ids, file names, where the key lives, which room contains the target,
  and the order of exits. Do not output a previous solution shape.

OUTPUT SHAPE:
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

LOCKED DOOR RULES:
- Exactly one room has a locked exit that requires a key item.
- Exactly one room contains an item with "type": "key".
- The key room and the locked room MUST be different, and the key room
  must be reachable from "start" without going through the locked exit.
- The locked room (behind the locked exit) MUST contain the target file.
- Add "locked": true and "requiredKey": "<keyName>" to the exit leading
  to lockedRoom.

STRUCTURAL CONSTRAINTS:
- exactly ${roomCount} rooms
- max 2 items per room
- each room must have at least 1 exit
- rooms must form a connected graph reachable from "start"
- low f: lean on ${graphShape}, short exits list per room
- high f: more branches, more reading (${graphShape} plus 1-2 extra edges)
- ids are short, one-word, themed to match each room's purpose
- filenames may include a single dot extension (.txt / .map / .scroll)

LEARNING RULES:
- "required" MUST include primaryWeak (${weakFocus}) and at least 3 others
  from the command list.
- Design the solve path so using primaryWeak is essential, not optional.
- weak cd: add at least 2 branching exits off the start room.
- weak mv: target file must be moved to a different location to win.
- weak ls: at least one room should contain 2 items to reward listing.
- weak mkdir: the required list must include mkdir and the hint should
  nudge toward it.
- weak find: key name should be non-obvious so find becomes useful.

HINT RULES:
- Hint is ONE short sentence, <= 80 chars.
- It should not give away the key room, but it should gesture toward
  primaryWeak.

OPTIMIZATION:
- Reuse room ids in exits strings.
- Keep every text field minimal.`;
};

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
    const generationSeed = typeof body.generationSeed === "string"
      ? body.generationSeed.slice(0, 40)
      : crypto.randomUUID().slice(0, 12);
    const roomCount = roomCountForFamiliarity(familiarity, difficulty, generationSeed);
    const weakCommands = Array.isArray(body.weakCommands)
      ? body.weakCommands.filter((cmd: unknown): cmd is string => typeof cmd === "string").slice(0, 5)
      : [];
    const recentMistakes = Array.isArray(body.recentMistakes)
      ? body.recentMistakes.filter((cmd: unknown): cmd is string => typeof cmd === "string").slice(0, 5)
      : [];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "Return only compact valid JSON. No markdown. Always vary room ids, file names, and the key/locked-door placement between different seeds." }],
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt(difficulty, familiarity, roomCount, generationSeed, weakCommands, recentMistakes) }],
        }],
        generationConfig: {
          maxOutputTokens: 700,
          temperature: 0.8,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
        // Higher ceiling — the new prompt is longer and asks the model to
      }),
    });

    if (!response.ok) {
      console.error("Gemini level error", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Gemini API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const level = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
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
