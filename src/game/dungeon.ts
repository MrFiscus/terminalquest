import type { DoorTile, FileItem, Room, Tile } from "./types";
import { generateDungeon, type RoomSpec } from "./generator";

export const START_PATH = "/home/user";
export const INVENTORY_PATH = "/home/user/inventory";
export const TARGET_FILE = "relic.txt";

const SPECS: RoomSpec[] = [
  {
    path: "/home/user",
    name: "Entry Hall",
    description: "A cold stone chamber. Torches sputter against damp walls.",
    hasParent: false,
    exits: ["hallway"],
    files: [
      {
        name: "readme.txt",
        glyph: "📜",
        contents:
          "Welcome, adventurer.\nThis dungeon obeys the laws of the shell.\nFolders are doors. Files are loot.\nFind relic.txt and move it into ~/inventory:\n  mv relic.txt ~/inventory",
      },
      { name: "torch", glyph: "🔥", contents: "A wooden torch. Warm to the touch." },
    ],
  },
  {
    path: "/home/user/hallway",
    name: "Stone Hallway",
    description: "A narrow corridor of mossy bricks. Something glints on the floor.",
    hasParent: true,
    exits: ["antechamber"],
    files: [
      {
        name: "skeleton.key",
        glyph: "🗝",
        type: "key",
        contents: "A worn iron key. It must open something nearby.",
      },
      {
        name: "note.txt",
        glyph: "📜",
        contents: "Scrawled in chalk: 'Only the key-bearer may pass the vault door.'",
      },
    ],
  },
  {
    path: "/home/user/hallway/antechamber",
    name: "Antechamber",
    description: "A vaulted room. A heavy iron door bars the way forward.",
    hasParent: true,
    exits: ["vault"],
    files: [
      {
        name: "warning.txt",
        glyph: "📜",
        contents: "This vault is sealed. Only those bearing the key may enter.",
      },
    ],
  },
  {
    path: "/home/user/hallway/antechamber/vault",
    name: "The Vault",
    description: "Rows of ancient relics. The air tastes of centuries.",
    hasParent: true,
    exits: [],
    files: [
      { name: "relic.txt", glyph: "🏆", contents: "A radiant text of legend. The way out." },
      { name: "dust", glyph: "✨", contents: "Just dust. Ancient and shimmering." },
    ],
  },
];

export function markLockedDoors(
  rooms: Record<string, Room>,
  locks: { roomPath: string; target: string; requiredKey: string }[],
): Record<string, Room> {
  const result = { ...rooms };
  for (const lock of locks) {
    const room = result[lock.roomPath];
    if (!room) {
      console.warn(`[markLockedDoors] room not found: "${lock.roomPath}". Available paths:`, Object.keys(rooms));
      continue;
    }
    const before = room.doors.map((d) => `${d.target}(locked=${d.locked})`);
    result[lock.roomPath] = {
      ...room,
      doors: room.doors.map((d) =>
        d.target === lock.target ? { ...d, locked: true, requiredKey: lock.requiredKey } : d,
      ),
    };
    const after = result[lock.roomPath].doors.map((d) => `${d.target}(locked=${d.locked},key=${d.requiredKey})`);
    console.log(`[markLockedDoors] ${lock.roomPath} doors BEFORE:`, before, "AFTER:", after);
  }
  return result;
}

const LOCK_SPECS = [
  { roomPath: "/home/user/hallway/antechamber", target: "vault", requiredKey: "skeleton.key" },
] as const;

/** Called fresh inside initialState() so locks are applied at React init time, not at module load. */
export function createDefaultRooms(): Record<string, Room> {
  const rooms = markLockedDoors(generateDungeon(SPECS, START_PATH), [...LOCK_SPECS]);
  console.log("[dungeon] all room paths:", Object.keys(rooms));

  // Check 1: Stone Hallway files
  const hallway = rooms["/home/user/hallway"];
  console.log("[dungeon] Stone Hallway files[]:", JSON.stringify(hallway?.files));

  // Check 2: Antechamber vault door — JSON.stringify confirms the actual object value, not just a string coercion
  const antechamber = rooms["/home/user/hallway/antechamber"];
  console.log("[dungeon] Antechamber doors[]:", JSON.stringify(antechamber?.doors));

  // Check 3: Vault files
  const vault = rooms["/home/user/hallway/antechamber/vault"];
  console.log("[dungeon] Vault files[]:", JSON.stringify(vault?.files));
  console.log("[dungeon] Vault doors[]:", JSON.stringify(vault?.doors));

  const vaultDoorSources = Object.values(rooms)
    .filter((room) => room.doors.some((door) => door.target === "vault"))
    .map((room) => room.path);
  console.log("[dungeon] Vault door sources[]:", JSON.stringify(vaultDoorSources));

  return rooms;
}

// Kept for any legacy callers; initialState() now calls createDefaultRooms() directly.
export const DEFAULT_ROOMS: Record<string, Room> = createDefaultRooms();

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

function hasInteriorDoor(room: Room, x: number, y: number): boolean {
  return room.decor?.some((d) => d.x === x && d.y === y && d.kind === "interior-door") ?? false;
}

function hasInteriorRun(room: Room, x: number, y: number): boolean {
  return (
    room.decor?.some(
      (d) => d.x === x && d.y === y && (d.kind === "interior-wall" || d.kind === "interior-door"),
    ) ?? false
  );
}

function hasWallLadder(room: Room, x: number, y: number): boolean {
  return room.decor?.some((d) => d.x === x && d.y === y && d.kind === "ladder") ?? false;
}

function interiorRunAxis(room: Room, x: number, y: number): "h" | "v" {
  const hasLeft = hasInteriorRun(room, x - 1, y);
  const hasRight = hasInteriorRun(room, x + 1, y);
  const hasUp = hasInteriorRun(room, x, y - 1);
  const hasDown = hasInteriorRun(room, x, y + 1);
  return hasLeft || hasRight || (!hasUp && !hasDown) ? "h" : "v";
}

function generatedWallBlocks(room: Room, x: number, y: number): boolean {
  const decor = room.decor ?? [];
  if (hasWallLadder(room, x, y)) return false;
  if (decor.some((d) => d.x === x && d.y === y && d.kind === "pillar")) return true;
  if (decor.some((d) => d.x === x && d.y === y && d.kind === "interior-wall")) return true;

  // Horizontal interior walls draw their soil cap into the tile above the wall.
  // Keep collision in sync with that visual footprint, while leaving door cuts open.
  const wallBelow = decor.find((d) => d.x === x && d.y === y + 1 && d.kind === "interior-wall");
  return Boolean(wallBelow && interiorRunAxis(room, wallBelow.x, wallBelow.y) === "h");
}

export function isWalkable(room: Room, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false;

  // Doors are walkable even when they sit on the wall ring or cut through an interior wall run.
  if (room.doors.some((d) => d.x === x && d.y === y)) return true;
  if (hasInteriorDoor(room, x, y)) return true;

  // NPCs block movement
  if ((room.npcs || []).some(n => n.x === x && n.y === y)) return false;
  if (room.files.some((file) => file.type === "blocker" && file.x === x && file.y === y)) return false;

  if (generatedWallBlocks(room, x, y)) return false;

  const tile = room.tiles.find((t) => t.x === x && t.y === y);
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
  const targetIsDoor = room.doors.some((d) => d.x === to.x && d.y === to.y);
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
      if (!walk && !(isTarget && targetIsDoor)) continue;
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

/**
 * Find an empty wall slot adjacent to the given tile to spawn a new door.
 * Returns null if no spot exists.
 */
export function findAdjacentWallSlot(
  room: Room,
  near: { x: number; y: number },
): { x: number; y: number } | null {
  // BFS outward from `near`, return first wall edge tile that isn't already a door.
  const seen = new Set<string>();
  const q: { x: number; y: number }[] = [near];
  seen.add(`${near.x},${near.y}`);
  while (q.length) {
    const cur = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= room.width || ny >= room.height) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const isEdge = nx === 0 || ny === 0 || nx === room.width - 1 || ny === room.height - 1;
      const isCorner =
        (nx === 0 || nx === room.width - 1) && (ny === 0 || ny === room.height - 1);
      const occupied = room.doors.some((d) => d.x === nx && d.y === ny);
      if (isEdge && !isCorner && !occupied) return { x: nx, y: ny };
      // Continue searching through floor tiles to find a wall slot
      if (!isEdge) q.push({ x: nx, y: ny });
    }
  }
  return null;
}

/**
 * Build a minimal stub child room for an mkdir-created folder.
 * 9x7 walled chamber with a back door (..) and no other content.
 */
export function buildStubRoom(parentPath: string, name: string): Room {
  const width = 9;
  const height = 7;
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      tiles.push({ x, y, kind: isEdge ? "wall" : "floor" });
    }
  }
  tiles.push({ x: 1, y: 1, kind: "torch" });
  tiles.push({ x: width - 2, y: 1, kind: "torch" });
  const backDoor: DoorTile = { x: 0, y: Math.floor(height / 2), kind: "door", target: ".." };
  return {
    path: `${parentPath}/${name}`,
    name: `~/${name}`,
    description: "A freshly carved alcove. The walls smell of chalk dust.",
    width,
    height,
    tiles,
    doors: [backDoor],
    files: [],
    decor: [
      { kind: "crate", x: width - 2, y: height - 2 },
      { kind: "crack", x: 2, y: height - 2 },
    ],
    spawn: { x: 1, y: Math.floor(height / 2) },
    returnSpawn: { x: 1, y: Math.floor(height / 2) },
  };
}
