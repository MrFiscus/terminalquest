import { describe, expect, it } from "vitest";
import { detectCommandCombo } from "@/game/commandCombos";
import { generateDifficultyMechanicLevel } from "@/game/difficultyMechanics";
import { buildVictoryReport } from "@/game/liveMentor";

describe("hackathon wow features", () => {
  it("detects command combos from meaningful command sequences", () => {
    expect(detectCommandCombo(["pwd"], "ls", { lines: [] })?.id).toBe("surveyor-focus");
    expect(detectCommandCombo(["find relic"], "cd vault", { lines: [] })?.id).toBe("hunters-trail");
  });

  it("builds a useful end-of-level report card", () => {
    const report = buildVictoryReport({
      title: "Relic Vault",
      durationMs: 125000,
      commands: ["ls", "find relic", "cd vault", "mv relic.txt ~/inventory"],
      mistakes: ["cd missing"],
      roomsVisited: 3,
      keysFound: 1,
      lockedDoorsUnlocked: 1,
    });

    expect(report.time).toBe("2m 05s");
    expect(report.commandsUsed).toBe(4);
    expect(report.mistakesMade).toBe(1);
    expect(report.nextLesson.length).toBeGreaterThan(10);
  });

  it("adapts generated lessons around weak commands", () => {
    const findLevel = generateDifficultyMechanicLevel("medium", 50, ["find"]);
    expect(findLevel.rooms.some((room) => room.id === "echo-nook")).toBe(true);
    expect(findLevel.hint).toMatch(/find/i);

    const catLevel = generateDifficultyMechanicLevel("medium", 50, ["cat"]);
    expect(catLevel.mechanic).toBe("chmod");
  });
});
