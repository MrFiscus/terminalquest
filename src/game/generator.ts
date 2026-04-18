import type { DoorTile, FileItem, Room, Tile } from "./types";

/**
 * Deterministic procedural room/dungeon generator.
 * - Tile-based, lightweight, no artwork.
 * - Rooms = directories, files = items, folders = doors.
 * - Doors only on wall boundaries (preferring corner-side slots).
 * - Items only on interior floor tiles, leaving the center open.
 */

// Tiny seeded PRNG (mulberry32) for deterministic output.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface RoomSpec {
  path: string;
  name: string;
  description: string;
  /** Child folder names (become doors leading into child rooms). */
  exits: string[];
  /** Files placed on floor tiles. */
  files: { name: string; glyph?: string; contents?: string }[];
  /** Whether this room has a parent (adds a `..` door). */
  hasParent: boolean;
  width?: number;
  height?: number;
}

type WallSide = "top" | "bottom" | "left" | "right";

/** Carve a walled rectangle with a floor interior. */
function carveBase(width: number, height: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push({ x, y, kind: isEdge ? "wall" : "floor" });
    }
  }
  return tiles;
}

/** Candidate door slots on a given wall side, biased toward corner-side positions. */
function doorSlotsForSide(side: WallSide, width: number, height: number): { x: number; y: number }[] {
  // Avoid the absolute corners (which look odd) — use 1 in from each end.
  const slots: { x: number; y: number }[] = [];
  if (side === "top" || side === "bottom") {
    const y = side === "top" ? 0 : height - 1;
    // corner-side first: near-left, near-right, then mid-left, mid-right
    const cands = [1, width - 2, 2, width - 3, Math.floor(width / 2) - 1, Math.floor(width / 2) + 1];
    for (const x of cands) if (x > 0 && x < width - 1) slots.push({ x, y });
  } else {
    const x = side === "left" ? 0 : width - 1;
    const cands = [1, height - 2, 2, height - 3, Math.floor(height / 2)];
    for (const y of cands) if (y > 0 && y < height - 1) slots.push({ x, y });
  }
  return slots;
}

/** Pick distinct sides for N exits (+ optional parent), distributing across walls. */
function pickSides(count: number, rng: () => number): WallSide[] {
  const all: WallSide[] = ["right", "left", "top", "bottom"];
  // Shuffle deterministically
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const out: WallSide[] = [];
  for (let i = 0; i < count; i++) out.push(all[i % all.length]);
  return out;
}

export function addDoorToRoom(room: Room, target: string): Room | null {
  if (room.doors.some((door) => door.target === target)) return null;
  const used = new Set(room.doors.map((door) => `${door.x},${door.y}`));
  const sides: WallSide[] = ["right", "top", "bottom", "left"];

  for (const side of sides) {
    for (const slot of doorSlotsForSide(side, room.width, room.height)) {
      const key = `${slot.x},${slot.y}`;
      if (used.has(key)) continue;
      return {
        ...room,
        doors: [...room.doors, { ...slot, kind: "door", target }],
      };
    }
  }

  return null;
}

/** Generate a single room from a spec deterministically (seeded by path). */
export function generateRoom(spec: RoomSpec): Room {
  const width = spec.width ?? 11;
  const height = spec.height ?? 7;
  const rng = mulberry32(hashString(spec.path));

  const tiles = carveBase(width, height);

  // Decorative torches in two upper corners.
  tiles.push({ x: 1, y: 1, kind: "torch" });
  tiles.push({ x: width - 2, y: 1, kind: "torch" });

  // Doors: parent first (always on the LEFT side so `..` reads as "back"), then exits across other sides.
  const doors: DoorTile[] = [];
  const used = new Set<string>();
  const place = (target: string, side: WallSide) => {
    const slots = doorSlotsForSide(side, width, height);
    for (const s of slots) {
      const k = `${s.x},${s.y}`;
      if (used.has(k)) continue;
      used.add(k);
      doors.push({ x: s.x, y: s.y, kind: "door", target });
      return true;
    }
    return false;
  };

  if (spec.hasParent) place("..", "left");

  const sides = pickSides(spec.exits.length, rng).filter((s) => !(spec.hasParent && s === "left"));
  // Ensure we always have enough sides if we filtered out left.
  const fallbackOrder: WallSide[] = ["right", "top", "bottom", "left"];
  spec.exits.forEach((target, i) => {
    let side = sides[i] ?? fallbackOrder[i % fallbackOrder.length];
    if (!place(target, side)) {
      // Try other sides until one works.
      for (const alt of fallbackOrder) {
        if (alt === side) continue;
        if (place(target, alt)) break;
      }
    }
  });

  // Place files on interior floor tiles, avoiding center 3x3 and door-adjacent tiles.
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const isCenter = (x: number, y: number) => Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1;
  const isDoorAdj = (x: number, y: number) =>
    doors.some((d) => Math.abs(d.x - x) + Math.abs(d.y - y) <= 1);

  const candidates: { x: number; y: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (isCenter(x, y)) continue;
      if (isDoorAdj(x, y)) continue;
      candidates.push({ x, y });
    }
  }
  // Deterministic shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const files: FileItem[] = spec.files.slice(0, candidates.length).map((f, i) => ({
    name: f.name,
    glyph: f.glyph,
    contents: f.contents,
    x: candidates[i].x,
    y: candidates[i].y,
  }));

  // Spawn near the parent door if present, else near the first exit, else center-left.
  const parentDoor = doors.find((d) => d.target === "..");
  const firstExit = doors.find((d) => d.target !== "..");
  const spawn = parentDoor
    ? { x: parentDoor.x + 1, y: parentDoor.y }
    : firstExit
      ? { x: Math.max(1, firstExit.x - 1), y: firstExit.y }
      : { x: 1, y: cy };
  // returnSpawn: arriving from a child — land just inside that child's door.
  const returnSpawn = firstExit
    ? { x: Math.max(1, Math.min(width - 2, firstExit.x - 1)), y: firstExit.y }
    : undefined;

  return {
    path: spec.path,
    name: spec.name,
    description: spec.description,
    width,
    height,
    tiles,
    doors,
    files,
    spawn,
    returnSpawn,
  };
}

/** Generate a full dungeon from a list of specs and validate reachability from root. */
export function generateDungeon(specs: RoomSpec[], rootPath: string): Record<string, Room> {
  const rooms: Record<string, Room> = {};
  for (const spec of specs) rooms[spec.path] = generateRoom(spec);

  // Reachability check: BFS via doors from the root.
  const seen = new Set<string>([rootPath]);
  const queue = [rootPath];
  while (queue.length) {
    const p = queue.shift()!;
    const r = rooms[p];
    if (!r) continue;
    for (const d of r.doors) {
      const next =
        d.target === ".." ? p.split("/").slice(0, -1).join("/") || "/" : `${p}/${d.target}`;
      if (rooms[next] && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  for (const p of Object.keys(rooms)) {
    if (!seen.has(p)) {
      // eslint-disable-next-line no-console
      console.warn(`[dungeon] unreachable room: ${p}`);
    }
  }
  return rooms;
}
