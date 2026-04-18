export type TileKind = "wall" | "floor" | "door" | "torch";

export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
}

export interface DoorTile extends Tile {
  kind: "door";
  /** Folder name this door leads to. ".." means parent. */
  target: string;
}

export interface FileItem {
  name: string;
  /** Optional contents readable via `cat`. */
  contents?: string;
  /** Tile position inside the room. */
  x: number;
  y: number;
  /** Visual glyph */
  glyph?: string;
}

export interface Room {
  /** Absolute path, e.g. "/home/user". */
  path: string;
  /** Display name. */
  name: string;
  /** Short flavor description, used by `pwd`/look. */
  description: string;
  /** Grid dimensions. */
  width: number;
  height: number;
  /** Tile map (excluding items, doors are tiles). */
  tiles: Tile[];
  /** Doors with their folder targets. */
  doors: DoorTile[];
  /** Files in the room. */
  files: FileItem[];
  /** Player spawn tile (used when entering from parent). */
  spawn: { x: number; y: number };
  /** Spawn tile when entering from a child (returning via `..`). */
  returnSpawn?: { x: number; y: number };
}

export type LineKind = "input" | "output" | "error" | "dm" | "system" | "victory";

export interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
}

export type PlayerAnim = "idle" | "walking" | "pickingUp";
export type PlayerFacing = "down" | "up" | "left" | "right";

export interface VfxPulse {
  id: number;
  /** Tile coords highlighted briefly. */
  cells: { x: number; y: number }[];
  kind: "ls" | "find" | "rm" | "manifest" | "inspect" | "pwd";
  expiresAt: number;
}

export interface ScrollPopup {
  id: number;
  title: string;
  body: string;
}

export interface GameState {
  cwd: string;
  rooms: Record<string, Room>;
  inventory: FileItem[];
  inventoryPath: string;
  targetFile: string;
  player: { x: number; y: number };
  playerAnim: PlayerAnim;
  playerFacing: PlayerFacing;
  history: TerminalLine[];
  commandHistory: string[];
  won: boolean;
  /** True while an animation is running; terminal input disabled. */
  animating: boolean;
  /** Active visual effects layered on the world. */
  vfx: VfxPulse[];
  /** Active parchment popup from `cat`. */
  popup: ScrollPopup | null;
}

export interface CommandResult {
  lines: Omit<TerminalLine, "id">[];
  /** Optional state mutation applied after animations. */
  patch?: Partial<GameState>;
  /** Optional animation: walk player to target tile, then run effect. */
  walkTo?: { x: number; y: number };
  /** Effect after walk completes: change room or pick up item. */
  effect?:
    | { type: "enterRoom"; path: string; from: "child" | "parent" }
    | { type: "pickup"; fileName: string }
    | { type: "win" };
  /** Special: clear history. */
  clear?: boolean;
  /** Visual effect to add to state.vfx. */
  vfx?: Omit<VfxPulse, "id" | "expiresAt"> & { durationMs?: number };
  /** Show parchment popup (cat). */
  popup?: { title: string; body: string };
}
