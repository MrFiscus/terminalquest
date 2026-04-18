import { describe, expect, it } from "vitest";
import {
  adaptationMessage,
  createCommandStats,
  getWeakCommands,
  recordCommandAttempt,
} from "@/game/adaptiveDungeon";
import { fallbackLevel } from "@/game/aiLevelService";

describe("adaptiveDungeon", () => {
  it("ranks failed command attempts as weak commands", () => {
    let stats = createCommandStats();
    stats = recordCommandAttempt(stats, "cd nowhere", true);
    stats = recordCommandAttempt(stats, "cd vault", false);
    stats = recordCommandAttempt(stats, "mv relic.txt bag", true);
    stats = recordCommandAttempt(stats, "mv relic.txt bag", true);

    expect(getWeakCommands(stats, 2)).toEqual(["mv", "cd"]);
    expect(adaptationMessage(["mv"])).toContain("relics");
  });

  it("makes cd weakness produce branching fallback rooms", () => {
    const level = fallbackLevel({ difficulty: "medium", weakCommands: ["cd"], recentMistakes: ["cd nowhere"] });

    expect(level.required).toContain("cd");
    expect(level.rooms[0].exits.length).toBeGreaterThan(1);
    expect(level.hint).toMatch(/doors/i);
  });
});
