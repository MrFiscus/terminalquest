import { describe, expect, it } from "vitest";
import { flavorLevelRoomIds, flavorfulDoorName } from "@/game/dynamicDoorNames";

describe("dynamicDoorNames", () => {
  it("creates deterministic Linux-friendly names", () => {
    expect(flavorfulDoorName("vault")).toMatch(/^[a-z0-9-]+$/);
    expect(flavorfulDoorName("vault")).toBe(flavorfulDoorName("vault"));
    expect(flavorfulDoorName("ancient vault of doom").length).toBeLessThanOrEqual(24);
  });

  it("renames room ids and exits consistently", () => {
    const level = flavorLevelRoomIds(
      [
        { id: "foyer", items: [], exits: ["vault"] },
        { id: "vault", items: ["relic.txt"], exits: ["foyer"] },
      ],
      "foyer",
    );

    expect(level.start).not.toBe("foyer");
    expect(level.rooms[0].exits[0]).toBe(level.rooms[1].id);
    expect(level.rooms[1].exits[0]).toBe(level.rooms[0].id);
  });
});
