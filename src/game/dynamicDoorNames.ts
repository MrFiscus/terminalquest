import type { LevelRoom } from "./aiLevelService";

const adjectives = [
  "ancient",
  "forgotten",
  "dusty",
  "moonlit",
  "silent",
  "mossy",
  "hidden",
  "cold",
  "ember",
  "shadow",
];

const nounHints = [
  "vault",
  "crypt",
  "archive",
  "cellar",
  "forge",
  "library",
  "sanctum",
  "hall",
  "chamber",
  "keep",
];

const hash = (value: string) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
};

const cleanPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const nounFor = (id: string) => {
  const cleaned = cleanPart(id);
  const parts = cleaned.split("-").filter(Boolean);
  return parts.find((part) => nounHints.includes(part)) ?? parts.at(-1) ?? "chamber";
};

export function flavorfulDoorName(id: string, used = new Set<string>(), seedSalt = ""): string {
  const noun = nounFor(id);
  const seed = hash(`${seedSalt}/${id}`);
  let name = `${adjectives[seed % adjectives.length]}-${noun}`.slice(0, 24).replace(/-+$/g, "");
  let suffix = 2;
  while (used.has(name)) {
    const base = name.replace(/-\d+$/, "").slice(0, 21).replace(/-+$/g, "");
    name = `${base}-${suffix++}`;
  }
  used.add(name);
  return name;
}

export function flavorLevelRoomIds(
  rooms: LevelRoom[],
  start: string,
  seedSalt = "",
): { rooms: LevelRoom[]; start: string } {
  const used = new Set<string>();
  const renamed = new Map<string, string>();
  for (const room of rooms) {
    renamed.set(room.id, flavorfulDoorName(room.id, used, seedSalt));
  }

  return {
    start: renamed.get(start) ?? start,
    rooms: rooms.map((room) => ({
      ...room,
      id: renamed.get(room.id) ?? room.id,
      exits: room.exits.map((exit) => renamed.get(exit) ?? exit),
    })),
  };
}
