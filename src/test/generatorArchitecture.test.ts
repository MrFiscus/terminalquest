import { describe, expect, it } from "vitest";
import { isWalkable, pathfind } from "@/game/dungeon";
import { generateRoom, type RoomSpec } from "@/game/generator";
import type { DoorTile, Room } from "@/game/types";

function insideDoorPos(door: DoorTile, room: Room) {
  if (door.x === 0) return { x: 1, y: door.y };
  if (door.x === room.width - 1) return { x: room.width - 2, y: door.y };
  if (door.y === 0) return { x: door.x, y: 1 };
  if (door.y === room.height - 1) return { x: door.x, y: room.height - 2 };
  return { x: door.x, y: door.y };
}

function spec(name: string): RoomSpec {
  return {
    path: `/home/user/${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    description: "A generated test room.",
    hasParent: true,
    exits: ["north-wing", "east-wing"],
    files: [
      { name: "relic.txt" },
      { name: "note.txt" },
    ],
    width: 18,
    height: 12,
  };
}

describe("generated room architecture", () => {
  it("adds fuller interior wall layouts with passable inner doors", () => {
    const room = generateRoom(spec("Storage Gallery"), 3);
    const walls = room.decor?.filter((d) => d.kind === "interior-wall") ?? [];
    const innerDoors = room.decor?.filter((d) => d.kind === "interior-door") ?? [];

    expect(walls.length).toBeGreaterThanOrEqual(8);
    expect(innerDoors.length).toBeGreaterThanOrEqual(2);
    for (const wall of walls) expect(isWalkable(room, wall.x, wall.y)).toBe(false);
    for (const door of innerDoors) expect(isWalkable(room, door.x, door.y)).toBe(true);
  });

  it("mixes horizontal and vertical interior wall runs", () => {
    const room = generateRoom(spec("Storage Gallery"), 3);
    const wallCells = new Set((room.decor ?? []).filter((d) => d.kind === "interior-wall").map((d) => `${d.x},${d.y}`));
    const doorCells = new Set((room.decor ?? []).filter((d) => d.kind === "interior-door").map((d) => `${d.x},${d.y}`));
    const runCells = new Set([...wallCells, ...doorCells]);
    const hasHorizontal = [...runCells].some((cell) => {
      const [x, y] = cell.split(",").map(Number);
      return runCells.has(`${x - 1},${y}`) || runCells.has(`${x + 1},${y}`);
    });
    const hasVertical = [...runCells].some((cell) => {
      const [x, y] = cell.split(",").map(Number);
      return runCells.has(`${x},${y - 1}`) || runCells.has(`${x},${y + 1}`);
    });

    expect(hasHorizontal).toBe(true);
    expect(hasVertical).toBe(true);
    for (const cell of doorCells) {
      const [x, y] = cell.split(",").map(Number);
      expect(wallCells.has(`${x},${y - 1}`) && wallCells.has(`${x},${y + 1}`)).toBe(false);
    }
  });

  it("varies interior wall structure across generated rooms", () => {
    const signatures = new Set<string>();
    for (let nonce = 0; nonce < 14; nonce++) {
      const room = generateRoom(spec("Storage Gallery"), nonce);
      const cells = (room.decor ?? [])
        .filter((d) => d.kind === "interior-wall" || d.kind === "interior-door")
        .map((d) => `${d.kind}:${d.x},${d.y}`)
        .sort()
        .join("|");
      signatures.add(cells);
    }

    expect(signatures.size).toBeGreaterThanOrEqual(10);
  });

  it("keeps generated doors and files reachable through interior door openings", () => {
    const room = generateRoom(spec("Storage Gallery"), 3);
    for (const door of room.doors) {
      expect(pathfind(room, room.spawn, insideDoorPos(door, room))).not.toBeNull();
    }
    for (const file of room.files) {
      expect(pathfind(room, room.spawn, file)).not.toBeNull();
    }
  });
});
