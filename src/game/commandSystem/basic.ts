import { generateSmartHint, smartHintCells } from "../smartHints";
import { dm, out } from "./helpers";
import { generateMauQuiz } from "../mauQuizService";
import { mauQuizForMechanic } from "../difficultyMechanics";
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
    run: (_args, { state }) => {
      const nextStage = (state.hintStage ?? 0) + 1;
      const direct = state.playMode === "guided" && nextStage >= 2;
      const exact = state.playMode === "guided" && nextStage >= 4;
      const cells = state.playMode === "guided" && nextStage >= 3 ? smartHintCells(state) : [];
      const prefix =
        exact ? "Exact command" :
        direct ? "Direct hint" :
        "Hint";
      return {
        lines: [dm(`${prefix}: ${generateSmartHint(state, direct ? "direct" : "light")}`)],
        patch: { hintStage: nextStage },
        vfx: cells.length ? { kind: "ghost", cells, durationMs: 2600 } : undefined,
      };
    },
  },
  {
    name: "whoami",
    description: "Show your adventurer profile and command mastery.",
    usage: "whoami",
    run: () => ({
      lines: [dm("Dungeon Master: Opening your adventurer profile.")],
      openProfile: true,
    }),
  },
  {
    name: "quiz",
    description: "Initiate a quiz with Mau if he is in the room.",
    usage: "quiz",
    run: async (_args, { state, room, startMauQuiz }) => {
      const hasMau = (room.npcs || []).some((n) => n.id === "mau");
      if (!hasMau) {
        return { lines: [out("There is no one here to quiz you.")] };
      }

      // Calculate difficulty based on path depth (0-100 scale)
      const depth = state.cwd.split("/").filter(Boolean).length;
      const dungeonDifficulty = Math.min(100, Math.max(0, depth * 20));

      const quiz = state.mechanic ? mauQuizForMechanic(state.mechanic) : await generateMauQuiz(dungeonDifficulty);

      // We use the startMauQuiz callback to trigger the UI overlay
      startMauQuiz(quiz);

      return {
        lines: [
          dm("Dungeon Master: Mau's eyes glow with ancient knowledge. Show him your command of the shell."),
        ],
      };
    },
  },
];
