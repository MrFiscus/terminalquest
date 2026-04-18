import { describe, expect, it } from "vitest";
import { START_PATH, TARGET_FILE } from "@/game/dungeon";
import { generateSmartHint } from "@/game/smartHints";
import type { GameState, Room } from "@/game/types";

const room = (path: string, name: string, files: string[], doors: string[]): Room => ({
  path,
  name,
  description: "",
  width: 8,
  height: 6,
  tiles: [],
  files: files.map((file, index) => ({ name: file, x: index + 1, y: 2 })),
  doors: doors.map((door, index) => ({ kind: "door", target: door, x: index + 1, y: 0 })),
  spawn: { x: 1, y: 1 },
});

const state = (cwd = START_PATH): GameState => ({
  cwd,
  rooms: {
    [START_PATH]: room(START_PATH, "Entry", [], ["crypt"]),
    [`${START_PATH}/crypt`]: room(`${START_PATH}/crypt`, "Crypt", [TARGET_FILE], [".."]),
  },
  inventory: [],
  inventoryPath: `${START_PATH}/inventory`,
  targetFile: TARGET_FILE,
  player: { x: 1, y: 1 },
  playerAnim: "idle",
  playerFacing: "down",
  history: [],
  commandHistory: [],
  commandStats: {
    ls: { uses: 0, mistakes: 0 },
    cd: { uses: 0, mistakes: 0 },
    mkdir: { uses: 0, mistakes: 0 },
    pwd: { uses: 0, mistakes: 0 },
    cat: { uses: 0, mistakes: 0 },
    mv: { uses: 0, mistakes: 0 },
    rm: { uses: 0, mistakes: 0 },
    find: { uses: 0, mistakes: 0 },
    file: { uses: 0, mistakes: 0 },
  },
  recentMistakes: [],
  won: false,
  animating: false,
  transitioning: false,
  vfx: [],
  popup: null,
  goal: `Find ${TARGET_FILE} and move it into your inventory.`,
  requiredCommands: ["ls", "cd", "find", "mv"],
  winCondition: `mv ${TARGET_FILE} ~/inventory`,
  completionMessage: null,
});

describe("smartHints", () => {
  it("points toward the target room without dumping the whole map", () => {
    expect(generateSmartHint(state(), "direct")).toContain("cd crypt");
  });

  it("tells the player how to move the target when it is visible", () => {
    expect(generateSmartHint(state(`${START_PATH}/crypt`), "direct")).toContain(`mv ${TARGET_FILE} ~/inventory`);
  });
});
