import { describe, expect, it } from "vitest";
import { roomFlavor } from "@/game/roomFlavor";
import type { Room } from "@/game/types";

const makeRoom = (name: string, files: string[] = [], doors = 1): Room => ({
  path: `/home/user/${name.toLowerCase().replace(/\s+/g, "-")}`,
  name,
  description: "",
  width: 8,
  height: 6,
  tiles: [],
  doors: Array.from({ length: doors }).map((_, index) => ({
    kind: "door",
    target: `door${index + 1}`,
    x: index + 1,
    y: 0,
  })),
  files: files.map((name, index) => ({ name, x: index + 1, y: 2 })),
  spawn: { x: 1, y: 1 },
});

describe("roomFlavor", () => {
  it("matches room names and target-like items", () => {
    expect(roomFlavor(makeRoom("Ancient Crypt"))).toMatch(/crypt/i);
    expect(roomFlavor(makeRoom("Vault", ["victory.jpg"]))).toMatch(/valuable/i);
  });

  it("uses item context for scroll or text rooms", () => {
    expect(roomFlavor(makeRoom("Study", ["note.txt"]))).toMatch(/archive|knowledge/i);
  });
});
