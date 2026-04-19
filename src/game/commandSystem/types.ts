import type { CommandResult, GameState, MauQuiz, Room } from "../types";

export interface CommandContext {
  raw: string;
  command: string;
  args: string[];
  state: GameState;
  room: Room;
  startMauQuiz: (quiz: MauQuiz) => void;
  submitMauQuiz: (answer: string) => void;
  closeMauQuiz: () => void;
  openScroll: (name: string, contents: string) => void;
  closeScroll: () => void;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  run: (args: string[], context: CommandContext) => CommandResult | Promise<CommandResult>;
}

