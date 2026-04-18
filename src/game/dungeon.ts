import type { DoorTile, FileItem, Room, Tile } from "./types";

const W = 11;
const H = 7;

/** Build a rectangular room: outer walls + floor. */
function baseTiles(width = W, height = H): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push({ x, y, kind: isEdge ? "wall" : "floor" });
    }
  }
  // Torches in corners (decorative)
  tiles.push({ x: 1, y: 1, kind: "torch" });
  tiles.push({ x: width - 2, y: 1, kind: "torch" });
  return tiles;
}

const entryHall: Room = {
  path: "/home/user",
  name: "Entry Hall",
  description: "A cold stone chamber. Torches sputter against damp walls.",
  width: W,
  height: H,
  tiles: baseTiles(),
  doors: [
    // East door leads to hallway/
    { x: W - 1, y: 3, kind: "door", target: "hallway" } as DoorTile,
  ],
  files: [
    {
      name: "readme.txt",
      x: 3,
      y: 3,
      glyph: "📜",
      contents:
        "Welcome, adventurer.\nThis dungeon obeys the laws of the shell.\nFolders are doors. Files are loot.\nFind victory.jpg and move it into ~/inventory:\n  mv victory.jpg ~/inventory",
    },
    { name: "torch", x: 5, y: 4, glyph: "🔥", contents: "A wooden torch. Warm to the touch." },
  ],
  spawn: { x: 2, y: 3 },
};

const hallway: Room = {
  path: "/home/user/hallway",
  name: "Stone Hallway",
  description: "A narrow corridor of mossy bricks. Two doors, two fates.",
  width: W,
  height: H,
  tiles: baseTiles(),
  doors: [
    { x: 0, y: 3, kind: "door", target: ".." } as DoorTile,
    { x: W - 1, y: 3, kind: "door", target: "treasury" } as DoorTile,
  ],
  files: [
    {
      name: "note.txt",
      x: 5,
      y: 3,
      glyph: "📜",
      contents: "Scrawled in chalk: 'The treasury lies east. Beware the dust.'",
    },
  ],
  spawn: { x: 1, y: 3 },
  returnSpawn: { x: W - 2, y: 3 },
};

const treasury: Room = {
  path: "/home/user/hallway/treasury",
  name: "Treasury",
  description: "Gold dust hangs in the air. A single relic gleams.",
  width: W,
  height: H,
  tiles: baseTiles(),
  doors: [
    { x: 0, y: 3, kind: "door", target: ".." } as DoorTile,
  ],
  files: [
    {
      name: "victory.jpg",
      x: 6,
      y: 3,
      glyph: "🏆",
      contents: "A radiant image of freedom. The way out.",
    },
    { name: "dust", x: 4, y: 5, glyph: "✨", contents: "Just dust. Ancient and shimmering." },
  ],
  spawn: { x: 1, y: 3 },
};

export const DEFAULT_ROOMS: Record<string, Room> = {
  [entryHall.path]: entryHall,
  [hallway.path]: hallway,
  [treasury.path]: treasury,
};

export const START_PATH = "/home/user";
export const INVENTORY_PATH = "/home/user/inventory";
export const TARGET_FILE = "victory.jpg";

/** Resolve a cd-style argument against cwd. Returns absolute path. */
export function resolvePath(cwd: string, arg: string): string {
  if (!arg || arg === "~" || arg === "~/") return START_PATH;
  if (arg.startsWith("~/")) return `${START_PATH}/${arg.slice(2)}`.replace(/\/+$/, "");
  if (arg === "/") return "/";
  let base: string[];
  if (arg.startsWith("/")) {
    base = arg.split("/").filter(Boolean);
  } else {
    base = cwd.split("/").filter(Boolean);
    for (const part of arg.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") base.pop();
      else base.push(part);
    }
  }
  return "/" + base.join("/");
}

export function getRoom(rooms: Record<string, Room>, path: string): Room | undefined {
  return rooms[path];
}

export function isWalkable(room: Room, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false;
  const tile = room.tiles.find((t) => t.x === x && t.y === y);
  // Doors are walkable too (they sit on the wall ring)
  if (room.doors.some((d) => d.x === x && d.y === y)) return true;
  if (!tile) return false;
  return tile.kind === "floor" || tile.kind === "torch";
}

/** Simple BFS pathfinder between two tiles. Returns path including target, or null. */
export function pathfind(
  room: Room,
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const visited = new Set<string>([key(from.x, from.y)]);
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
    { x: from.x, y: from.y, path: [] },
  ];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      const walk = isWalkable(room, nx, ny);
      const isTarget = nx === to.x && ny === to.y;
      if (!walk && !isTarget) continue;
      const path = [...cur.path, { x: nx, y: ny }];
      if (isTarget) return path;
      visited.add(k);
      queue.push({ x: nx, y: ny, path });
    }
  }
  return null;
}

export function findFile(room: Room, name: string): FileItem | undefined {
  return room.files.find((f) => f.name === name);
}

export function findDoor(room: Room, target: string): DoorTile | undefined {
  return room.doors.find((d) => d.target === target);
}
