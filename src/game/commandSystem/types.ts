import type { CommandResult, GameState, Room } from "../types";

export interface CommandContext {
  raw: string;
  command: string;
  args: string[];
  state: GameState;
  room: Room;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  run: (args: string[], context: CommandContext) => CommandResult | Promise<CommandResult>;
}

