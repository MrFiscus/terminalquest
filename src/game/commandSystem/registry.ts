import { generateSmartHint } from "../smartHints";
import { dm, out } from "./helpers";
import { basicCommands } from "./basic";
import { fileCommands } from "./fileInteraction";
import { navigationCommands } from "./navigation";
import { roomCommands } from "./rooms";
import type { CommandDefinition } from "./types";

const helpCommand: CommandDefinition = {
  name: "help",
  description: "List available commands and the current objective.",
  usage: "help",
  run: (_args, { state }) => ({
    lines: [
      out("Available commands:"),
      ...commandDefinitions.map((command) => out(`  ${command.usage.padEnd(28)} ${command.description}`)),
      out(""),
      out(`Goal: ${state.winCondition}`),
      dm(`Hint: ${generateSmartHint(state, "light")}`),
    ],
    vfx: { kind: "ghost", cells: [{ x: state.player.x, y: state.player.y }], durationMs: 1600 },
  }),
};

const manCommand: CommandDefinition = {
  name: "man",
  description: "Show a short manual page for a command.",
  usage: "man <command>",
  run: (args, { state }) => {
    const name = args[0];
    if (!name) return { lines: [out("man: usage: man <command>")] };
    const command = commandRegistry.get(name);
    if (!command) return { lines: [out(`No manual entry for ${name}`)] };
    return {
      lines: [
        out(`${command.name} - ${command.description}`),
        out(`usage: ${command.usage}`),
      ],
      vfx: { kind: "inspect", cells: [{ x: state.player.x, y: state.player.y }], durationMs: 1300 },
    };
  },
};

export const commandDefinitions: CommandDefinition[] = [
  ...navigationCommands,
  ...basicCommands,
  ...fileCommands,
  ...roomCommands,
  helpCommand,
  manCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const commandRegistry = new Map<string, CommandDefinition>();

for (const command of commandDefinitions) {
  commandRegistry.set(command.name, command);
  for (const alias of command.aliases ?? []) commandRegistry.set(alias, command);
}

