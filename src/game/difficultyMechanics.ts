import { START_PATH } from "./dungeon";
import { generateDungeon, type RoomSpec } from "./generator";
import type { Difficulty, GeneratedLevel } from "./aiLevelService";
import type { DifficultyMechanic, DoorTile, LinuxCommand, MauQuiz, Npc, Room } from "./types";

const ROOM_NAME_SETS = [
  ["grotto", "passage", "sanctum"],
  ["moonwell", "catacomb", "archive"],
  ["crossing", "causeway", "reliquary"],
  ["hollow", "threshold", "vault"],
  ["lanternway", "gallery", "shrine"],
] as const;

export function mechanicForDifficulty(value: number | undefined): DifficultyMechanic {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value as number))) : 50;
  if (v <= 33) return "rm";
  if (v <= 67) return "mkdir";
  return "chmod";
}

function roomNamesForDifficulty(value: number | undefined) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value as number))) : 50;
  const [mauRoomId, challengeRoomId, vaultRoomId] = ROOM_NAME_SETS[v % ROOM_NAME_SETS.length];
  return {
    mauRoomId,
    challengeRoomId,
    vaultRoomId,
    mauRoomPath: `${START_PATH}/${mauRoomId}`,
    challengeRoomPath: `${START_PATH}/${mauRoomId}/${challengeRoomId}`,
    vaultRoomPath: `${START_PATH}/${mauRoomId}/${challengeRoomId}/${vaultRoomId}`,
  };
}

export function mauQuizForMechanic(mechanic: DifficultyMechanic): MauQuiz {
  const pick = (questions: string[]) => questions[Math.floor(Math.random() * questions.length)];
  if (mechanic === "rm") {
    return {
      question: pick([
        "What command removes a file or obstacle?",
        "Which Linux command deletes a file?",
        "A stone blocks the way. Which command removes it?",
        "What shell spell banishes unwanted files?",
      ]),
      type: "input",
      answer: "rm",
      rewardCommand: "rm",
    };
  }
  if (mechanic === "mkdir") {
    return {
      question: pick([
        "What command creates a new directory?",
        "Which Linux command makes a folder?",
        "A doorway must be rebuilt as a directory. What command do you use?",
        "What shell spell carves a new folder into existence?",
      ]),
      type: "input",
      answer: "mkdir",
      rewardCommand: "mkdir",
    };
  }
  return {
    question: pick([
      "What command changes file permissions?",
      "Which Linux command can grant read permission?",
      "A scroll cannot be read yet. What command changes its permissions?",
      "What shell spell rewrites who may read a file?",
    ]),
    type: "input",
    answer: "chmod",
    rewardCommand: "chmod",
  };
}

export function mauKeyQuizForDoor(target: string): MauQuiz {
  return {
    question: "Mau: What key did the scroll reveal?",
    type: "input",
    answer: "moonkey",
    successMessage: "Mau accepts the scroll key and steps aside.",
    releaseMauTarget: target,
  };
}

function insideDoorPos(door: DoorTile, room: Room) {
  if (door.y === 0) return { x: door.x, y: 1 };
  if (door.y === room.height - 1) return { x: door.x, y: room.height - 2 };
  if (door.x === 0) return { x: 1, y: door.y };
  return { x: room.width - 2, y: door.y };
}

function moveDoorToTop(room: Room, target: string): Room {
  const door = room.doors.find((d) => d.target === target);
  if (!door || door.y === 0) return room;
  const mid = Math.floor(room.width / 2);
  const candidates = [mid, mid - 3, mid + 3, 2, room.width - 3, mid - 5, mid + 5];
  const used = new Set(room.doors.filter((d) => d.target !== target).map((d) => `${d.x},${d.y}`));
  const x = candidates.find((candidate) =>
    candidate > 0 && candidate < room.width - 1 && !used.has(`${candidate},0`),
  ) ?? door.x;
  const movedDoor = { ...door, x, y: 0 };
  return {
    ...room,
    doors: room.doors.map((d) => (d.target === target ? movedDoor : d)),
    returnSpawn: insideDoorPos(movedDoor, room),
  };
}

function openFloorNear(
  room: Room,
  blocked: { x: number; y: number },
  forbidden: { x: number; y: number }[] = [],
) {
  const candidates = [
    { x: blocked.x, y: blocked.y + 1 },
    { x: blocked.x - 1, y: blocked.y },
    { x: blocked.x + 1, y: blocked.y },
    { x: blocked.x, y: blocked.y - 1 },
    { x: room.spawn.x, y: room.spawn.y },
  ];
  return (
    candidates.find((candidate) =>
      room.tiles.some((tile) => tile.kind === "floor" && tile.x === candidate.x && tile.y === candidate.y) &&
      !forbidden.some((spot) => spot.x === candidate.x && spot.y === candidate.y) &&
      !room.files.some((file) => file.x === candidate.x && file.y === candidate.y),
    ) ?? room.spawn
  );
}

function clearGeneratedMau(rooms: Record<string, Room>) {
  return Object.fromEntries(
    Object.entries(rooms).map(([path, room]) => [path, { ...room, npcs: (room.npcs ?? []).filter((npc) => npc.id !== "mau") }]),
  ) as Record<string, Room>;
}

function withMau(room: Room, mau: Pick<Npc, "x" | "y" | "blocksDoorTarget">): Room {
  return {
    ...room,
    npcs: [
      ...(room.npcs ?? []).filter((npc) => npc.id !== "mau"),
      {
        id: "mau",
        name: "Mau",
        x: mau.x,
        y: mau.y,
        sprite: "/src/assets/characters/cat-idle.gif",
        blocksDoorTarget: mau.blocksDoorTarget,
        dialogue: [
          "Mrow? A command is missing from your paws.",
          "Answer my trial and I will grant it.",
        ],
      },
    ],
  };
}

export function generateDifficultyMechanicLevel(difficulty: Difficulty, value: number | undefined): GeneratedLevel {
  const mechanic = mechanicForDifficulty(value);
  const lockedCommand: LinuxCommand = mechanic;
  const { mauRoomId, challengeRoomId, vaultRoomId, mauRoomPath, challengeRoomPath, vaultRoomPath } = roomNamesForDifficulty(value);
  const specs: RoomSpec[] = [
    {
      path: START_PATH,
      name: "Entry Hall",
      description: "A cold chamber where the dungeon listens for commands.",
      hasParent: false,
      exits: [mauRoomId],
      files: [
        {
          name: "readme.txt",
          glyph: "📜",
          contents: "Find Mau, earn the missing command, then claim relic.txt.",
        },
      ],
    },
    {
      path: mauRoomPath,
      name: "Mau's Crossing",
      description: "Mau watches the passage ahead with bright, knowing eyes.",
      hasParent: true,
      exits: [challengeRoomId],
      files:
        mechanic === "chmod"
          ? [
              {
                name: "scroll",
                glyph: "📜",
                contents: "moonkey",
              },
            ]
          : [],
    },
    {
      path: challengeRoomPath,
      name: "Trial Passage",
      description: "A tense chamber between Mau and the relic vault.",
      hasParent: true,
      exits: [vaultRoomId],
      files:
        mechanic === "mkdir"
          ? [
              {
                name: "door-note.txt",
                glyph: "📜",
                contents: `The broken doorway is supposed to lead to ${vaultRoomId}/.\nRepair it with: mkdir ${vaultRoomId}\nThen enter it with: cd ${vaultRoomId}`,
              },
            ]
          : [],
    },
    {
      path: vaultRoomPath,
      name: "Relic Vault",
      description: "A quiet vault where relic.txt glows on the stone floor.",
      hasParent: true,
      exits: [],
      files: [
        {
          name: "relic.txt",
          glyph: "🏆",
          contents: "A radiant text of legend. The way out.",
        },
      ],
    },
  ];

  const generatedRooms = clearGeneratedMau(generateDungeon(specs, START_PATH));
  const rooms = {
    ...generatedRooms,
    [mauRoomPath]: moveDoorToTop(generatedRooms[mauRoomPath], challengeRoomId),
    [challengeRoomPath]: moveDoorToTop(generatedRooms[challengeRoomPath], vaultRoomId),
  };
  const mauRoom = rooms[mauRoomPath];
  const challengeRoom = rooms[challengeRoomPath];
  const mauForwardDoor = mauRoom.doors.find((door) => door.target === challengeRoomId);
  const mauDoorPos = mauForwardDoor ? insideDoorPos(mauForwardDoor, mauRoom) : mauRoom.spawn;
  const vaultDoor = challengeRoom.doors.find((door) => door.target === vaultRoomId);
  const doorPos = vaultDoor ? insideDoorPos(vaultDoor, challengeRoom) : challengeRoom.spawn;
  const mauPos = mechanic === "chmod" ? mauDoorPos : openFloorNear(mauRoom, mauDoorPos);
  const mauReturnSpawn =
    mechanic === "chmod"
      ? openFloorNear(mauRoom, mauDoorPos, [mauDoorPos, mauRoom.spawn])
      : mauRoom.returnSpawn;

  let nextMauRoom = withMau(mauRoom, {
    ...mauPos,
    blocksDoorTarget: mechanic === "chmod" ? challengeRoomId : undefined,
  });
  if (mauReturnSpawn) nextMauRoom = { ...nextMauRoom, returnSpawn: mauReturnSpawn };
  let nextChallengeRoom = challengeRoom;

  if (mechanic === "rm" && vaultDoor) {
    nextChallengeRoom = {
      ...nextChallengeRoom,
      doors: nextChallengeRoom.doors.map((door) =>
        door.target === vaultRoomId ? { ...door, blockedBy: "stone" } : door,
      ),
      files: [
        ...nextChallengeRoom.files,
        {
          name: "stone",
          glyph: "🪨",
          type: "blocker",
          x: doorPos.x,
          y: doorPos.y,
          contents: "A heavy stone blocks the way.",
        },
      ],
    };
  }

  if (mechanic === "mkdir") {
    nextChallengeRoom = {
      ...nextChallengeRoom,
      doors: nextChallengeRoom.doors.map((door) =>
        door.target === vaultRoomId ? { ...door, broken: true } : door,
      ),
    };
  }

  if (mechanic === "chmod") {
    nextMauRoom = {
      ...nextMauRoom,
      files: nextMauRoom.files.map((file) =>
        file.name === "scroll"
          ? {
              ...file,
              permissions: "locked",
              contents: "moonkey",
            }
          : file,
      ),
    };
  }

  const roomMap = {
    ...rooms,
    [mauRoomPath]: nextMauRoom,
    [challengeRoomPath]: nextChallengeRoom,
  };

  const mechanicHints: Record<DifficultyMechanic, string> = {
    rm: "Answer Mau, then use rm stone.",
    mkdir: "Answer Mau, read door-note.txt, then repair the broken door with mkdir <door name>.",
    chmod: "Answer Mau, chmod +r scroll, cat scroll, then tell Mau the key.",
  };

  return {
    goal: "find and move relic.txt",
    required: ["ls", "cd", "find", lockedCommand, "mv"],
    rooms: [
      { id: "home", items: ["readme.txt"], exits: [mauRoomId] },
      {
        id: mauRoomId,
        items: mechanic === "chmod" ? [{ name: "scroll" }] : [],
        exits: [challengeRoomId],
      },
      {
        id: challengeRoomId,
        items:
          mechanic === "rm"
            ? [{ name: "stone" }]
            : mechanic === "mkdir"
              ? [{ name: "door-note.txt" }]
              : [],
        exits: [vaultRoomId],
      },
      { id: vaultRoomId, items: ["relic.txt"], exits: [] },
    ],
    start: "home",
    hint: mechanicHints[mechanic],
    roomMap,
    targetFile: "relic.txt",
    difficultyValue: value,
    mechanic,
    lockedCommands: [lockedCommand],
  };
}
