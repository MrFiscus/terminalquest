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

export interface GameState {
  cwd: string;
  rooms: Record<string, Room>;
  inventory: FileItem[];
  inventoryPath: string;
  targetFile: string;
  player: { x: number; y: number };
  history: TerminalLine[];
  commandHistory: string[];
  won: boolean;
  /** True while an animation is running; terminal input disabled. */
  animating: boolean;
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
}
