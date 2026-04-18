import { describe, expect, it } from "vitest";
import { levelCompletionLine } from "@/game/levelCompletion";

describe("levelCompletion", () => {
  it("returns deterministic dramatic completion lines", () => {
    const first = levelCompletionLine("relic.txt", "find and move relic.txt");
    const second = levelCompletionLine("relic.txt", "find and move relic.txt");

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(20);
  });
});
