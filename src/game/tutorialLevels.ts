import { generateDungeon, type RoomSpec } from "./generator";
import type { GeneratedLevel, LevelRoom } from "./aiLevelService";
import type { Npc, Room } from "./types";

export const LANTERN_CATACOMBS_ID = "lantern-catacombs";

export const LANTERN_PATHS = {
  entrance: "/home/user/catacombs/entrance",
  hallway: "/home/user/catacombs/entrance/hallway",
  sealedGate: "/home/user/catacombs/entrance/hallway/sealed_gate",
  sanctum: "/home/user/catacombs/entrance/hallway/sealed_gate/sanctum",
} as const;

const REQUIRED_COMMANDS: GeneratedLevel["required"] = [
  "help",
  "ls",
  "echo",
  "cat",
  "cd",
  "pwd",
  "find",
  "man",
  "whoami",
  "mv",
];

const ROOM_SPECS: RoomSpec[] = [
  {
    path: LANTERN_PATHS.entrance,
    name: "Catacomb Entrance",
    description: "Lantern soot stains the arch. A child's whisper lingers in the dark.",
    hasParent: false,
    exits: ["hallway"],
    files: [
      {
        name: "lantern.txt",
        contents: "Walk by names.\nRemember your path.\nSeek what is hidden.",
      },
    ],
  },
  {
    path: LANTERN_PATHS.hallway,
    name: "Bell Hallway",
    description: "A narrow hall where old stone waits for the right word.",
    hasParent: true,
    exits: ["sealed_gate"],
    files: [
      {
        name: "strange_bell.txt",
        contents: "Speak OPEN where stone can hear.",
      },
    ],
  },
  {
    path: LANTERN_PATHS.sealedGate,
    name: "Sealed Gate",
    description: "A witch's lantern burns without oil, bright as stored memory.",
    hasParent: true,
    exits: ["sanctum"],
    files: [
      {
        name: "lantern.key",
        type: "key",
        contents: "A lantern-shaped key, warm as if it knows your name.",
      },
    ],
  },
  {
    path: LANTERN_PATHS.sanctum,
    name: "Lantern Sanctum",
    description: "The final chamber opens in silence. The lesson waits to become instinct.",
    hasParent: true,
    exits: [],
    files: [],
  },
];

const INITIAL_TUTORIAL_PROGRESS: Record<string, boolean> = {
  echoChildMet: false,
  gateOpened: false,
  cartographerMet: false,
  elyraIntroduced: false,
  elyraAskedWhoami: false,
  lanternKeyMoved: false,
  sanctumReached: false,
};

function isOpenFloor(room: Room, x: number, y: number) {
  const tile = room.tiles.find((candidate) => candidate.x === x && candidate.y === y);
  if (tile?.kind !== "floor" && tile?.kind !== "torch") return false;
  if (room.spawn.x === x && room.spawn.y === y) return false;
  if (room.returnSpawn?.x === x && room.returnSpawn.y === y) return false;
  if (room.files.some((file) => file.x === x && file.y === y)) return false;
  if (room.doors.some((door) => door.x === x && door.y === y)) return false;
  if ((room.npcs ?? []).some((npc) => npc.x === x && npc.y === y)) return false;
  return true;
}

function placeNpc(room: Room, npc: Omit<Npc, "x" | "y">, preferred: Array<{ x: number; y: number }>) {
  const spot =
    preferred.find((candidate) => isOpenFloor(room, candidate.x, candidate.y)) ??
    (() => {
      for (let y = 1; y < room.height - 1; y++) {
        for (let x = 1; x < room.width - 1; x++) {
          if (isOpenFloor(room, x, y)) return { x, y };
        }
      }
      return room.spawn;
    })();

  return {
    ...room,
    npcs: [...(room.npcs ?? []), { ...npc, x: spot.x, y: spot.y }],
  };
}

function withLanternNpcLayout(rooms: Record<string, Room>) {
  const entrance = rooms[LANTERN_PATHS.entrance];
  const hallway = rooms[LANTERN_PATHS.hallway];
  const sealedGate = rooms[LANTERN_PATHS.sealedGate];
  const sanctum = rooms[LANTERN_PATHS.sanctum];

  rooms[LANTERN_PATHS.entrance] = placeNpc(
    entrance,
    {
      id: "echo-child",
      name: "Echo Child",
      sprite: "ghost",
      dialogue: ["hello..."],
    },
    [
      { x: entrance.spawn.x + 2, y: entrance.spawn.y },
      { x: entrance.spawn.x + 1, y: entrance.spawn.y - 1 },
    ],
  );

  rooms[LANTERN_PATHS.hallway] = placeNpc(
    hallway,
    {
      id: "lost-cartographer",
      name: "Lost Cartographer",
      sprite: "wizard",
      dialogue: ["Ah. A path remembered is a path survived."],
    },
    [
      { x: hallway.spawn.x + 2, y: hallway.spawn.y },
      { x: hallway.spawn.x + 1, y: hallway.spawn.y + 1 },
    ],
  );

  rooms[LANTERN_PATHS.sealedGate] = placeNpc(
    sealedGate,
    {
      id: "elyra",
      name: "Elyra the Lantern Witch",
      sprite: "wizard",
      dialogue: [
        "Knowledge is not memory. Knowledge is knowing where to look.",
        "Tell me who stands before me.",
        "The lantern recognizes your hand.",
      ],
    },
    [
      { x: sealedGate.spawn.x + 2, y: sealedGate.spawn.y - 1 },
      { x: sealedGate.spawn.x + 2, y: sealedGate.spawn.y + 1 },
    ],
  );

  rooms[LANTERN_PATHS.sanctum] = {
    ...sanctum,
    npcs: sanctum.npcs ?? [],
  };

  return rooms;
}

function buildLanternRoomMap() {
  const rooms = withLanternNpcLayout(generateDungeon(ROOM_SPECS, LANTERN_PATHS.entrance));

  rooms[LANTERN_PATHS.hallway] = {
    ...rooms[LANTERN_PATHS.hallway],
    doors: rooms[LANTERN_PATHS.hallway].doors.map((door) =>
      door.target === "sealed_gate" ? { ...door, locked: true } : door,
    ),
  };

  rooms[LANTERN_PATHS.sealedGate] = {
    ...rooms[LANTERN_PATHS.sealedGate],
    doors: rooms[LANTERN_PATHS.sealedGate].doors.map((door) =>
      door.target === "sanctum" ? { ...door, locked: true, requiredKey: "lantern.key" } : door,
    ),
  };

  return rooms;
}

const LANTERN_ROOMS: LevelRoom[] = [
  { id: "entrance", items: ["lantern.txt"], exits: ["hallway"] },
  { id: "hallway", items: ["strange_bell.txt"], exits: ["entrance", "sealed_gate"] },
  { id: "sealed_gate", items: [{ name: "lantern.key", type: "key" }], exits: ["hallway", "sanctum"] },
  { id: "sanctum", items: [], exits: ["sealed_gate"] },
];

export function createLanternCatacombsLevel(familiarity = 20): GeneratedLevel {
  return {
    goal: "Complete the Lantern Catacombs and carry lantern.key into the sanctum.",
    winCondition: "Read the clues, move lantern.key into ~/inventory, then cd sanctum.",
    hint: "Read the clues, speak the right word, and carry the lantern key forward.",
    required: REQUIRED_COMMANDS,
    rooms: LANTERN_ROOMS,
    start: "entrance",
    startPath: LANTERN_PATHS.entrance,
    roomMap: buildLanternRoomMap(),
    targetFile: "lantern.key",
    difficultyValue: familiarity,
    tutorialId: LANTERN_CATACOMBS_ID,
    tutorialProgress: { ...INITIAL_TUTORIAL_PROGRESS },
  };
}
