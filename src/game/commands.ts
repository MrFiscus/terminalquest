import { commandRegistry } from "./commandSystem/registry";
import { err } from "./commandSystem/helpers";
import { getRoom } from "./dungeon";
import type { CommandResult, GameState, LinuxCommand, MauQuiz } from "./types";

export interface RunCommandContext {
  startMauQuiz: (quiz: MauQuiz) => void;
  submitMauQuiz: (answer: string) => void;
  closeMauQuiz: () => void;
  openScroll: (name: string, contents: string) => void;
  closeScroll: () => void;
}

export async function runCommand(
  raw: string, 
  state: GameState,
  ctx: RunCommandContext
): Promise<CommandResult> {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };

  const [cmdRaw, ...args] = trimmed.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  const room = getRoom(state.rooms, state.cwd);
  if (!room) return { lines: [err("The void surrounds you. (room missing)")] };

  const handler = commandRegistry.get(cmd);
  if (!handler) return { lines: [], unknown: trimmed };
  if (state.lockedCommands?.includes(cmd as LinuxCommand)) {
    return {
      lines: [err(`${cmd}: command not yet learned. Speak with Mau first.`)],
    };
  }

  return handler.run(args, { 
    raw: trimmed, 
    command: cmd, 
    args, 
    state, 
    room,
    ...ctx
  });
}
