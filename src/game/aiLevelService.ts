import { supabase } from "@/integrations/supabase/client";
import { START_PATH, markLockedDoors } from "./dungeon";
import { generateDungeon, type RoomSpec } from "./generator";
import { flavorLevelRoomIds } from "./dynamicDoorNames";
import type { DifficultyMechanic, GameState, LinuxCommand, Room } from "./types";

export type Difficulty = "easy" | "medium" | "hard";

export interface GenerateLevelInput {
  difficulty: Difficulty;
  weakCommands: string[];
  recentMistakes: string[];
  familiarity?: number;
  generationSeed?: string;
}

export interface LevelRoom {
  id: string;
  items: Array<LevelItem | string>;
  exits: string[];
  lockedExits?: LevelLockedExit[];
}

export interface LevelItem {
  name: string;
  type?: "key";
}

export interface LevelLockedExit {
  target: string;
  requiredKey: string;
}

export interface GeneratedLevel {
  goal: string;
  required: LinuxCommand[];
  rooms: LevelRoom[];
  start: string;
  hint: string;
  roomMap: Record<string, Room>;
  targetFile: string;
  lockedRoom?: string;
  keyRoom?: string;
  keyName?: string;
  difficultyValue?: number;
  mechanic?: DifficultyMechanic;
  lockedCommands?: LinuxCommand[];
}

type RawLevel = {
  goal?: unknown;
  required?: unknown;
  rooms?: unknown;
  start?: unknown;
  hint?: unknown;
  lockedRoom?: unknown;
  keyRoom?: unknown;
  keyName?: unknown;
};

const defaultFamiliarityByDifficulty: Record<Difficulty, number> = {
  easy: 20,
  medium: 55,
  hard: 85,
};

const validCommands = new Set<LinuxCommand>([
  "ls",
  "cd",
  "mkdir",
  "chmod",
  "pwd",
  "cat",
  "mv",
  "rm",
  "find",
  "file",
  "touch",
  "cp",
  "grep",
]);

const fallbackIds = [
  "foyer",
  "vault",
  "archive",
  "crypt",
  "forge",
  "library",
  "cellar",
  "sanctum",
  "gallery",
  "observatory",
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function roomCountForFamiliarity(familiarity: number | undefined, difficulty: Difficulty) {
  const value = Number.isFinite(familiarity)
    ? clamp(Math.round(familiarity as number), 0, 100)
    : defaultFamiliarityByDifficulty[difficulty];
  return clamp(Math.round(3 + (value / 100) * 7), 3, 10);
}

const cleanId = (value: unknown, fallback: string) => {
  const raw = typeof value === "string" ? value : fallback;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18) || fallback;
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const itemName = (item: LevelItem | string) => typeof item === "string" ? item : item.name;

const normalizeItem = (value: unknown, fallback: string): LevelItem | null => {
  if (typeof value === "string") return { name: cleanId(value, fallback) };
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = cleanId(raw.name, fallback);
  return {
    name,
    type: raw.type === "key" ? "key" : undefined,
  };
};

const normalizeExit = (value: unknown): { target: string; locked?: boolean; requiredKey?: string } | null => {
  if (typeof value === "string") {
    const target = cleanId(value, "");
    return target ? { target } : null;
  }
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const target = cleanId(raw.target ?? raw.exit, "");
  if (!target) return null;
  return {
    target,
    locked: raw.locked === true,
    requiredKey: typeof raw.requiredKey === "string" ? cleanId(raw.requiredKey, "skeleton.key") : undefined,
  };
};

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

  const expectedRooms = roomCountForFamiliarity(input.familiarity, input.difficulty);
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
      ? rawRoom.items.slice(0, 2).map((item, index) => normalizeItem(item, `item${index + 1}.txt`)).filter(Boolean) as LevelItem[]
      : [];

    const parsedExits = Array.isArray(rawRoom.exits)
      ? rawRoom.exits.map(normalizeExit).filter(Boolean) as NonNullable<ReturnType<typeof normalizeExit>>[]
      : [];
    const legacyLockedExits = Array.isArray(rawRoom.lockedExits)
      ? rawRoom.lockedExits.map(normalizeExit).filter(Boolean) as NonNullable<ReturnType<typeof normalizeExit>>[]
      : [];
    const exits = unique(parsedExits.map((exit) => exit.target).filter(Boolean)).filter((exit) => exit !== id);
    const lockedExits = [...parsedExits, ...legacyLockedExits]
      .filter((exit) => exit.locked && exit.requiredKey && exit.target !== id)
      .map((exit) => ({ target: exit.target, requiredKey: exit.requiredKey! }));

    if (!exits.length) return null;
    rooms.push({ id, items, exits, lockedExits: lockedExits.length ? lockedExits : undefined });
  }

  const ids = new Set(rooms.map((room) => room.id));
  for (const room of rooms) {
    if (room.exits.some((exit) => !ids.has(exit))) return null;
  }

  const start = cleanId(data.start, rooms[0].id);
  if (!ids.has(start)) return null;
  if (!hasConnectedRooms(rooms, start)) return null;

  const keyName = cleanId(data.keyName, "skeleton.key");
  const lockedExit = rooms.flatMap((room) => room.lockedExits ?? [])[0];
  const lockedRoom = cleanId(data.lockedRoom, lockedExit?.target ?? "");
  const keyRoom = cleanId(
    data.keyRoom,
    rooms.find((room) => room.items.some((item) => typeof item !== "string" && (item.name === keyName || item.type === "key")))?.id ?? "",
  );
  if (!ids.has(lockedRoom) || !ids.has(keyRoom)) return null;
  if (lockedRoom === start || lockedRoom === keyRoom) return null;
  const lockSourceRoom = rooms.find((room) => room.lockedExits?.some((exit) => exit.target === lockedRoom));
  if (lockSourceRoom && lockSourceRoom.id === keyRoom) return null;
  const keyHolder = rooms.find((room) => room.id === keyRoom);
  if (!keyHolder) return null;
  if (!keyHolder.items.some((item) => itemName(item) === keyName)) {
    keyHolder.items = [...keyHolder.items.slice(0, 1), { name: keyName, type: "key" }];
  } else {
    keyHolder.items = keyHolder.items.map((item) =>
      itemName(item) === keyName ? { ...(typeof item === "string" ? { name: item } : item), type: "key" } : item,
    );
  }
  const targetName = targetNameFromLevel({ goal: typeof data.goal === "string" ? data.goal : "", rooms });
  const targetHolder = rooms.find((room) => room.id === lockedRoom);
  if (!targetHolder?.items.some((item) => itemName(item) === targetName)) return null;

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
    lockedRoom,
    keyRoom,
    keyName,
  };
  const flavored = flavorLevelRoomIds(valid.rooms, valid.start, input.generationSeed ?? input.difficulty, {
    lockedRoom,
    keyRoom,
  });
  return { ...valid, ...flavored };
}

function targetNameFromLevel(level: Pick<GeneratedLevel, "goal" | "rooms">) {
  const items = level.rooms.flatMap((room) => room.items.map(itemName));
  const goal = level.goal.toLowerCase();
  return items.find((item) => goal.includes(item.toLowerCase())) ?? items[items.length - 1] ?? "victory.jpg";
}

function withFallbackLock<T extends Omit<GeneratedLevel, "roomMap" | "targetFile">>(level: T): T {
  const lockedRoom = level.rooms.at(-1)?.id;
  if (!lockedRoom) return level;
  const lockSource = level.rooms.find((room) => room.id !== lockedRoom && room.exits.includes(lockedRoom)) ?? level.rooms[0];
  const keyRoom =
    level.rooms.find((room) => room.id !== lockedRoom && room.id !== lockSource.id)?.id ??
    level.rooms.find((room) => room.id !== lockedRoom)?.id ??
    level.start;
  const keyName = "skeleton.key";
  const targetFile = targetNameFromLevel(level);

  return {
    ...level,
    lockedRoom,
    keyRoom,
    keyName,
    rooms: level.rooms.map((room) => {
      const keyItems =
        room.id === keyRoom && !room.items.some((item) => itemName(item) === keyName)
          ? [...room.items.slice(0, 1), { name: keyName, type: "key" as const }]
          : room.items.map((item) =>
              itemName(item) === keyName ? { ...(typeof item === "string" ? { name: item } : item), type: "key" as const } : item,
            );
      const targetItems =
        room.id === lockedRoom && !keyItems.some((item) => itemName(item) === targetFile)
          ? [...keyItems.slice(0, 1), targetFile]
          : keyItems;
      return {
        ...room,
        items: targetItems,
        lockedExits:
          room.id === lockSource.id
            ? [
                ...(room.lockedExits ?? []).filter((exit) => exit.target !== lockedRoom),
                { target: lockedRoom, requiredKey: keyName },
              ]
            : room.lockedExits,
      };
    }),
  };
}

export function fallbackLevel(input: GenerateLevelInput): Omit<GeneratedLevel, "roomMap" | "targetFile"> {
  const familiarity = Number.isFinite(input.familiarity)
    ? clamp(Math.round(input.familiarity as number), 0, 100)
    : defaultFamiliarityByDifficulty[input.difficulty];
  const count = roomCountForFamiliarity(familiarity, input.difficulty);
  const seed = input.generationSeed ?? `${input.difficulty}/${familiarity}`;
  const offset = hashSeed(seed) % fallbackIds.length;
  const ids = fallbackIds.map((_, index) => fallbackIds[(index + offset) % fallbackIds.length]).slice(0, count);
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
    return withFallbackLock({ ...level, ...flavorLevelRoomIds(level.rooms, level.start, seed) });
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
    return withFallbackLock({ ...level, ...flavorLevelRoomIds(level.rooms, level.start, seed) });
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
    return withFallbackLock({ ...level, ...flavorLevelRoomIds(level.rooms, level.start, seed) });
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
    return withFallbackLock({ ...level, ...flavorLevelRoomIds(level.rooms, level.start, seed) });
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
  return withFallbackLock({ ...level, ...flavorLevelRoomIds(level.rooms, level.start, seed) });
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
      files: room.items.map((item) => {
        const name = itemName(item);
        return {
          name,
          glyph: glyphFor(name),
          type: typeof item === "string" ? undefined : item.type,
          contents: `${level.goal}\n\nHint: ${level.hint}`,
        };
      }),
    };
  });

  return markLevelLocks(level, generateDungeon(specs, START_PATH));
}

function targetFromLevel(level: Omit<GeneratedLevel, "roomMap" | "targetFile">) {
  return targetNameFromLevel(level);
}

function lockSpecsForLevel(level: Omit<GeneratedLevel, "roomMap" | "targetFile">) {
  if (!level.lockedRoom || !level.keyName) return [];
  const roomById = new Map(level.rooms.map((room) => [room.id, room]));
  const parent = new Map<string, string | null>([[level.start, null]]);
  const queue = [level.start];

  while (queue.length) {
    const id = queue.shift()!;
    const room = roomById.get(id);
    if (!room) continue;
    for (const exit of room.exits) {
      if (!roomById.has(exit) || parent.has(exit)) continue;
      parent.set(exit, id);
      queue.push(exit);
    }
  }

  const sourceId = parent.get(level.lockedRoom);
  if (!sourceId) return [];

  const pathFor = (id: string): string => {
    const p = parent.get(id);
    if (!p) return START_PATH;
    return `${pathFor(p)}/${id}`;
  };

  return [
    {
      roomPath: pathFor(sourceId),
      target: level.lockedRoom,
      requiredKey: level.keyName,
    },
  ];
}

function markLevelLocks(
  level: Omit<GeneratedLevel, "roomMap" | "targetFile">,
  rooms: Record<string, Room>,
) {
  return markLockedDoors(rooms, lockSpecsForLevel(level));
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
  "rooms" | "cwd" | "player" | "inventory" | "targetFile" | "goal" | "requiredCommands" | "winCondition" | "won" | "completionMessage" | "difficultyValue" | "mechanic" | "lockedCommands" | "mauSecretKnown"
> {
  const rooms = markLevelLocks(level, level.roomMap);
  const startRoom = rooms[START_PATH];
  return {
    rooms,
    cwd: START_PATH,
    player: { ...startRoom.spawn },
    inventory: [],
    targetFile: level.targetFile,
    goal: level.goal,
    requiredCommands: level.required,
    winCondition: `mv ${level.targetFile} ~/inventory`,
    won: false,
    completionMessage: null,
    difficultyValue: level.difficultyValue,
    mechanic: level.mechanic,
    lockedCommands: level.lockedCommands ?? [],
    mauSecretKnown: false,
  };
}
