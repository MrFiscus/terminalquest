import { beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVE_RUN_STORAGE_KEY,
  RUNS_STORAGE_KEY,
  saveActiveRun,
  summarizeProgress,
} from "@/game/progressStats";

describe("progress profile stats", () => {
  beforeEach(() => {
    localStorage.removeItem(RUNS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
  });

  it("includes active run commands in profile mastery before completion", () => {
    saveActiveRun({
      difficulty: "medium",
      startedAt: 1000,
      updatedAt: 2000,
      totalCommands: 3,
      commands: ["ls", "find relic", "cd vault"],
      commandCounts: { ls: 1, find: 1, cd: 1 },
      mistakes: ["cd missing"],
      roomsVisited: 2,
      lockedDoorsUnlocked: 1,
      keysFound: 1,
      targetFile: "relic.txt",
    });

    const summary = summarizeProgress([], "Adventurer");

    expect(summary.totalLevels).toBe(0);
    expect(summary.totalCommands).toBe(3);
    expect(summary.commandTotals.find).toBe(1);
    expect(summary.commandMistakes.cd).toBe(1);
    expect(summary.totalKeysFound).toBe(1);
    expect(summary.totalLockedDoorsUnlocked).toBe(1);
    expect(summary.activeRun?.roomsVisited).toBe(2);
  });
});
