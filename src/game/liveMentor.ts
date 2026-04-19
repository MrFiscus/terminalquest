import type { CommandResult, GameState, TerminalLine } from "./types";
import { baseCommand, countCommands, formatDuration } from "./progressStats";

type MentorContext = {
  state: GameState;
  raw: string;
  failed: boolean;
  result: CommandResult;
  commands: string[];
  mistakes: string[];
  shown: Set<string>;
};

const dm = (text: string): Omit<TerminalLine, "id"> => ({ kind: "dm", text: `Dungeon Master: ${text}` });

function showOnce(shown: Set<string>, id: string) {
  if (shown.has(id)) return false;
  shown.add(id);
  return true;
}

export function liveMentorReaction({ state, raw, failed, result, commands, mistakes, shown }: MentorContext) {
  const command = baseCommand(raw);
  const target = raw.trim().split(/\s+/)[1] ?? "";
  const cdMistakes = mistakes.filter((entry) => baseCommand(entry) === "cd").length;
  const room = state.rooms[state.cwd];
  const hasTargetHere = room?.files.some((file) => file.name === state.targetFile) ?? false;
  const recent = commands.slice(-8).map(baseCommand);

  if (command === "cd" && failed && cdMistakes >= 2 && showOnce(shown, "cd-mistype")) {
    return dm("The doors answer exact names. Try `ls`, copy the door name, then `cd <door>`.");
  }

  if (command === "find" && !failed && target && (target.includes("relic") || result.lines.length > 1) && showOnce(shown, "find-praise")) {
    return dm("Clean tracking. `find` turns a maze into a map.");
  }

  if (command === "rm" && failed && raw.includes(state.targetFile) && showOnce(shown, "rm-relic")) {
    return dm("The relic refuses deletion. Good lesson: `rm` is powerful because it is dangerous.");
  }

  if (command === "rm" && result.effect?.type === "removeFile" && showOnce(shown, "rm-drama")) {
    return dm("Dust rises where certainty used to be. Deletion is a spell with teeth.");
  }

  if (!hasTargetHere && commands.length >= 8 && !recent.includes("find") && showOnce(shown, "wander-find")) {
    return dm(`You are spending steps as currency. Try \`find ${state.targetFile}\` and let the maze point back.`);
  }

  return null;
}

export function buildVictoryReport(input: {
  title: string;
  durationMs: number;
  commands: string[];
  mistakes: string[];
  roomsVisited: number;
  keysFound: number;
  lockedDoorsUnlocked: number;
}) {
  const counts = countCommands(input.commands);
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const strongestCommand = entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ls";
  const weakCandidates = ["cat", "find", "pwd", "file", "cd", "mv"];
  const weakestCommand = weakCandidates.find((command) => !counts[command]) ?? (
    Object.entries(counts).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "cat"
  );
  const usedInspection = Boolean((counts.cat ?? 0) + (counts.file ?? 0) + (counts.grep ?? 0));
  const usedNavigation = Boolean((counts.cd ?? 0) + (counts.pwd ?? 0) + (counts.ls ?? 0));
  const usedSearch = Boolean(counts.find);
  const skillUnlocked =
    input.mistakes.length === 0 ? "Clean Shellcasting" :
    usedSearch && usedInspection ? "Investigative Operator" :
    usedNavigation ? "Pathfinder" :
    "Relic Runner";
  const nextLesson =
    weakestCommand === "cat" ? "Use `cat <file>` before trusting a mysterious scroll." :
    weakestCommand === "find" ? "Use `find relic` early when the dungeon branches." :
    weakestCommand === "pwd" ? "Use `pwd` when backtracking starts to feel fuzzy." :
    weakestCommand === "file" ? "Use `file <name>` to identify keys, blockers, and decoys." :
    weakestCommand === "cd" ? "Use `ls`, then `cd <exact-door-name>`." :
    "Use `mv <file> ~/inventory` only when you know the target.";
  const feedback =
    input.mistakes.length === 0
      ? "Precise work. You moved through the dungeon without wasting a command on confusion."
      : `You recovered from ${input.mistakes.length} mistake${input.mistakes.length === 1 ? "" : "s"} and still finished the run. That is real terminal learning.`;

  return {
    title: input.title,
    time: formatDuration(input.durationMs),
    commandsUsed: input.commands.length,
    mistakesMade: input.mistakes.length,
    strongestCommand,
    weakestCommand,
    skillUnlocked,
    feedback,
    nextLesson,
  };
}
