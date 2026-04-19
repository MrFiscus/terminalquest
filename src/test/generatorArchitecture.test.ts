import { describe, expect, it } from "vitest";
import { isWalkable, pathfind } from "@/game/dungeon";
import { generateDungeon, generateRoom, type RoomSpec } from "@/game/generator";
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

function resolveDoorPath(path: string, door: DoorTile) {
  return door.toPath ?? (
    door.target === ".."
      ? path.split("/").slice(0, -1).join("/") || "/"
      : `${path}/${door.target}`
  );
}

function dungeonSpecs(): RoomSpec[] {
  return [
    { ...spec("Root Hall"), path: "/home/user", hasParent: false, exits: ["storage-gallery", "vault-room"] },
    { ...spec("Storage Gallery"), path: "/home/user/storage-gallery", hasParent: true, exits: ["deep-archive"] },
    { ...spec("Vault Room"), path: "/home/user/vault-room", hasParent: true, exits: [] },
    { ...spec("Deep Archive"), path: "/home/user/storage-gallery/deep-archive", hasParent: true, exits: [] },
  ];
}

describe("generated room architecture", () => {
  it("adds fuller interior wall layouts with passable inner openings", () => {
    const room = generateRoom(spec("Storage Gallery"), 3);
    const walls = room.decor?.filter((d) => d.kind === "interior-wall") ?? [];
    const innerDoors = room.decor?.filter((d) => d.kind === "interior-door") ?? [];

    expect(walls.length).toBeGreaterThanOrEqual(8);
    expect(innerDoors.length).toBeGreaterThanOrEqual(2);
    for (const wall of walls) expect(isWalkable(room, wall.x, wall.y)).toBe(false);
    for (const door of innerDoors) expect(isWalkable(room, door.x, door.y)).toBe(true);
  });

  it("limits generated room exits to four commandable doors", () => {
    const room = generateRoom({
      ...spec("Busy Gallery"),
      exits: ["north", "east", "south", "west", "hidden", "attic"],
    });

    expect(room.doors.length).toBeLessThanOrEqual(4);
  });

  it("keeps generated dungeon rooms between two and four useful doors", () => {
    const rooms = generateDungeon(dungeonSpecs(), "/home/user", 4);
    for (const room of Object.values(rooms)) {
      expect(room.doors.length).toBeGreaterThanOrEqual(2);
      expect(room.doors.length).toBeLessThanOrEqual(4);
      for (const door of room.doors) {
        expect(rooms[resolveDoorPath(room.path, door)]).toBeTruthy();
      }
    }
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

  it("keeps generated scrolls off blocked walls and only uses ladders for wall scrolls", () => {
    for (let nonce = 0; nonce < 12; nonce++) {
      const room = generateRoom(spec("Storage Gallery"), nonce);
      const fileCells = new Set(room.files.map((file) => `${file.x},${file.y}`));

      for (const file of room.files) {
        expect(isWalkable(room, file.x, file.y)).toBe(true);
        expect(pathfind(room, room.spawn, file)).not.toBeNull();
      }

      for (const ladder of (room.decor ?? []).filter((d) => d.kind === "ladder")) {
        expect(fileCells.has(`${ladder.x},${ladder.y}`)).toBe(true);
      }
    }
  });

  it("blocks pathing onto generated wall cells", () => {
    const room = generateRoom(spec("Storage Gallery"), 3);
    const wall = room.decor?.find((d) => d.kind === "interior-wall");

    expect(wall).toBeTruthy();
    expect(wall ? pathfind(room, room.spawn, wall) : null).toBeNull();
  });

  it("blocks the visual footprint above horizontal generated walls", () => {
    const room = generateRoom(spec("Storage Gallery"), 3);
    const runCells = new Set(
      (room.decor ?? [])
        .filter((d) => d.kind === "interior-wall" || d.kind === "interior-door")
        .map((d) => `${d.x},${d.y}`),
    );
    const horizontalWall = room.decor?.find(
      (d) =>
        d.kind === "interior-wall" &&
        d.y > 1 &&
        (runCells.has(`${d.x - 1},${d.y}`) || runCells.has(`${d.x + 1},${d.y}`)),
    );

    expect(horizontalWall).toBeTruthy();
    expect(horizontalWall ? isWalkable(room, horizontalWall.x, horizontalWall.y - 1) : true).toBe(false);
  });

  it("keeps generated NPCs off structural walls and reachable floor", () => {
    for (let nonce = 0; nonce < 12; nonce++) {
      const rooms = generateDungeon(dungeonSpecs(), "/home/user", nonce);
      for (const room of Object.values(rooms)) {
        for (const npc of room.npcs ?? []) {
          const roomWithoutNpc = {
            ...room,
            npcs: (room.npcs ?? []).filter((other) => other.id !== npc.id),
          };

          expect(isWalkable(roomWithoutNpc, npc.x, npc.y)).toBe(true);
          expect(room.files.some((file) => file.x === npc.x && file.y === npc.y)).toBe(false);
          expect(pathfind(roomWithoutNpc, room.spawn, { x: npc.x, y: npc.y })).not.toBeNull();
        }
      }
    }
  });
});
