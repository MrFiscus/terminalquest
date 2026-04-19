import type { DecorItem, DecorKind, DoorTile, FileItem, Room, Tile } from "./types";

/**
 * Procedural room/dungeon generator.
 *
 * Composition rule (enforced throughout): the TOP wall is the primary
 * presentation direction. Pillars, interior wall tops, and back-wall focal
 * pieces all line up against it. Other walls stay plainer to preserve a
 * single coherent viewing angle.
 *
 * Pipeline:
 *   1. Carve walled rectangle + floor interior.
 *   2. Place doors (parent on left, exits distributed across other walls).
 *   3. Architecture stage: pillars on the top wall + theme-based interior
 *      wall segments. Their tiles are reserved so no prop can overlap.
 *   4. Compute spawn + thin L-paths from spawn to every door/file.
 *   5. Place focal features per theme (altar, paired statues, chest trio,
 *      water pool) on the "presentation" side of the room.
 *   6. Stack corner clusters (storage-heavy in 3 corners, lighter elsewhere).
 *   7. Drift environmental details (cracks, inscribed floor, skulls).
 *   8. Top up with a wall-band fill pass until density target is hit.
 */

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

function key(x: number, y: number) {
  return `${x},${y}`;
}

function weightedPick<T>(rng: () => number, entries: Array<{ value: T; weight: number }>): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface RoomSpec {
  path: string;
  name: string;
  description: string;
  /** Child folder names (become doors leading into child rooms). */
  exits: string[];
  /** Files placed on floor tiles. */
  files: { name: string; glyph?: string; contents?: string; type?: "key" }[];
  /** Whether this room has a parent (adds a `..` door). */
  hasParent: boolean;
  width?: number;
  height?: number;
}

type WallSide = "top" | "bottom" | "left" | "right";
type RoomTheme = "crypt" | "vault" | "storage" | "shrine" | "prison" | "hall" | "flooded" | "trap";
type Point = { x: number; y: number };
type Corner = "nw" | "ne" | "sw" | "se";
type InteriorWallRun = { x: number; y: number; length: number; dir: "h" | "v" };
type CompactWallBlueprint = {
  h: Array<[x: number, y: number, length: number]>;
  v: Array<[x: number, y: number, length: number]>;
};

const MAX_ROOM_DOORS = 4;
const MIN_ROOM_DOORS = 2;

interface Layout {
  width: number;
  height: number;
  theme: RoomTheme;
  tiles: Tile[];
  doors: DoorTile[];
  files: FileItem[];
  decor: DecorItem[];
  spawn: Point;
  returnSpawn?: Point;
  rng: () => number;
  /** Tiles already taken by doors/files/spawn/blocking decor. */
  occupied: Set<string>;
  /** Thin L-paths from spawn to each door/file. Blocking props avoid these. */
  pathCells: Set<string>;
}

// Compact, AI-authored wall recipes. These are intentionally tiny: each run is
// [x, y, length] on an 18x12 reference room, then scaled and validated by the
// regular generator. This keeps token use near zero during play while giving
// the procedural layer many more starting structures.
const WALL_BLUEPRINT_BASE = { width: 18, height: 12 };
const AI_WALL_BLUEPRINTS: CompactWallBlueprint[] = [
  { h: [[2, 3, 5], [11, 3, 5], [6, 6, 7], [3, 9, 4]], v: [[5, 4, 4], [13, 4, 4]] },
  { h: [[3, 3, 6], [10, 6, 5], [4, 9, 7]], v: [[12, 3, 5], [5, 6, 3]] },
  { h: [[2, 3, 4], [12, 3, 4], [5, 7, 8], [2, 9, 4]], v: [[8, 4, 3], [14, 5, 4]] },
  { h: [[5, 3, 8], [2, 6, 5], [11, 9, 5]], v: [[5, 4, 5], [12, 4, 3]] },
  { h: [[2, 4, 6], [10, 4, 6], [6, 8, 6]], v: [[4, 5, 4], [14, 5, 4]] },
  { h: [[2, 3, 5], [8, 5, 7], [11, 8, 5]], v: [[7, 4, 5], [13, 5, 3]] },
  { h: [[4, 3, 4], [10, 3, 4], [2, 7, 6], [10, 9, 6]], v: [[9, 4, 5]] },
  { h: [[2, 3, 7], [10, 5, 6], [3, 9, 5]], v: [[4, 4, 4], [12, 6, 3]] },
  { h: [[3, 4, 5], [10, 4, 5], [5, 8, 8]], v: [[8, 5, 3], [15, 5, 4]] },
  { h: [[2, 5, 5], [11, 5, 5], [6, 3, 6], [7, 9, 5]], v: [[5, 6, 3], [13, 6, 3]] },
  { h: [[2, 3, 4], [7, 6, 7], [12, 9, 4]], v: [[4, 4, 5], [14, 4, 5]] },
  { h: [[3, 3, 5], [10, 3, 6], [2, 8, 5], [11, 8, 5]], v: [[9, 4, 4]] },
  { h: [[2, 4, 7], [10, 7, 6], [4, 9, 4]], v: [[11, 3, 3], [5, 5, 4]] },
  { h: [[5, 3, 5], [2, 6, 5], [9, 9, 7]], v: [[7, 4, 5], [14, 6, 3]] },
  { h: [[2, 3, 6], [10, 3, 4], [5, 6, 6], [2, 9, 5]], v: [[13, 4, 5]] },
  { h: [[4, 4, 8], [2, 8, 4], [12, 8, 4]], v: [[4, 5, 3], [13, 5, 3]] },
  { h: [[2, 3, 5], [11, 5, 5], [5, 9, 8]], v: [[6, 4, 4], [13, 6, 3]] },
  { h: [[3, 3, 4], [8, 6, 8], [3, 9, 4], [12, 9, 4]], v: [[15, 3, 4]] },
  { h: [[2, 4, 5], [9, 4, 7], [6, 8, 5]], v: [[5, 5, 4], [12, 5, 4]] },
  { h: [[5, 3, 8], [2, 7, 4], [12, 7, 4], [6, 9, 5]], v: [[9, 4, 5]] },
  { h: [[2, 3, 4], [6, 5, 7], [11, 8, 5]], v: [[4, 4, 5], [13, 3, 3]] },
  { h: [[3, 4, 6], [10, 4, 6], [4, 8, 5]], v: [[7, 5, 4], [14, 5, 4]] },
  { h: [[2, 3, 6], [9, 6, 6], [3, 9, 6]], v: [[12, 3, 5], [5, 6, 3]] },
  { h: [[4, 3, 5], [2, 6, 5], [10, 6, 6], [7, 9, 5]], v: [[15, 4, 4]] },
];

// ---------- structural layer ----------

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

function doorSlotsForSide(side: WallSide, width: number, height: number): Point[] {
  const slots: Point[] = [];
  if (side === "top" || side === "bottom") {
    const y = side === "top" ? 0 : height - 1;
    const mid = Math.floor(width / 2);
    const cands = [mid, mid - 1, mid + 1, 2, width - 3, 3, width - 4, 1, width - 2];
    for (const x of cands) if (x > 0 && x < width - 1) slots.push({ x, y });
  } else {
    const x = side === "left" ? 0 : width - 1;
    const mid = Math.floor(height / 2);
    const cands = [mid, mid - 1, mid + 1, 2, height - 3, 1, height - 2];
    for (const y of cands) if (y > 0 && y < height - 1) slots.push({ x, y });
  }
  return slots;
}

/**
 * Exit doors go on the TOP or BOTTOM wall only. Left/right are reserved
 * for clean side-wall composition (soil, torches etc. all anchor off the
 * top); putting a door there broke the one-directional reading.
 */
function pickExitSides(count: number, _hasParent: boolean, rng: () => number): WallSide[] {
  const pool: WallSide[] = ["bottom", "top"];
  const ordered = shuffle(pool, rng);
  const out: WallSide[] = [];
  for (let i = 0; i < count; i++) out.push(ordered[i % ordered.length]);
  return out;
}

function insideDoorPos(door: DoorTile, width: number, height: number): Point {
  if (door.x === 0) return { x: 1, y: door.y };
  if (door.x === width - 1) return { x: width - 2, y: door.y };
  if (door.y === 0) return { x: door.x, y: 1 };
  if (door.y === height - 1) return { x: door.x, y: height - 2 };
  return { x: door.x, y: door.y };
}

// ---------- theme & sizing ----------

function themeFromName(name: string): RoomTheme | null {
  const n = name.toLowerCase();
  if (/\b(vault|treasury|hoard)\b/.test(n)) return "vault";
  if (/\b(storage|archive|stores|warehouse|stockpile)\b/.test(n)) return "storage";
  if (/\b(crypt|grave|tomb|ossuary|catacomb)\b/.test(n)) return "crypt";
  if (/\b(shrine|sanctum|altar|chapel)\b/.test(n)) return "shrine";
  if (/\b(cell|prison|jail|oubliette)\b/.test(n)) return "prison";
  if (/\b(damp|flood|cellar|cistern|well|pool)\b/.test(n)) return "flooded";
  if (/\b(hall|corridor|gallery|passage|entry|ante|foyer)\b/.test(n)) return "hall";
  if (/\b(trap|pit|snare|trial)\b/.test(n)) return "trap";
  return null;
}

function pickTheme(spec: RoomSpec, rng: () => number): RoomTheme {
  const hinted = themeFromName(`${spec.name} ${spec.path}`);
  if (hinted) return hinted;
  return weightedPick(rng, [
    { value: "hall",    weight: spec.exits.length >= 2 ? 4 : 1 },
    { value: "storage", weight: 3 },
    { value: "crypt",   weight: 2 },
    { value: "shrine",  weight: 2 },
    { value: "vault",   weight: spec.files.length > 0 ? 2 : 1 },
    { value: "flooded", weight: 1 },
    { value: "trap",    weight: 1 },
    { value: "prison",  weight: 1 },
  ]);
}

function roomSizeForTheme(theme: RoomTheme, rng: () => number) {
  const jitter = (base: number, range: number) => base + Math.floor(rng() * range);
  switch (theme) {
    case "hall":    return { width: jitter(18, 3), height: jitter(10, 2) };
    case "storage": return { width: jitter(16, 3), height: jitter(11, 2) };
    case "vault":   return { width: jitter(15, 2), height: jitter(11, 2) };
    case "shrine":  return { width: jitter(15, 2), height: jitter(11, 2) };
    case "crypt":   return { width: jitter(16, 3), height: jitter(10, 2) };
    case "flooded": return { width: jitter(16, 2), height: jitter(11, 2) };
    case "prison":  return { width: jitter(15, 2), height: jitter(10, 2) };
    case "trap":    return { width: jitter(15, 2), height: jitter(10, 2) };
    default:        return { width: 15, height: 10 };
  }
}

// ---------- placement helpers ----------

function isInterior(width: number, height: number, x: number, y: number) {
  return x > 0 && y > 0 && x < width - 1 && y < height - 1;
}

function lineBetween(from: Point, to: Point): Point[] {
  const cells: Point[] = [];
  const xs = Math.min(from.x, to.x);
  const xe = Math.max(from.x, to.x);
  for (let x = xs; x <= xe; x++) cells.push({ x, y: from.y });
  const ys = Math.min(from.y, to.y);
  const ye = Math.max(from.y, to.y);
  for (let y = ys; y <= ye; y++) cells.push({ x: to.x, y });
  return cells;
}

function reservePaths(layout: Layout) {
  const { width, height, doors, files, spawn, pathCells } = layout;
  const add = (p: Point) => {
    if (isInterior(width, height, p.x, p.y)) pathCells.add(key(p.x, p.y));
  };
  add(spawn);
  for (const door of doors) {
    for (const p of lineBetween(spawn, insideDoorPos(door, width, height))) add(p);
  }
  for (const file of files) {
    for (const p of lineBetween(spawn, { x: file.x, y: file.y })) add(p);
  }
}

function doorAdjacent(doors: DoorTile[], x: number, y: number) {
  return doors.some((d) => Math.max(Math.abs(d.x - x), Math.abs(d.y - y)) <= 1);
}

function resolveDoorPath(currentPath: string, door: DoorTile): string {
  return door.toPath ?? (
    door.target === ".."
      ? currentPath.split("/").slice(0, -1).join("/") || "/"
      : `${currentPath}/${door.target}`
  );
}

function hasInteriorDoor(decor: DecorItem[] | undefined, x: number, y: number): boolean {
  return decor?.some((d) => d.x === x && d.y === y && d.kind === "interior-door") ?? false;
}

function hasInteriorRun(decor: DecorItem[] | undefined, x: number, y: number): boolean {
  return (
    decor?.some(
      (d) => d.x === x && d.y === y && (d.kind === "interior-wall" || d.kind === "interior-door"),
    ) ?? false
  );
}

function interiorRunAxis(decor: DecorItem[] | undefined, x: number, y: number): "h" | "v" {
  const hasLeft = hasInteriorRun(decor, x - 1, y);
  const hasRight = hasInteriorRun(decor, x + 1, y);
  const hasUp = hasInteriorRun(decor, x, y - 1);
  const hasDown = hasInteriorRun(decor, x, y + 1);
  return hasLeft || hasRight || (!hasUp && !hasDown) ? "h" : "v";
}

function generatedWallBlocks(decor: DecorItem[] | undefined, x: number, y: number): boolean {
  const items = decor ?? [];
  if (hasWallLadder(decor, x, y)) return false;
  if (items.some((d) => d.x === x && d.y === y && d.kind === "pillar")) return true;
  if (items.some((d) => d.x === x && d.y === y && d.kind === "interior-wall")) return true;

  const wallBelow = items.find((d) => d.x === x && d.y === y + 1 && d.kind === "interior-wall");
  return Boolean(wallBelow && interiorRunAxis(items, wallBelow.x, wallBelow.y) === "h");
}

function hasWallLadder(decor: DecorItem[] | undefined, x: number, y: number): boolean {
  return decor?.some((d) => d.x === x && d.y === y && d.kind === "ladder") ?? false;
}

function isRoomWalkableForNpc(room: Room, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false;
  if (room.doors.some((d) => d.x === x && d.y === y)) return true;
  if (hasInteriorDoor(room.decor, x, y)) return true;
  if (generatedWallBlocks(room.decor, x, y)) return false;
  if (room.files.some((f) => f.x === x && f.y === y)) return false;
  if (room.spawn.x === x && room.spawn.y === y) return false;
  if (room.returnSpawn?.x === x && room.returnSpawn.y === y) return false;
  if ((room.npcs ?? []).some((n) => n.x === x && n.y === y)) return false;
  const tile = room.tiles.find((t) => t.x === x && t.y === y);
  return tile?.kind === "floor" || tile?.kind === "torch";
}

/** Floor features (crack, inscribed-floor, water) don't block movement or cover props visually. */
function isFloorFeature(kind: DecorKind) {
  return kind === "crack" || kind === "inscribed-floor" || kind === "water";
}

function canPlace(
  layout: Layout,
  kind: DecorKind,
  x: number,
  y: number,
  opts: { allowDoorAdj?: boolean } = {},
): boolean {
  if (!isInterior(layout.width, layout.height, x, y)) return false;
  if (layout.occupied.has(key(x, y))) return false;
  if (!opts.allowDoorAdj && doorAdjacent(layout.doors, x, y)) return false;
  // Blocking props avoid the walkable path; floor features are allowed on it.
  if (!isFloorFeature(kind) && layout.pathCells.has(key(x, y))) return false;
  return true;
}

function place(
  layout: Layout,
  kind: DecorKind,
  x: number,
  y: number,
  opts: { allowDoorAdj?: boolean } = {},
): boolean {
  if (!canPlace(layout, kind, x, y, opts)) return false;
  layout.decor.push({ kind, x, y });
  layout.occupied.add(key(x, y));
  return true;
}

function placeFrom(
  layout: Layout,
  cells: Point[],
  kinds: DecorKind[],
  limit: number,
): number {
  let placed = 0;
  for (const cell of cells) {
    if (placed >= limit) break;
    const kind = kinds[placed % kinds.length];
    if (place(layout, kind, cell.x, cell.y)) placed++;
  }
  return placed;
}

// ---------- architecture stage: pillars + interior walls ----------

/**
 * Pillars march along the top wall at a fixed cadence. They live on the
 * first interior row (y=1) and are emitted as decor so the renderer reads
 * them from Room data. Their tiles are reserved so no prop can overlap.
 */
function placePillars(layout: Layout) {
  const { width, rng, doors } = layout;
  const topDoorX = new Set(doors.filter((d) => d.y === 0).map((d) => d.x));
  const spacing = width >= 18 ? 5 : width >= 14 ? 4 : 3;
  const start = 2 + Math.floor(rng() * 2);
  for (let x = start; x <= width - 3; x += spacing) {
    if (topDoorX.has(x) || topDoorX.has(x - 1) || topDoorX.has(x + 1)) continue;
    const cellKey = key(x, 1);
    if (layout.occupied.has(cellKey)) continue;
    layout.decor.push({ kind: "pillar", x, y: 1 });
    layout.occupied.add(cellKey);
  }
}

function compactBlueprintRunsForRoom(
  blueprint: CompactWallBlueprint,
  width: number,
  height: number,
  rng: () => number,
): InteriorWallRun[] {
  const runs: InteriorWallRun[] = [];
  const scaleX = (x: number) =>
    Math.round(2 + ((x - 2) / (WALL_BLUEPRINT_BASE.width - 4)) * Math.max(1, width - 4));
  const scaleY = (y: number) =>
    Math.round(3 + ((y - 3) / (WALL_BLUEPRINT_BASE.height - 6)) * Math.max(1, height - 6));
  const clampLength = (length: number, max: number) => Math.max(3, Math.min(max, Math.round(length)));
  const jitter = () => Math.floor(rng() * 3) - 1;

  for (const [bx, by, blen] of blueprint.h) {
    const length = clampLength(blen * ((width - 4) / (WALL_BLUEPRINT_BASE.width - 4)), width - 4);
    const x = Math.max(2, Math.min(width - 2 - length, scaleX(bx) + jitter()));
    const y = Math.max(3, Math.min(height - 3, scaleY(by) + jitter()));
    if (x + length < width - 1) runs.push({ x, y, length, dir: "h" });
  }

  for (const [bx, by, blen] of blueprint.v) {
    const length = clampLength(blen * ((height - 5) / (WALL_BLUEPRINT_BASE.height - 5)), height - 4);
    const x = Math.max(2, Math.min(width - 2, scaleX(bx) + jitter()));
    const y = Math.max(4, Math.min(height - 1 - length, scaleY(by) + jitter()));
    if (y + length < height - 1) runs.push({ x, y, length, dir: "v" });
  }

  return shuffle(runs, rng);
}

/**
 * Interior wall templates per theme. Each template returns an array of
 * structural wall runs placed inside the room. Most runs come from compact
 * AI-authored blueprints, with procedural archetypes as a deterministic
 * fallback. Placement later rejects anything that violates room rules.
 */
function interiorWallTemplate(
  theme: RoomTheme,
  width: number,
  height: number,
  rng: () => number,
): InteriorWallRun[] {
  const cx = Math.floor(width / 2);
  const runs: InteriorWallRun[] = [];
  if (width < 12 || height < 9) return runs;

  if (rng() < 0.82) {
    const blueprint = AI_WALL_BLUEPRINTS[Math.floor(rng() * AI_WALL_BLUEPRINTS.length)];
    const blueprintRuns = compactBlueprintRunsForRoom(blueprint, width, height, rng);
    if (blueprintRuns.length >= 4) return blueprintRuns;
  }

  // All interior wall runs are at LEAST 3 tiles long so they read as real
  // partitions, not sketchy two-block stubs. Pushed down to y=3 so the soil
  // cap above them stays clear of the pillar row at y=1.
  const rowY = 3;
  const midY = Math.max(rowY + 2, Math.floor(height * 0.52));
  const lowY = Math.max(rowY + 3, height - 3);
  const midDrift = Math.max(rowY + 2, Math.min(height - 4, midY + Math.floor(rng() * 3) - 1));
  const lowDrift = Math.max(midDrift + 2, Math.min(height - 3, lowY + Math.floor(rng() * 3) - 1));
  const shortLen = Math.max(3, Math.min(4, Math.floor(width * 0.22) + Math.floor(rng() * 2)));
  const mediumLen = Math.max(4, Math.min(6, Math.floor(width * 0.3) + Math.floor(rng() * 2)));
  const longLen = Math.max(5, Math.min(7, Math.floor(width * 0.36) + Math.floor(rng() * 2)));
  const roomShift = Math.floor(rng() * 3) - 1;
  const clampX = (x: number, length = 1) => Math.max(2, Math.min(width - 1 - length, x));
  const variant = Math.floor(rng() * 7);
  const add = (x: number, y: number, length: number) => {
    if (y <= 1 || y >= height - 1 || length < 3) return;
    const start = Math.max(2, Math.min(width - 2 - length, x));
    if (start + length < width - 1) runs.push({ x: start, y, length, dir: "h" });
  };
  const addV = (x: number, y: number, length: number) => {
    if (x <= 1 || x >= width - 1 || length < 3) return;
    const start = Math.max(rowY + 1, Math.min(height - 1 - length, y));
    if (start + length < height - 1) runs.push({ x, y: start, length, dir: "v" });
  };
  const addPair = (y: number, length: number) => {
    const inset = rng() < 0.5 ? 2 : 3;
    add(inset, y, length);
    add(width - inset - length, y, length);
  };

  switch (variant) {
    case 0:
      addPair(rowY, theme === "storage" || theme === "vault" ? mediumLen : shortLen);
      add(cx - Math.floor(longLen / 2) + roomShift, midDrift, longLen);
      addV(clampX(cx - 4 + roomShift), rowY + 1, Math.max(3, midDrift - rowY - 1));
      if (rng() < 0.75) addV(clampX(cx + 4 + roomShift), rowY + 1, Math.max(3, midDrift - rowY - 1));
      if (height >= 11) add(rng() < 0.5 ? 2 : width - 2 - mediumLen, lowDrift, mediumLen);
      break;
    case 1: {
      const spineX = clampX(rng() < 0.5 ? cx - 5 + roomShift : cx + 5 + roomShift);
      addPair(rowY, shortLen);
      add(spineX - (rng() < 0.5 ? 0 : mediumLen - 1), midDrift, mediumLen);
      addV(spineX, rowY + 1, Math.max(4, lowDrift - rowY - 1));
      if (height >= 11) add(cx - Math.floor(longLen / 2), lowDrift, longLen);
      break;
    }
    case 2:
      add(cx - Math.floor(longLen / 2) + roomShift, rowY, longLen);
      addPair(midDrift, shortLen);
      addV(clampX(cx - Math.floor(longLen / 2) + roomShift), rowY + 1, Math.max(3, midDrift - rowY - 1));
      addV(clampX(cx + Math.floor(longLen / 2) + roomShift), rowY + 1, Math.max(3, midDrift - rowY - 1));
      if (height >= 11) add(rng() < 0.5 ? 3 : width - 3 - mediumLen, lowDrift, mediumLen);
      break;
    case 3: {
      const leftFirst = rng() < 0.5;
      add(leftFirst ? 2 : width - 2 - mediumLen, rowY, mediumLen);
      add(cx - Math.floor(longLen / 2), midDrift, longLen);
      add(leftFirst ? width - 2 - mediumLen : 2, lowDrift, mediumLen);
      addV(clampX(leftFirst ? cx - 4 : cx + 4), rowY + 1, Math.max(3, midDrift - rowY - 1));
      addV(clampX(leftFirst ? cx + 4 : cx - 4), midDrift + 1, Math.max(3, lowDrift - midDrift - 1));
      break;
    }
    case 4:
      addPair(rowY, mediumLen);
      addPair(lowDrift, mediumLen);
      addV(clampX(3 + Math.floor(rng() * 2)), rowY + 1, Math.max(4, lowDrift - rowY - 1));
      addV(clampX(width - 4 - Math.floor(rng() * 2)), rowY + 1, Math.max(4, lowDrift - rowY - 1));
      if (theme === "prison" || theme === "hall") add(cx - 2 + roomShift, midDrift, 4);
      break;
    case 5:
      add(cx - Math.floor(mediumLen / 2) + roomShift, rowY, mediumLen);
      add(2, midDrift, mediumLen);
      add(width - 2 - mediumLen, midDrift, mediumLen);
      addV(cx + roomShift, rowY + 1, Math.max(3, lowDrift - rowY - 1));
      if (height >= 11) add(cx - Math.floor(longLen / 2) - roomShift, lowDrift, longLen);
      break;
    default:
      addPair(rowY, shortLen);
      add(cx - Math.floor(longLen / 2) + roomShift, midDrift, longLen);
      addV(clampX(rng() < 0.5 ? cx - 5 : cx + 5), rowY + 1, Math.max(4, lowDrift - rowY - 1));
      if (height >= 10) add(rng() < 0.5 ? 2 : width - 2 - mediumLen, lowDrift, mediumLen);
      break;
  }

  return shuffle(runs, rng);
}

/**
 * Emit interior-wall decor cells from the active template. Each wall tile
 * is reserved in occupancy so props never overlap structural elements.
 * Runs of length >= 4 get an "interior-door" pass-through in the middle.
 * The renderer treats these as open breaks, not door sprites, so only real
 * room exits look like commandable doors.
 */
function placeInteriorWalls(layout: Layout) {
  const { theme, width, height, rng, doors, files } = layout;
  const runs = interiorWallTemplate(theme, width, height, rng);

  const doorClear = (x: number, y: number) =>
    !doors.some((d) => Math.abs(d.x - x) <= 1 && Math.abs(d.y - y) <= 1);
  const fileClear = (x: number, y: number) =>
    !files.some((f) => f.x === x && f.y === y);
  const fileClearOfWallFootprint = (x: number, y: number, dir: InteriorWallRun["dir"]) =>
    dir !== "h" || !files.some((f) => f.x === x && f.y === y - 1);

  for (const run of runs) {
    const doorIdx = run.dir === "h" && run.length >= 4 ? Math.floor(run.length / 2) : -1;
    const cells = Array.from({ length: run.length }, (_, i) => ({
      x: run.x + (run.dir === "h" ? i : 0),
      y: run.y + (run.dir === "v" ? i : 0),
    }));
    const doorCell = doorIdx >= 0 ? cells[doorIdx] : null;
    const canPlaceRun = cells.every((cell) =>
      isInterior(width, height, cell.x, cell.y) &&
      !layout.occupied.has(key(cell.x, cell.y)) &&
      doorClear(cell.x, cell.y) &&
      fileClear(cell.x, cell.y) &&
      fileClearOfWallFootprint(cell.x, cell.y, run.dir)
    );
    if (!canPlaceRun) continue;
    if (
      run.dir === "v" &&
      cells.some((cell) =>
        layout.decor.some(
          (d) =>
            d.kind === "interior-door" &&
            d.x === cell.x &&
            Math.abs(d.y - cell.y) <= 1,
        ),
      )
    ) {
      continue;
    }
    if (
      doorCell &&
      layout.decor.some(
        (d) =>
          d.kind === "interior-wall" &&
          d.x === doorCell.x &&
          Math.abs(d.y - doorCell.y) <= 1,
      )
    ) {
      continue;
    }

    for (let i = 0; i < run.length; i++) {
      const x = run.x + (run.dir === "h" ? i : 0);
      const y = run.y + (run.dir === "v" ? i : 0);
      const kind: DecorKind = i === doorIdx ? "interior-door" : "interior-wall";
      layout.decor.push({ kind, x, y });
      layout.occupied.add(key(x, y));
    }
  }
}

function placeScrollWallLadders(layout: Layout) {
  for (const file of layout.files) {
    if (!generatedWallBlocks(layout.decor, file.x, file.y)) continue;
    if (layout.decor.some((d) => d.x === file.x && d.y === file.y && d.kind === "ladder")) continue;
    layout.decor.push({ kind: "ladder", x: file.x, y: file.y });
    layout.occupied.add(key(file.x, file.y));
  }
}

// ---------- geometric cell sources ----------

function cornerCluster(width: number, height: number, corner: Corner): Point[] {
  const left = corner.includes("w");
  const top = corner.includes("n");
  const xs = left ? [1, 2, 3, 4] : [width - 2, width - 3, width - 4, width - 5];
  const ys = top ? [1, 2, 3, 4] : [height - 2, height - 3, height - 4, height - 5];
  const cells: Point[] = [];
  // L-shape: row along wall + column along wall, inner cells filling the corner.
  for (const yi of [0, 1, 2]) {
    for (const xi of [0, 1, 2]) {
      cells.push({ x: xs[xi], y: ys[yi] });
    }
  }
  return cells;
}

function wallBand(width: number, height: number, side: WallSide, depth = 1): Point[] {
  const cells: Point[] = [];
  if (side === "top") for (let x = 2; x < width - 2; x++) cells.push({ x, y: depth });
  else if (side === "bottom") for (let x = 2; x < width - 2; x++) cells.push({ x, y: height - 1 - depth });
  else if (side === "left") for (let y = 2; y < height - 2; y++) cells.push({ x: depth, y });
  else for (let y = 2; y < height - 2; y++) cells.push({ x: width - 1 - depth, y });
  return cells;
}

/** Ring just inside the wall-band — used to fill the "middle" so the room doesn't feel hollow. */
function middleBand(width: number, height: number): Point[] {
  const cells: Point[] = [];
  for (let x = 3; x < width - 3; x++) {
    cells.push({ x, y: Math.floor(height * 0.45) });
    cells.push({ x, y: Math.floor(height * 0.6) });
  }
  return cells;
}

function interiorCells(width: number, height: number): Point[] {
  const cells: Point[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) cells.push({ x, y });
  }
  return cells;
}

// ---------- focal placement per theme ----------

function placeFocal(layout: Layout) {
  const { theme, width, height, rng } = layout;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  const tryRow = (kind: DecorKind, cells: Point[]) => {
    for (const p of cells) if (place(layout, kind, p.x, p.y)) return true;
    return false;
  };

  switch (theme) {
    case "shrine": {
      // Altar statue one row INSIDE the pillar row so its top doesn't
      // visually reach into the soil above the back wall.
      tryRow("statue", [{ x: cx, y: 3 }, { x: cx - 1, y: 3 }, { x: cx + 1, y: 3 }]);
      for (const dx of [-2, -1, 0, 1, 2]) place(layout, "inscribed-floor", cx + dx, 4);
      tryRow("chest-empty", [{ x: cx - 3, y: 3 }]);
      tryRow("chest-empty", [{ x: cx + 3, y: 3 }]);
      break;
    }
    case "crypt": {
      // Paired flanking statues + rune cross at center.
      place(layout, "statue", cx - 3, cy);
      place(layout, "statue", cx + 3, cy);
      place(layout, "inscribed-floor", cx, cy);
      place(layout, "inscribed-floor", cx, cy - 1);
      place(layout, "inscribed-floor", cx, cy + 1);
      place(layout, "inscribed-floor", cx - 1, cy);
      place(layout, "inscribed-floor", cx + 1, cy);
      break;
    }
    case "vault": {
      // Centerpiece chest flanked by empty chests; rune mat in front.
      tryRow("chest-full", [{ x: cx, y: 2 }]);
      place(layout, "chest-empty", cx - 2, 2);
      place(layout, "chest-empty", cx + 2, 2);
      place(layout, "inscribed-floor", cx, 3);
      place(layout, "inscribed-floor", cx - 1, 3);
      place(layout, "inscribed-floor", cx + 1, 3);
      break;
    }
    case "flooded": {
      // Coherent pool in a 3x4 block to one side of the room.
      const leftPool = rng() < 0.5;
      const startX = leftPool ? 2 : width - 5;
      const startY = Math.max(2, cy - 1);
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          // Occasional gap on the edge to suggest a natural coastline.
          const onEdge = dx === 0 || dx === 3 || dy === 0 || dy === 2;
          if (onEdge && rng() < 0.18) continue;
          place(layout, "water", startX + dx, startY + dy);
        }
      }
      // Damp cracks bordering the pool.
      for (const p of [
        { x: startX - 1, y: startY + 1 },
        { x: startX + 4, y: startY + 1 },
        { x: startX + 1, y: startY - 1 },
        { x: startX + 2, y: startY + 3 },
      ]) place(layout, "crack", p.x, p.y);
      break;
    }
    case "trap": {
      // Statue pushed off the back wall so its top doesn't touch soil.
      tryRow("statue", [{ x: cx, y: 3 }]);
      for (let i = 0; i < 6; i++) {
        const x = 3 + Math.floor(rng() * Math.max(1, width - 6));
        const y = 3 + Math.floor(rng() * Math.max(1, height - 5));
        place(layout, "crack", x, y);
      }
      break;
    }
    case "hall": {
      // Processional runner down the center.
      for (let dx = -3; dx <= 3; dx++) place(layout, "inscribed-floor", cx + dx, cy);
      break;
    }
    case "prison": {
      // Broken-in center (a discarded chest, rusted chains are implied by cracks).
      tryRow("chest-empty", [{ x: cx, y: cy }, { x: cx - 1, y: cy }]);
      place(layout, "crack", cx, cy - 1);
      place(layout, "crack", cx, cy + 1);
      break;
    }
    case "storage":
    default:
      // Storage gets its punch from corner clusters, not a focal piece.
      break;
  }
}

// ---------- corner / wall-band clusters ----------

function placeClusters(layout: Layout) {
  const { theme, width, height, rng } = layout;
  const cluster = (corner: Corner, kinds: DecorKind[], limit: number) =>
    placeFrom(layout, shuffle(cornerCluster(width, height, corner), rng), kinds, limit);
  const band = (side: WallSide, kinds: DecorKind[], limit: number) =>
    placeFrom(layout, shuffle(wallBand(width, height, side), rng), kinds, limit);

  switch (theme) {
    case "storage": {
      const corners = shuffle<Corner>(["nw", "ne", "sw", "se"], rng);
      cluster(corners[0], ["crate", "barrel", "chest-empty"], 5);
      cluster(corners[1], ["barrel", "crate"], 4);
      cluster(corners[2], ["crate", "barrel"], 3);
      band("top", ["crate", "barrel"], 2);
      band("bottom", ["crate", "barrel"], 2);
      break;
    }
    case "vault": {
      cluster("nw", ["crate", "chest-empty"], 3);
      cluster("ne", ["chest-empty", "crate"], 3);
      cluster("sw", ["barrel", "crate"], 2);
      cluster("se", ["crate", "barrel"], 2);
      break;
    }
    case "hall": {
      band("left", ["barrel", "crate"], 3);
      band("right", ["barrel", "crate"], 3);
      cluster(rng() < 0.5 ? "sw" : "se", ["crate", "barrel"], 2);
      break;
    }
    case "crypt": {
      cluster("nw", ["chest-empty", "crate"], 2);
      cluster("ne", ["chest-empty", "crate"], 2);
      band("bottom", ["barrel", "crate"], 3);
      break;
    }
    case "shrine": {
      cluster("sw", ["barrel", "crate"], 2);
      cluster("se", ["barrel", "crate"], 2);
      band("bottom", ["crate", "barrel"], 2);
      break;
    }
    case "flooded": {
      cluster("nw", ["barrel", "crate"], 2);
      cluster("se", ["barrel", "crate"], 2);
      band("bottom", ["barrel"], 2);
      break;
    }
    case "prison": {
      band("left", ["crate"], 2);
      band("right", ["crate"], 2);
      cluster("sw", ["crate", "barrel"], 2);
      cluster("ne", ["crate", "barrel"], 2);
      break;
    }
    case "trap": {
      cluster("nw", ["crate", "barrel"], 2);
      cluster("se", ["crate", "barrel"], 2);
      break;
    }
  }
}

// ---------- environmental drift ----------

function placeEnvironmental(layout: Layout) {
  const { theme, width, height, rng } = layout;

  const crackTarget =
    theme === "trap" ? 10 :
    theme === "crypt" ? 8 :
    theme === "prison" || theme === "flooded" ? 7 :
    theme === "vault" || theme === "shrine" ? 5 :
    6;
  let cracks = 0;
  for (let i = 0; i < crackTarget * 5 && cracks < crackTarget; i++) {
    const x = 2 + Math.floor(rng() * Math.max(1, width - 4));
    const y = 2 + Math.floor(rng() * Math.max(1, height - 4));
    if (place(layout, "crack", x, y)) cracks++;
  }

  const inscribeTarget =
    theme === "shrine" || theme === "crypt" ? 3 :
    theme === "vault" || theme === "hall" ? 2 :
    1;
  let ins = 0;
  for (let i = 0; i < inscribeTarget * 5 && ins < inscribeTarget; i++) {
    const x = 2 + Math.floor(rng() * Math.max(1, width - 4));
    const y = 2 + Math.floor(rng() * Math.max(1, height - 4));
    if (place(layout, "inscribed-floor", x, y)) ins++;
  }

}

function placeSkulls(layout: Layout) {
  const { theme, width, height, rng } = layout;
  const target =
    theme === "crypt" ? 9 :
    theme === "trap" || theme === "prison" ? 7 :
    theme === "vault" || theme === "shrine" || theme === "flooded" ? 5 :
    rng() < 0.7 ? 4 :
    3;
  let placed = 0;
  for (let i = 0; i < target * 14 && placed < target; i++) {
    const x = 2 + Math.floor(rng() * Math.max(1, width - 4));
    const y = 2 + Math.floor(rng() * Math.max(1, height - 4));
    if (place(layout, "skull", x, y)) placed++;
  }
  for (const cell of shuffle(interiorCells(width, height), rng)) {
    if (placed >= target) break;
    if (place(layout, "skull", cell.x, cell.y)) placed++;
  }
}

// ---------- center accent: fill the empty middle of the room ----------

/**
 * Some themes leave a gaping hole in the middle of the room. Drop a small,
 * intentional cluster there so the room reads as used. Floor features
 * (crack / inscribed-floor) are fine on the walk path; blocking props are
 * offset from the spawn→door walk lane.
 */
function placeCenterAccent(layout: Layout) {
  const { theme, width, height, rng } = layout;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  switch (theme) {
    case "hall": {
      // Ceremonial runner + flanking accents along the central axis.
      for (const dx of [-4, -3, -2, 2, 3, 4]) {
        place(layout, "inscribed-floor", cx + dx, cy);
      }
      place(layout, "crate", cx - 3, cy - 1);
      place(layout, "barrel", cx + 3, cy + 1);
      break;
    }
    case "storage": {
      // A stacked shipment in the middle.
      place(layout, "crate", cx - 1, cy);
      place(layout, "crate", cx, cy);
      place(layout, "barrel", cx + 1, cy);
      place(layout, "crate", cx, cy + 1);
      break;
    }
    case "prison": {
      // A lonely cell furnishing — a single broken crate + cracks.
      place(layout, "crate", cx, cy);
      place(layout, "crack", cx - 1, cy + 1);
      place(layout, "crack", cx + 1, cy - 1);
      break;
    }
    case "trap": {
      // Cluster of traps forming a warning pattern.
      place(layout, "crack", cx, cy);
      place(layout, "crack", cx - 1, cy);
      place(layout, "crack", cx + 1, cy);
      place(layout, "crack", cx, cy - 1);
      place(layout, "crack", cx, cy + 1);
      break;
    }
    case "vault": {
      // Rune floor marking the vault approach.
      for (const dx of [-1, 0, 1]) place(layout, "inscribed-floor", cx + dx, cy);
      break;
    }
    case "shrine":
    case "crypt":
    case "flooded":
      // These themes already have centered focal pieces — no extra accent.
      break;
    default: {
      place(layout, "crate", cx, cy);
      break;
    }
  }
}

// ---------- density fill ----------

function densityFill(layout: Layout) {
  const { theme, width, height, rng } = layout;
  const area = width * height;
  const target = Math.min(32, Math.max(22, Math.floor(area * 0.22)));
  if (layout.decor.length >= target) return;

  const kinds: DecorKind[] =
    theme === "storage" ? ["crate", "barrel"] :
    theme === "vault"   ? ["chest-empty", "crate"] :
    theme === "crypt"   ? ["crate", "crack"] :
    theme === "shrine"  ? ["crate", "inscribed-floor"] :
    theme === "flooded" ? ["barrel", "crack"] :
    theme === "prison"  ? ["crate", "crack"] :
    theme === "trap"    ? ["crack", "crate"] :
                          ["barrel", "crate"];

  const fill = shuffle(
    [
      ...wallBand(width, height, "top"),
      ...wallBand(width, height, "bottom"),
      ...wallBand(width, height, "left"),
      ...wallBand(width, height, "right"),
      ...middleBand(width, height),
    ],
    rng,
  );
  placeFrom(layout, fill, kinds, target - layout.decor.length);
}

// ---------- tiles: torches on walls ----------

/**
 * Torches go ONLY on the top (primary) wall, framing the back wall. Keeps
 * the composition one-directional — sides stay plain so nothing competes
 * with the back-wall focal area.
 */
function placeTorches(tiles: Tile[], width: number, height: number, doors: DoorTile[]): Tile[] {
  const blocked = new Set(doors.map((d) => key(d.x, d.y)));
  const anchors: Point[] = [
    { x: Math.floor(width * 0.22), y: 0 },
    { x: Math.floor(width * 0.78), y: 0 },
  ].filter((p) => !blocked.has(key(p.x, p.y)) && p.x > 0 && p.x < width - 1);
  return [...tiles, ...anchors.map((p) => ({ ...p, kind: "torch" as const }))];
}

// ---------- files ----------

function fileAnchors(theme: RoomTheme, width: number, height: number): Point[] {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  switch (theme) {
    case "vault":   return [{ x: cx, y: 3 }, { x: cx - 1, y: 3 }, { x: cx + 1, y: 3 }];
    case "shrine":  return [{ x: cx, y: 4 }, { x: cx - 2, y: 4 }, { x: cx + 2, y: 4 }];
    case "crypt":   return [{ x: cx, y: cy + 2 }, { x: cx - 2, y: cy }, { x: cx + 2, y: cy }];
    case "storage": return [{ x: width - 3, y: cy }, { x: 3, y: cy }, { x: cx, y: height - 3 }];
    case "flooded": return [{ x: cx, y: 2 }, { x: width - 3, y: 2 }, { x: 3, y: 2 }];
    case "hall":    return [{ x: width - 3, y: cy }, { x: 3, y: cy }, { x: cx, y: 3 }];
    case "prison":  return [{ x: width - 3, y: cy }, { x: 3, y: cy }];
    case "trap":    return [{ x: cx, y: height - 3 }, { x: cx - 1, y: height - 3 }];
    default:        return [{ x: cx, y: cy }];
  }
}

function buildFiles(
  spec: RoomSpec,
  theme: RoomTheme,
  width: number,
  height: number,
  doors: DoorTile[],
  spawn: Point,
  rng: () => number,
): FileItem[] {
  if (spec.files.length === 0) return [];
  const anchors = fileAnchors(theme, width, height).filter((c) =>
    isInterior(width, height, c.x, c.y),
  );
  const fallback = shuffle(interiorCells(width, height), rng);
  const blocked = new Set<string>([
    key(spawn.x, spawn.y),
    ...doors.map((d) => key(d.x, d.y)),
  ]);
  const pool = [...anchors, ...fallback].filter(
    (c) => !blocked.has(key(c.x, c.y)) && !doorAdjacent(doors, c.x, c.y),
  );
  const used = new Set<string>();
  const files: FileItem[] = [];
  for (const f of spec.files) {
    const spot = pool.find((c) => !used.has(key(c.x, c.y)));
    if (!spot) break;
    used.add(key(spot.x, spot.y));
    files.push({ name: f.name, glyph: f.glyph, contents: f.contents, type: f.type, x: spot.x, y: spot.y });
  }
  return files;
}

// ---------- public API ----------

export function addDoorToRoom(room: Room, target: string): Room | null {
  if (room.doors.some((d) => d.target === target)) return null;
  if (room.doors.length >= MAX_ROOM_DOORS) return null;
  const used = new Set(room.doors.map((d) => key(d.x, d.y)));
  for (const side of ["right", "top", "bottom", "left"] as WallSide[]) {
    for (const slot of doorSlotsForSide(side, room.width, room.height)) {
      if (used.has(key(slot.x, slot.y))) continue;
      return { ...room, doors: [...room.doors, { ...slot, kind: "door", target }] };
    }
  }
  return null;
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? "room";
}

function uniqueDoorTarget(room: Room, base: string): string {
  const used = new Set(room.doors.map((door) => door.target));
  if (!used.has(base)) return base;
  for (let i = 2; i < 20; i++) {
    const next = `${base}-${i}`;
    if (!used.has(next)) return next;
  }
  return `${base}-${room.doors.length + 1}`;
}

function addShortcutDoor(room: Room, target: string, toPath: string): Room | null {
  if (room.path === toPath) return null;
  if (room.doors.length >= MAX_ROOM_DOORS) return null;
  if (room.doors.some((door) => resolveDoorPath(room.path, door) === toPath)) return null;

  const used = new Set(room.doors.map((d) => key(d.x, d.y)));
  for (const side of ["top", "bottom", "right", "left"] as WallSide[]) {
    for (const slot of doorSlotsForSide(side, room.width, room.height)) {
      if (used.has(key(slot.x, slot.y))) continue;
      return {
        ...room,
        doors: [...room.doors, { ...slot, kind: "door", target: uniqueDoorTarget(room, target), toPath }],
      };
    }
  }
  return null;
}

function ensureMinimumRoomDoors(rooms: Record<string, Room>, rootPath: string): Record<string, Room> {
  const paths = Object.keys(rooms);
  if (paths.length < 2) return rooms;

  const result: Record<string, Room> = { ...rooms };
  for (const path of paths) {
    let room = result[path];
    if (!room) continue;
    while (room.doors.length < MIN_ROOM_DOORS && room.doors.length < MAX_ROOM_DOORS) {
      const existing = new Set(room.doors.map((door) => resolveDoorPath(path, door)));
      const candidate =
        paths.find((other) => other !== path && !existing.has(other) && other !== rootPath) ??
        paths.find((other) => other !== path && !existing.has(other));
      if (!candidate) break;

      const next = addShortcutDoor(room, basename(candidate), candidate);
      if (!next) break;
      room = next;
      result[path] = room;
    }
  }

  return result;
}

export function generateRoom(spec: RoomSpec, nonce = 0): Room {
  const seed = hashString(spec.path) ^ (nonce >>> 0);
  const rng = mulberry32(seed);
  const theme = pickTheme(spec, rng);
  const sized = roomSizeForTheme(theme, rng);
  const width = spec.width ?? sized.width;
  const height = spec.height ?? sized.height;

  let tiles = carveBase(width, height);

  const doors: DoorTile[] = [];
  const usedDoor = new Set<string>();
  const dropDoor = (target: string, side: WallSide): boolean => {
    for (const slot of doorSlotsForSide(side, width, height)) {
      const k = key(slot.x, slot.y);
      if (usedDoor.has(k)) continue;
      usedDoor.add(k);
      doors.push({ ...slot, kind: "door", target });
      return true;
    }
    return false;
  };

  // Parent door always on BOTTOM (the way you came in). Exits go on TOP
  // (doors leading forward into the dungeon). Never on left/right.
  if (spec.hasParent) dropDoor("..", "bottom");

  const maxExitDoors = Math.max(0, MAX_ROOM_DOORS - (spec.hasParent ? 1 : 0));
  const exitTargets = spec.exits.slice(0, maxExitDoors);
  const desiredSides = pickExitSides(exitTargets.length, spec.hasParent, rng);
  const fallbackSides: WallSide[] = ["top", "bottom"];
  exitTargets.forEach((target, i) => {
    const wanted = desiredSides[i] ?? fallbackSides[i % fallbackSides.length];
    if (dropDoor(target, wanted)) return;
    for (const alt of fallbackSides) if (alt !== wanted && dropDoor(target, alt)) return;
  });

  const parentDoor = doors.find((d) => d.target === "..");
  const firstExit = doors.find((d) => d.target !== "..");
  const spawn = parentDoor
    ? insideDoorPos(parentDoor, width, height)
    : firstExit
      ? insideDoorPos(firstExit, width, height)
      : { x: 1, y: Math.floor(height / 2) };
  const returnSpawn = firstExit ? insideDoorPos(firstExit, width, height) : undefined;

  tiles = placeTorches(tiles, width, height, doors);
  const files = buildFiles(spec, theme, width, height, doors, spawn, rng);

  const layout: Layout = {
    width,
    height,
    theme,
    tiles,
    doors,
    files,
    decor: [],
    spawn,
    returnSpawn,
    rng,
    occupied: new Set<string>([
      key(spawn.x, spawn.y),
      ...doors.map((d) => key(d.x, d.y)),
      ...files.map((f) => key(f.x, f.y)),
    ]),
    pathCells: new Set<string>(),
  };

  // Architecture FIRST: pillars + interior walls become reserved tiles so
  // no prop can spawn on top of structural elements.
  placePillars(layout);

  // Reserve the REST of the pillar row (y=1) after pillars land. Tall
  // props (statues, chests) overflow upward past their tile, which would
  // otherwise land on the soil mound above the top wall.
  for (let x = 1; x < width - 1; x++) layout.occupied.add(key(x, 1));

  placeInteriorWalls(layout);
  placeScrollWallLadders(layout);

  reservePaths(layout);
  placeFocal(layout);
  placeClusters(layout);
  placeCenterAccent(layout);
  placeEnvironmental(layout);
  placeSkulls(layout);
  densityFill(layout);

  return {
    path: spec.path,
    name: spec.name,
    description: spec.description,
    width,
    height,
    tiles,
    doors,
    files,
    decor: layout.decor,
    spawn,
    returnSpawn,
  };
}

export function generateDungeon(
  specs: RoomSpec[],
  rootPath: string,
  nonce = 0,
): Record<string, Room> {
  let rooms: Record<string, Room> = {};
  for (const spec of specs) rooms[spec.path] = generateRoom(spec, nonce);
  rooms = ensureMinimumRoomDoors(rooms, rootPath);

  const seen = new Set<string>([rootPath]);
  const queue = [rootPath];
  while (queue.length) {
    const p = queue.shift()!;
    const r = rooms[p];
    if (!r) continue;
    for (const d of r.doors) {
      const next = resolveDoorPath(p, d);
      if (rooms[next] && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  const finalRooms = spawnMauTheCat(rooms, rootPath, nonce);

  for (const p of Object.keys(finalRooms)) {
    if (!seen.has(p)) {
      // eslint-disable-next-line no-console
      console.warn(`[dungeon] unreachable room: ${p}`);
    }
  }
  return finalRooms;
}

/**
 * BFS across the entire dungeon graph to find the walkable tile furthest from the start.
 */
function spawnMauTheCat(rooms: Record<string, Room>, rootPath: string, nonce = 0): Record<string, Room> {
  const startRoom = rooms[rootPath];
  if (!startRoom) return rooms;

  type State = { path: string; x: number; y: number; dist: number };
  const queue: State[] = [{ path: rootPath, x: startRoom.spawn.x, y: startRoom.spawn.y, dist: 0 }];
  const visited = new Set<string>([`${rootPath}:${startRoom.spawn.x},${startRoom.spawn.y}`]);
  
  let furthest: State = queue[0];

  while (queue.length) {
    const curr = queue.shift()!;
    if (curr.dist > furthest.dist) furthest = curr;

    const room = rooms[curr.path];
    if (!room) continue;

    // 1. Local movement
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      const vKey = `${curr.path}:${nx},${ny}`;
      if (visited.has(vKey)) continue;

      if (isRoomWalkableForNpc(room, nx, ny)) {
        visited.add(vKey);
        queue.push({ path: curr.path, x: nx, y: ny, dist: curr.dist + 1 });
      }
    }

    // 2. Through doors
    const door = room.doors.find(d => d.x === curr.x && d.y === curr.y);
    if (door) {
      const nextPath = resolveDoorPath(curr.path, door);
      const nextRoom = rooms[nextPath];
      if (nextRoom) {
        // Find corresponding entry door or use spawn
        const spawn = door.target === ".." ? (nextRoom.returnSpawn || nextRoom.spawn) : nextRoom.spawn;
        const vKey = `${nextPath}:${spawn.x},${spawn.y}`;
        if (!visited.has(vKey)) {
          visited.add(vKey);
          queue.push({ path: nextPath, x: spawn.x, y: spawn.y, dist: curr.dist + 1 });
        }
      }
    }
  }

  // Spawn Mau at the furthest tile (ensuring it's not the root room)
  const result = { ...rooms };
  
  // If furthest is in root, try to find the next furthest not in root
  let targetPath = furthest.path;
  if (targetPath === rootPath) {
    // This only happens in tiny dungeons. Try to find any other room.
    const otherPaths = Object.keys(rooms).filter(p => p !== rootPath);
    if (otherPaths.length > 0) {
      targetPath = otherPaths[0]; // Just pick another one
    }
  }

  const targetRoom = result[targetPath];
  if (targetRoom) {
    const walkableTiles = targetRoom.tiles.filter((t) => isRoomWalkableForNpc(targetRoom, t.x, t.y));
    
    // Seed mixes the level nonce in so the same room layout doesn't put
    // Mau on the identical tile across different generated levels.
    const rng = mulberry32(hashString("mau-pos-" + targetPath) ^ (nonce >>> 0));
    const randomTile = walkableTiles.length > 0 
      ? walkableTiles[Math.floor(rng() * walkableTiles.length)]
      : { x: targetRoom.spawn.x, y: targetRoom.spawn.y };

    result[targetPath] = {
      ...targetRoom,
      npcs: [
        ...(targetRoom.npcs || []),
        {
          id: "mau",
          name: "Mau",
          x: randomTile.x,
          y: randomTile.y,
          sprite: "/src/assets/characters/cat-idle.gif",
          dialogue: [
            "Mrow? You look lost, little fox.",
            "This dungeon is but a collection of directories.",
            "Remember: 'cd ..' is how you climb back up the tree.",
            "Be careful with 'rm'. Destruction is... permanent."
          ]
        }
      ]
    };
  }

  return result;
}
