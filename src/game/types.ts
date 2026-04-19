export type TileKind = "wall" | "floor" | "door" | "torch";
export type LinuxCommand =
  | "ls"
  | "cd"
  | "mkdir"
  | "chmod"
  | "pwd"
  | "cat"
  | "mv"
  | "rm"
  | "find"
  | "file"
  | "clear"
  | "echo"
  | "touch"
  | "cp"
  | "grep"
  | "help"
  | "hint"
  | "man"
  | "whoami";

export type Direction =
  | "north"
  | "south"
  | "east"
  | "west"
  | "north-east"
  | "north-west"
  | "south-east"
  | "south-west";

export type CharState = "idle" | "walking" | "pickingUp";

export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
}

export interface DoorTile extends Tile {
  kind: "door";
  target: string;
  locked?: boolean;
  requiredKey?: string;
  broken?: boolean;
  blockedBy?: string;
  blockedByMau?: boolean;
}

export interface FileItem {
  name: string;
  contents?: string;
  x: number;
  y: number;
  glyph?: string;
  type?: "key" | "blocker";
  permissions?: "locked" | "readable";
}

export type DecorKind =
  | "barrel"
  | "chest"
  | "chest-empty"
  | "chest-full"
  | "crack"
  | "crate"
  | "inscribed-floor"
  | "interior-door"
  | "interior-wall"
  | "ladder"
  | "lamp"
  | "banner"
  | "pillar"
  | "sack"
  | "statue"
  | "water";

export interface DecorItem {
  kind: DecorKind;
  x: number;
  y: number;
}

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  dialogue?: string[];
  blocksDoorTarget?: string;
}

export interface Room {
  path: string;
  name: string;
  description: string;
  width: number;
  height: number;
  tiles: Tile[];
  doors: DoorTile[];
  files: FileItem[];
  npcs?: Npc[];
  decor?: DecorItem[];
  spawn: { x: number; y: number };
  returnSpawn?: { x: number; y: number };
}

export type LineKind = "input" | "output" | "error" | "dm" | "system" | "victory" | "npc";

export interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
}

export type PlayerAnim = "idle" | "walking" | "pickingUp";
export type PlayerFacing = "down" | "up" | "left" | "right";

export interface VfxPulse {
  id: number;
  cells: { x: number; y: number }[];
  kind: "ls" | "find" | "rm" | "manifest" | "inspect" | "pwd";
  expiresAt: number;
}

export interface ScrollPopup {
  id: number;
  title: string;
  body: string;
}

export interface ScreenEffect {
  id: number;
  kind: "reveal" | "error" | "create" | "traverse" | "track" | "aware";
}

export interface MauQuiz {
  question: string;
  type: "choice" | "input";
  options?: string[];
  answer: string;
  rewardCommand?: LinuxCommand;
  completedMessage?: string;
  successMessage?: string;
  releaseMauTarget?: string;
}

export type DifficultyMechanic = "rm" | "mkdir" | "chmod";

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
  commandStats: Record<LinuxCommand, { uses: number; mistakes: number }>;
  recentMistakes: string[];
  won: boolean;
  animating: boolean;
  transitioning: boolean;
  vfx: VfxPulse[];
  screenEffect: ScreenEffect | null;
  popup: ScrollPopup | null;
  goal: string;
  requiredCommands: string[];
  winCondition: string;
  completionMessage: string | null;
  activeMauQuiz?: MauQuiz;
  difficultyValue?: number;
  mechanic?: DifficultyMechanic;
  lockedCommands?: LinuxCommand[];
  mauSecretKnown?: boolean;
}

export interface CommandResult {
  lines: Omit<TerminalLine, "id">[];
  patch?: Partial<GameState>;
  walkTo?: { x: number; y: number };
  effect?:
    | {
        type: "enterRoom";
        path: string;
        from: "child" | "parent";
        wasLocked?: boolean;
        requiredKey?: string;
      }
    | { type: "pickup"; fileName: string }
    | { type: "removeFile"; fileName: string }
    | { type: "repairDoor"; target: string }
    | { type: "chmodFile"; fileName: string }
    | { type: "releaseMau"; target: string }
    | { type: "win"; fileName: string };
  clear?: boolean;
  vfx?: Omit<VfxPulse, "id" | "expiresAt"> & { durationMs?: number };
  popup?: { title: string; body: string };
  openProfile?: boolean;
  unknown?: string;
}
