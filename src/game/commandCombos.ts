import type { CommandResult, TerminalLine } from "./types";
import { baseCommand } from "./progressStats";

export interface CommandCombo {
  id: string;
  name: string;
  line: Omit<TerminalLine, "id">;
}

export function detectCommandCombo(previousCommands: string[], currentRaw: string, result: CommandResult): CommandCombo | null {
  const previous = previousCommands.at(-1) ?? "";
  const prev = baseCommand(previous);
  const current = baseCommand(currentRaw);
  const currentArg = currentRaw.trim().split(/\s+/)[1]?.toLowerCase() ?? "";
  const previousArg = previous.trim().split(/\s+/)[1]?.toLowerCase() ?? "";

  if (prev === "pwd" && current === "ls") {
    return {
      id: "surveyor-focus",
      name: "Surveyor's Focus",
      line: { kind: "dm", text: "Combo unlocked: Surveyor's Focus. You anchored yourself, then read the room." },
    };
  }

  if (prev === "find" && current === "cd" && currentArg) {
    return {
      id: "hunters-trail",
      name: "Hunter's Trail",
      line: { kind: "dm", text: "Combo unlocked: Hunter's Trail. You found the trail, then followed it." },
    };
  }

  if (prev === "cat" && current === "cd" && result.effect?.type === "enterRoom") {
    return {
      id: "prepared-mind",
      name: "Prepared Mind",
      line: { kind: "dm", text: "Combo unlocked: Prepared Mind. Reading first turned the door into a decision." },
    };
  }

  if (prev === "mkdir" && current === "mv" && previousArg) {
    return {
      id: "archivist",
      name: "Archivist",
      line: { kind: "dm", text: "Combo unlocked: Archivist. You shaped a place, then organized what mattered." },
    };
  }

  return null;
}
