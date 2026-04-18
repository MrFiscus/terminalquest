import { describe, expect, it } from "vitest";
import {
  createPerformanceSummary,
  personalityReaction,
  updatePerformanceSummary,
} from "@/game/dungeonMasterPersonality";

describe("dungeonMasterPersonality", () => {
  it("reacts to repeated invalid command-like input", () => {
    let summary = createPerformanceSummary();
    summary = updatePerformanceSummary(summary, "xyz", true);
    summary = updatePerformanceSummary(summary, "abc123", true);
    summary = updatePerformanceSummary(summary, "nope", true);

    const reaction = personalityReaction(summary, "nope", 20_000);
    expect(reaction.line?.text).toContain("swing wildly");
  });

  it("reacts when the player improves after mistakes", () => {
    let summary = createPerformanceSummary();
    summary = updatePerformanceSummary(summary, "mv missing nope", true);
    summary = updatePerformanceSummary(summary, "ls", false);
    summary = updatePerformanceSummary(summary, "pwd", false);
    summary = updatePerformanceSummary(summary, "find relic", false);
    summary = updatePerformanceSummary(summary, "cd vault", false);

    const reaction = personalityReaction(summary, "cd vault", 20_000);
    expect(reaction.line?.text).toContain("learning quickly");
  });
});
