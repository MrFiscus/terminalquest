import { commandRegistry } from "./commandSystem/registry";
import { err } from "./commandSystem/helpers";
import { getRoom } from "./dungeon";
import type { CommandResult, GameState } from "./types";

export async function runCommand(raw: string, state: GameState): Promise<CommandResult> {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };

  const [cmdRaw, ...args] = trimmed.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  const room = getRoom(state.rooms, state.cwd);
  if (!room) return { lines: [err("The void surrounds you. (room missing)")] };

  const handler = commandRegistry.get(cmd);
  if (!handler) return { lines: [], unknown: trimmed };

  return handler.run(args, { raw: trimmed, command: cmd, args, state, room });
}
