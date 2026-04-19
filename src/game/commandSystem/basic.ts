import { generateSmartHint } from "../smartHints";
import { dm, out } from "./helpers";
import type { CommandDefinition } from "./types";

export const basicCommands: CommandDefinition[] = [
  {
    name: "pwd",
    description: "Print the current directory path.",
    usage: "pwd",
    run: (_args, { state }) => ({
      lines: [out(state.cwd)],
      vfx: { kind: "pwd", cells: [{ x: state.player.x, y: state.player.y }], durationMs: 1400 },
    }),
  },
  {
    name: "clear",
    description: "Clear the terminal output.",
    usage: "clear",
    run: () => ({ lines: [], clear: true }),
  },
  {
    name: "echo",
    description: "Print text back to the terminal.",
    usage: "echo <text>",
    run: (args) => ({ lines: [out(args.join(" "))] }),
  },
  {
    name: "hint",
    description: "Ask the Dungeon Master for a contextual nudge.",
    usage: "hint",
    run: (_args, { state }) => ({ lines: [dm(`Hint: ${generateSmartHint(state, "direct")}`)] }),
  },
  {
    name: "whoami",
    description: "Show your adventurer profile and command mastery.",
    usage: "whoami",
    run: () => ({
      lines: [out("Opening your adventurer profile...")],
      openProfile: true,
    }),
  },
];
