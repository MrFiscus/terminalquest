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
        lockedRoom: "vault",
        keyRoom: "crypt",
        keyName: "skeleton.key",
        rooms: [
          {
            id: "foyer",
            items: [],
            exits: [{ target: "vault", locked: true, requiredKey: "skeleton.key" }],
          },
          { id: "vault", items: [{ name: "relic.txt" }], exits: ["foyer", "crypt"] },
          { id: "crypt", items: [{ name: "skeleton.key", type: "key" }], exits: ["vault", "hall"] },
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
    expect(Object.values(rooms).some((room) => room.files.some((file) => file.name === "skeleton.key" && file.type === "key"))).toBe(true);
    expect(Object.values(rooms).some((room) => room.doors.some((door) => door.locked && door.requiredKey === "skeleton.key"))).toBe(true);
  });
});
