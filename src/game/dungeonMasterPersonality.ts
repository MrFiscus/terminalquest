import { classifyTerminalInput } from "./aiDungeonMasterService";
import { commandFromInput } from "./adaptiveDungeon";
import type { TerminalLine } from "./types";

export interface PerformanceSummary {
  recentOutcomes: ("success" | "failure")[];
  invalidStreak: number;
  confusionStreak: number;
  successStreak: number;
  lastReactionAt: number;
}

export function createPerformanceSummary(): PerformanceSummary {
  return {
    recentOutcomes: [],
    invalidStreak: 0,
    confusionStreak: 0,
    successStreak: 0,
    lastReactionAt: 0,
  };
}

export function updatePerformanceSummary(
  summary: PerformanceSummary,
  input: string,
  failed: boolean,
): PerformanceSummary {
  const command = commandFromInput(input);
  const helpLike = classifyTerminalInput(input) === "help-like";
  return {
    ...summary,
    recentOutcomes: [failed ? "failure" : "success", ...summary.recentOutcomes].slice(0, 8),
    invalidStreak: failed && !command && !helpLike ? summary.invalidStreak + 1 : failed ? summary.invalidStreak : 0,
    confusionStreak: failed && helpLike ? summary.confusionStreak + 1 : failed ? summary.confusionStreak : 0,
    successStreak: failed ? 0 : summary.successStreak + 1,
  };
}

export function personalityReaction(
  summary: PerformanceSummary,
  input: string,
  now = Date.now(),
): { summary: PerformanceSummary; line: Omit<TerminalLine, "id"> | null } {
  const cooldownMs = 14000;
  if (now - summary.lastReactionAt < cooldownMs) return { summary, line: null };

  const react = (text: string) => ({
    summary: { ...summary, lastReactionAt: now },
    line: { kind: "dm" as const, text: `Dungeon Master: ${text}` },
  });

  if (summary.invalidStreak >= 3) {
    return react("You swing wildly at the air. Focus, adventurer.");
  }

  if (summary.confusionStreak >= 2) {
    return react("The maze hears your doubt. Ask plainly, then try one command.");
  }

  if (summary.successStreak >= 4 && summary.recentOutcomes.includes("failure")) {
    return react("You are learning quickly. The path opens to you.");
  }

  if (summary.successStreak >= 6 && commandFromInput(input)) {
    return react("Steady hands, clear commands. The dungeon begins to trust you.");
  }

  return { summary, line: null };
}
