import type { LinuxCommand, TerminalLine } from "./types";

export type MagicCommand = Extract<LinuxCommand, "ls" | "cd" | "mkdir" | "rm" | "mv">;

const magicLines: Record<MagicCommand, string> = {
  ls: "You cast 'ls' — the room reveals its secrets.",
  cd: "You invoke 'cd' and step toward another chamber.",
  mkdir: "You shape 'mkdir' — stone bends into a new passage.",
  rm: "You release 'rm' — the chosen item is banished.",
  mv: "You wield 'mv' to carry an object to its new resting place.",
};

export const COMMAND_MAGIC_ENABLED = true;

export function magicLineForCommandInput(input: string): Omit<TerminalLine, "id"> | null {
  if (!COMMAND_MAGIC_ENABLED) return null;
  const command = input.trim().split(/\s+/)[0]?.toLowerCase() as MagicCommand | undefined;
  if (!command || !(command in magicLines)) return null;
  return { kind: "dm", text: magicLines[command] };
}
