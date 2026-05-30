import type { LinuxCommand } from "./types";

export type TeachingCommand = Extract<LinuxCommand, "ls" | "cd" | "mkdir" | "rm" | "mv">;

export interface TeachingTip {
  command: TeachingCommand;
  message: string;
}

const teachingMessages: Record<TeachingCommand, string> = {
  ls: "You cast 'ls' — the room reveals its secrets. In Linux, 'ls' lists files and folders in your current location.",
  cd: "You invoke 'cd' and step toward another chamber. In Linux, 'cd' changes your current folder.",
  mkdir: "You shape 'mkdir' — stone bends into a new passage. In Linux, 'mkdir' creates a new folder.",
  rm: "You release 'rm' — the chosen item is banished. In Linux, 'rm' removes files, so use it carefully.",
  mv: "You wield 'mv' to carry an object to its new resting place. In Linux, 'mv' moves files between locations.",
};

export function teachingForCommandInput(input: string): TeachingTip | null {
  const command = input.trim().split(/\s+/)[0]?.toLowerCase() as TeachingCommand | undefined;
  if (!command || !(command in teachingMessages)) return null;
  return { command, message: teachingMessages[command] };
}
