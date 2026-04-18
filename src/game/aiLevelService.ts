import { supabase } from "@/integrations/supabase/client";
import { START_PATH } from "./dungeon";
import { generateDungeon, type RoomSpec } from "./generator";
import { flavorLevelRoomIds } from "./dynamicDoorNames";
import type { GameState, LinuxCommand, Room } from "./types";

export type Difficulty = "easy" | "medium" | "hard";

export interface GenerateLevelInput {
  difficulty: Difficulty;
  weakCommands: string[];
  recentMistakes: string[];
}

export interface LevelRoom {
  id: string;
  items: string[];
  exits: string[];
}

export interface GeneratedLevel {
  goal: string;
  required: LinuxCommand[];
  rooms: LevelRoom[];
  start: string;
  hint: string;
  roomMap: Record<string, Room>;
  targetFile: string;
}

type RawLevel = {
  goal?: unknown;
  required?: unknown;
  rooms?: unknown;
  start?: unknown;
  hint?: unknown;
};

const roomCounts: Record<Difficulty, number> = {
  easy: 4,
  medium: 6,
  hard: 8,
};

const validCommands = new Set<LinuxCommand>([
  "ls",
  "cd",
  "mkdir",
  "pwd",
  "cat",
  "mv",
  "rm",
  "find",
  "file",
]);

const fallbackIds = ["foyer", "vault", "archive", "crypt", "forge", "library", "cellar", "sanctum"];

const cleanId = (value: unknown, fallback: string) => {
  const raw = typeof value === "string" ? value : fallback;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18) || fallback;
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const commandList = (values: unknown): LinuxCommand[] => {
  if (!Array.isArray(values)) return [];
  return unique(values.filter((cmd): cmd is LinuxCommand => validCommands.has(cmd)));
};

const hasConnectedRooms = (rooms: LevelRoom[], start: string) => {
  const ids = new Set(rooms.map((room) => room.id));
  const links = new Map<string, Set<string>>();
  for (const room of rooms) links.set(room.id, new Set());

  for (const room of rooms) {
    for (const exit of room.exits) {
      if (!ids.has(exit)) return false;
      links.get(room.id)?.add(exit);
      links.get(exit)?.add(room.id);
    }
  }

  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const room = queue.shift()!;
    for (const next of links.get(room) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return seen.size === rooms.length;
};

export function parseLevelJson(text: string): unknown {
  return JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
}

export function validateLevel(raw: unknown, input: GenerateLevelInput): Omit<GeneratedLevel, "roomMap" | "targetFile"> | null {
  const data = raw && typeof raw === "object" ? raw as RawLevel : null;
  if (!data || !Array.isArray(data.rooms)) return null;

  const expectedRooms = roomCounts[input.difficulty];
  if (data.rooms.length !== expectedRooms) return null;

  const rooms: LevelRoom[] = [];
  const used = new Set<string>();

  for (let i = 0; i < data.rooms.length; i++) {
    const rawRoom = data.rooms[i] && typeof data.rooms[i] === "object"
      ? data.rooms[i] as Record<string, unknown>
      : null;
    if (!rawRoom) return null;

    let id = cleanId(rawRoom.id, fallbackIds[i] ?? `room${i + 1}`);
    if (used.has(id)) id = `${id}${i + 1}`;
    used.add(id);

    const items = Array.isArray(rawRoom.items)
      ? rawRoom.items.slice(0, 2).map((item, index) => cleanId(item, `item${index + 1}.txt`))
      : [];

    const exits = Array.isArray(rawRoom.exits)
      ? unique(rawRoom.exits.map((exit) => cleanId(exit, "")).filter(Boolean)).filter((exit) => exit !== id)
      : [];

    if (!exits.length) return null;
    rooms.push({ id, items, exits });
  }

  const ids = new Set(rooms.map((room) => room.id));
  for (const room of rooms) {
    if (room.exits.some((exit) => !ids.has(exit))) return null;
  }

  const start = cleanId(data.start, rooms[0].id);
  if (!ids.has(start)) return null;
  if (!hasConnectedRooms(rooms, start)) return null;

  const weak = input.weakCommands.filter((cmd): cmd is LinuxCommand => validCommands.has(cmd as LinuxCommand));
  const required = unique([...commandList(data.required), ...weak]);
  if (!required.length) return null;

  const goal = typeof data.goal === "string" ? data.goal.slice(0, 80) : "";
  if (!/\b(find|move|mv)\b/i.test(goal)) return null;

  const valid = {
    goal,
    required,
    rooms,
    start,
    hint: typeof data.hint === "string" ? data.hint.split(/\s+/).slice(0, 12).join(" ") : "Use ls, find, then mv.",
  };
  return { ...valid, ...flavorLevelRoomIds(valid.rooms, valid.start) };
}

export function fallbackLevel(input: GenerateLevelInput): Omit<GeneratedLevel, "roomMap" | "targetFile"> {
  const count = roomCounts[input.difficulty];
  const ids = fallbackIds.slice(0, count);
  const weak = input.weakCommands.filter((cmd): cmd is LinuxCommand => validCommands.has(cmd as LinuxCommand));
  const required = unique(["ls", "cd", "file", "find", "mv", ...weak] as LinuxCommand[]);
  const mainWeak = weak[0];

  if (mainWeak === "cd") {
    const level = {
      goal: "find and move path-relic.txt",
      required,
      start: ids[0],
      hint: "Choose doors carefully.",
      rooms: ids.map((id, index) => {
        if (index === 0) {
          return {
            id,
            items: ["map.txt"],
            exits: ids.slice(1, Math.min(count, 4)),
          };
        }
        return {
          id,
          items: index === count - 1 ? ["path-relic.txt"] : [],
          exits: unique([ids[0], ids[Math.min(count - 1, index + 1)]].filter((exit) => exit !== id)),
        };
      }),
    };
    return { ...level, ...flavorLevelRoomIds(level.rooms, level.start) };
  }

  if (mainWeak === "mv") {
    const level = {
      goal: "find and move cargo.txt",
      required,
      start: ids[0],
      hint: "Use mv with ~/inventory.",
      rooms: ids.map((id, index) => ({
        id,
        items: index === count - 1 ? ["cargo.txt"] : [`${id}.txt`],
        exits: unique([
          ids[(index + 1) % count],
          index > 0 ? ids[index - 1] : ids[count - 1],
        ]),
      })),
    };
    return { ...level, ...flavorLevelRoomIds(level.rooms, level.start) };
  }

  if (mainWeak === "ls") {
    const level = {
      goal: "find and move hidden-note.txt",
      required,
      start: ids[0],
      hint: "List each room first.",
      rooms: ids.map((id, index) => ({
        id,
        items: index === count - 1 ? ["hidden-note.txt"] : [`${id}.scroll`, `${id}.txt`].slice(0, 2),
        exits: unique([
          ids[(index + 1) % count],
          index + 2 < count ? ids[index + 2] : ids[0],
        ].filter((exit) => exit !== id)),
      })),
    };
    return { ...level, ...flavorLevelRoomIds(level.rooms, level.start) };
  }

  if (mainWeak === "mkdir") {
    const level = {
      goal: "find and move blueprint.txt",
      required,
      start: ids[0],
      hint: "Create a folder if stuck.",
      rooms: ids.map((id, index) => ({
        id,
        items: index === count - 1 ? ["blueprint.txt"] : [],
        exits: unique([
          ids[(index + 1) % count],
          index === 0 && count > 2 ? ids[2] : ids[index > 0 ? index - 1 : count - 1],
        ].filter((exit) => exit !== id)),
      })),
    };
    return { ...level, ...flavorLevelRoomIds(level.rooms, level.start) };
  }

  const level = {
    goal: "find and move relic.txt",
    required,
    start: ids[0],
    hint: "Use find, then mv to inventory.",
    rooms: ids.map((id, index) => ({
      id,
      items: index === count - 1 ? ["relic.txt"] : index % 2 === 0 ? [`${id}.scroll`] : [],
      exits: unique([
        ids[(index + 1) % count],
        index > 0 ? ids[index - 1] : ids[count - 1],
      ]),
    })),
  };
  return { ...level, ...flavorLevelRoomIds(level.rooms, level.start) };
}

const glyphFor = (name: string) => {
  if (name.endsWith(".scroll")) return "📜";
  if (name.endsWith(".potion")) return "🧪";
  if (name.endsWith(".jpg") || name.endsWith(".png")) return "🖼️";
  return "□";
};

export function levelToRooms(level: Omit<GeneratedLevel, "roomMap" | "targetFile">): Record<string, Room> {
  const roomById = new Map(level.rooms.map((room) => [room.id, room]));
  const children = new Map<string, string[]>();
  const parent = new Map<string, string | null>([[level.start, null]]);
  const queue = [level.start];

  while (queue.length) {
    const id = queue.shift()!;
    const room = roomById.get(id);
    if (!room) continue;
    for (const exit of room.exits) {
      if (!roomById.has(exit) || parent.has(exit)) continue;
      parent.set(exit, id);
      children.set(id, [...(children.get(id) ?? []), exit]);
      queue.push(exit);
    }
  }

  const pathFor = (id: string): string => {
    const p = parent.get(id);
    if (!p) return START_PATH;
    return `${pathFor(p)}/${id}`;
  };

  const specs: RoomSpec[] = level.rooms.map((room) => {
    const path = pathFor(room.id);
    return {
      path,
      name: room.id,
      description: `A generated chamber named ${room.id}.`,
      hasParent: room.id !== level.start,
      exits: children.get(room.id) ?? [],
      files: room.items.map((name) => ({
        name,
        glyph: glyphFor(name),
        contents: `${level.goal}\n\nHint: ${level.hint}`,
      })),
    };
  });

  return generateDungeon(specs, START_PATH);
}

function targetFromLevel(level: Omit<GeneratedLevel, "roomMap" | "targetFile">) {
  const items = level.rooms.flatMap((room) => room.items);
  const goal = level.goal.toLowerCase();
  return items.find((item) => goal.includes(item.toLowerCase())) ?? items[items.length - 1] ?? "victory.jpg";
}

async function requestAILevel(input: GenerateLevelInput): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("generate-level", {
    body: input,
  });
  if (error) throw error;
  return parseLevelJson(data?.level ?? "{}");
}

export async function generateLevel(input: GenerateLevelInput): Promise<GeneratedLevel> {
  try {
    const parsed = await requestAILevel(input);
    const valid = validateLevel(parsed, input);
    if (valid) {
      return { ...valid, targetFile: targetFromLevel(valid), roomMap: levelToRooms(valid) };
    }
  } catch (error) {
    console.warn("AI level generation failed, using fallback:", error);
  }

  const fallback = fallbackLevel(input);
  return { ...fallback, targetFile: targetFromLevel(fallback), roomMap: levelToRooms(fallback) };
}

export function levelToStatePatch(level: GeneratedLevel): Pick<
  GameState,
  "rooms" | "cwd" | "player" | "inventory" | "targetFile" | "goal" | "requiredCommands" | "winCondition" | "won" | "completionMessage"
> {
  const startRoom = level.roomMap[START_PATH];
  return {
    rooms: level.roomMap,
    cwd: START_PATH,
    player: { ...startRoom.spawn },
    inventory: [],
    targetFile: level.targetFile,
    goal: level.goal,
    requiredCommands: level.required,
    winCondition: `mv ${level.targetFile} ~/inventory`,
    won: false,
    completionMessage: null,
  };
}
