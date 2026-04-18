import type { LinuxCommand } from "./types";

export type TeachingCommand = Extract<LinuxCommand, "ls" | "cd" | "mkdir" | "rm" | "mv">;

export interface TeachingTip {
  command: TeachingCommand;
  message: string;
}

const teachingMessages: Record<TeachingCommand, string> = {
  ls: "The room reveals its secrets. In Linux, 'ls' lists files and folders in your current location.",
  cd: "You stepped through a directory door. In Linux, 'cd' changes your current folder.",
  mkdir: "You carved a new passage into stone. In Linux, 'mkdir' creates a new folder.",
  rm: "You banished an item from the chamber. In Linux, 'rm' removes files, so use it carefully.",
  mv: "You moved the relic. In Linux, 'mv' moves files between locations.",
};

export function teachingForCommandInput(input: string): TeachingTip | null {
  const command = input.trim().split(/\s+/)[0]?.toLowerCase() as TeachingCommand | undefined;
  if (!command || !(command in teachingMessages)) return null;
  return { command, message: teachingMessages[command] };
}
