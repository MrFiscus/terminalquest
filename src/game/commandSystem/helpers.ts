import { INVENTORY_PATH, findDoor, findFile, getRoom, resolvePath } from "../dungeon";
import type { CommandResult, FileItem, GameState, Room } from "../types";

export function out(text: string): CommandResult["lines"][number] {
  return { kind: "output", text };
}

export function err(text: string): CommandResult["lines"][number] {
  return { kind: "error", text };
}

export function dm(text: string): CommandResult["lines"][number] {
  return { kind: "dm", text };
}

export const relativePath = (from: string, to: string) => {
  if (to === from) return ".";
  if (to.startsWith(`${from}/`)) return `.${to.slice(from.length)}`;
  return to;
};

export function cleanName(name: string) {
  return name.trim().replace(/^\.\/+/, "");
}

export function baseName(path: string) {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function isSafeName(name: string) {
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

export function uniqueName(existing: string[], requested: string) {
  if (!existing.includes(requested)) return requested;
  const dot = requested.lastIndexOf(".");
  const stem = dot > 0 ? requested.slice(0, dot) : requested;
  const ext = dot > 0 ? requested.slice(dot) : "";
  let i = 1;
  while (existing.includes(`${stem}-copy${i}${ext}`)) i += 1;
  return `${stem}-copy${i}${ext}`;
}

export function findOpenFloor(room: Room, state: GameState, seed = ""): { x: number; y: number } | null {
  const occupied = new Set<string>([
    `${state.player.x},${state.player.y}`,
    ...room.files.map((file) => `${file.x},${file.y}`),
    ...room.doors.map((door) => `${door.x},${door.y}`),
    ...(room.decor ?? []).map((item) => `${item.x},${item.y}`),
  ]);
  const cx = Math.floor(room.width / 2);
  const cy = Math.floor(room.height / 2);
  const floors = room.tiles
    .filter((tile) => tile.kind === "floor" && !occupied.has(`${tile.x},${tile.y}`))
    .sort((a, b) => {
      const da = Math.abs(a.x - cx) + Math.abs(a.y - cy);
      const db = Math.abs(b.x - cx) + Math.abs(b.y - cy);
      return db - da || a.y - b.y || a.x - b.x;
    });
  if (!floors.length) return null;
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return floors[hash % floors.length];
}

export function cloneFile(file: FileItem, pos: { x: number; y: number }, name = file.name): FileItem {
  return {
    name,
    contents: file.contents,
    glyph: file.glyph,
    x: pos.x,
    y: pos.y,
  };
}

export function currentFile(state: GameState, room: Room, name: string): FileItem | undefined {
  return findFile(room, name) ?? state.inventory.find((item) => item.name === name);
}

export function resolveExistingRoom(state: GameState, cwd: string, arg: string): Room | undefined {
  const path = resolvePath(cwd, arg);
  return getRoom(state.rooms, path);
}

export function resolveDestinationRoom(state: GameState, room: Room, dest: string): Room | "inventory" | undefined {
  const resolved = resolvePath(state.cwd, dest);
  if (resolved === INVENTORY_PATH) return "inventory";
  const direct = getRoom(state.rooms, resolved);
  if (direct) return direct;
  const door = !dest.includes("/") ? findDoor(room, dest) : undefined;
  if (!door || door.target === "..") return undefined;
  return getRoom(state.rooms, `${state.cwd}/${door.target}`);
}

