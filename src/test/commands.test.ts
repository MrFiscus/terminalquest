import { describe, expect, it } from "vitest";
import { runCommand } from "@/game/commands";
import { DEFAULT_ROOMS, INVENTORY_PATH, START_PATH, TARGET_FILE } from "@/game/dungeon";
import { createCommandStats } from "@/game/adaptiveDungeon";
import { RUNS_STORAGE_KEY } from "@/game/progressStats";
import type { GameState } from "@/game/types";

function state(): GameState {
  const startRoom = DEFAULT_ROOMS[START_PATH];
  return {
    cwd: START_PATH,
    rooms: DEFAULT_ROOMS,
    inventory: [],
    inventoryPath: INVENTORY_PATH,
    targetFile: TARGET_FILE,
    player: { ...startRoom.spawn },
    playerAnim: "idle",
    playerFacing: "down",
    history: [],
    commandHistory: [],
    commandStats: createCommandStats(),
    recentMistakes: [],
    won: false,
    animating: false,
    transitioning: false,
    vfx: [],
    screenEffect: null,
    popup: null,
    goal: `Find ${TARGET_FILE} and move it into your inventory.`,
    requiredCommands: ["ls", "cd", "find", "mv"],
    winCondition: `mv ${TARGET_FILE} ~/inventory`,
    completionMessage: null,
  };
}

describe("command registry", () => {
  it("runs basic registry commands", async () => {
    expect((await runCommand("pwd", state())).lines[0].text).toBe(START_PATH);
    expect((await runCommand("echo hello dungeon", state())).lines[0].text).toBe("hello dungeon");
    expect((await runCommand("help", state())).lines.some((line) => line.text.includes("touch <file>"))).toBe(true);
    expect((await runCommand("help", state())).lines.some((line) => line.text.includes("whoami"))).toBe(true);
    expect((await runCommand("man grep", state())).lines[1].text).toBe("usage: grep <text> [file]");
  });

  it("opens the profile with whoami", async () => {
    localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify([
      {
        id: "run-1",
        difficulty: "medium",
        startedAt: 1,
        completedAt: 121000,
        durationMs: 120000,
        totalCommands: 4,
        commands: ["ls", "cd vault", "find relic", "mv relic.txt ~/inventory"],
        commandCounts: { ls: 1, cd: 1, find: 1, mv: 1 },
        mistakes: ["cd missing"],
        roomsVisited: 3,
        lockedDoorUnlocked: true,
        lockedDoorsUnlocked: 1,
        keysFound: 1,
        targetFile: "relic.txt",
      },
    ]));

    const result = await runCommand("whoami", state());
    expect(result.lines[0].text).toBe("Opening your adventurer profile...");
    expect(result.openProfile).toBe(true);
  });

  it("creates, reads, copies, and searches files", async () => {
    const s = state();
    const touched = await runCommand("touch note.txt", s);
    const room = touched.patch?.rooms?.[START_PATH];
    expect(room?.files.some((file) => file.name === "note.txt")).toBe(true);

    const withNote = { ...s, rooms: touched.patch?.rooms as GameState["rooms"] };
    const copied = await runCommand("cp readme.txt readme-copy.txt", withNote);
    expect(copied.patch?.rooms?.[START_PATH].files.some((file) => file.name === "readme-copy.txt")).toBe(true);

    const searched = await runCommand("grep adventurer readme.txt", s);
    expect(searched.lines[0].text).toContain("Welcome, adventurer");
  });

  it("blocks the locked vault door until skeleton.key is in inventory", async () => {
    const s = {
      ...state(),
      cwd: "/home/user/hallway/antechamber",
      player: { ...DEFAULT_ROOMS["/home/user/hallway/antechamber"].spawn },
    };

    const blocked = await runCommand("cd vault", s);
    expect(blocked.effect).toBeUndefined();
    expect(blocked.lines[0].kind).toBe("error");

    const key = DEFAULT_ROOMS["/home/user/hallway"].files.find((file) => file.name === "skeleton.key");
    expect(key).toBeDefined();

    const unlocked = await runCommand("cd vault", { ...s, inventory: [key!] });
    expect(unlocked.effect).toEqual({
      type: "enterRoom",
      path: "/home/user/hallway/antechamber/vault",
      from: "parent",
      wasLocked: true,
      requiredKey: "skeleton.key",
    });
    expect(unlocked.patch?.rooms?.["/home/user/hallway/antechamber"].doors.find((door) => door.target === "vault")?.locked).toBe(false);
  });

  it("only treats relic.txt as the victory mv target", async () => {
    const hallwayState = {
      ...state(),
      cwd: "/home/user/hallway",
      player: { ...DEFAULT_ROOMS["/home/user/hallway"].spawn },
    };
    const keyMove = await runCommand("mv skeleton.key ~/inventory", hallwayState);
    expect(keyMove.effect).toEqual({ type: "pickup", fileName: "skeleton.key" });

    const vaultState = {
      ...state(),
      cwd: "/home/user/hallway/antechamber/vault",
      player: { ...DEFAULT_ROOMS["/home/user/hallway/antechamber/vault"].spawn },
    };
    const relicMove = await runCommand("mv relic.txt ~/inventory", vaultState);
    expect(relicMove.effect).toEqual({ type: "win", fileName: "relic.txt" });
  });
});
