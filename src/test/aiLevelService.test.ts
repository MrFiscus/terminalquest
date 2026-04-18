import { describe, expect, it } from "vitest";
import {
  fallbackLevel,
  levelToRooms,
  validateLevel,
} from "@/game/aiLevelService";
import { START_PATH } from "@/game/dungeon";

describe("aiLevelService", () => {
  it("validates connected levels with exact difficulty room counts", () => {
    const valid = validateLevel(
      {
        goal: "find and move relic.txt",
        required: ["ls", "find", "mv"],
        start: "foyer",
        hint: "Use find then mv.",
        rooms: [
          { id: "foyer", items: [], exits: ["vault"] },
          { id: "vault", items: ["relic.txt"], exits: ["foyer", "crypt"] },
          { id: "crypt", items: [], exits: ["vault", "hall"] },
          { id: "hall", items: [], exits: ["crypt"] },
        ],
      },
      { difficulty: "easy", weakCommands: ["mv"], recentMistakes: [] },
    );

    expect(valid?.rooms).toHaveLength(4);
    expect(valid?.required).toContain("mv");
  });

  it("converts fallback levels into reachable room data", () => {
    const level = fallbackLevel({ difficulty: "easy", weakCommands: ["find"], recentMistakes: [] });
    const rooms = levelToRooms(level);

    expect(rooms[START_PATH]).toBeTruthy();
    expect(Object.keys(rooms)).toHaveLength(4);
    expect(Object.values(rooms).some((room) => room.files.some((file) => file.name === "relic.txt"))).toBe(true);
  });
});
