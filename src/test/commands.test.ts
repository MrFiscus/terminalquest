import { describe, expect, it } from "vitest";
import { runCommand } from "@/game/commands";
import { DEFAULT_ROOMS, INVENTORY_PATH, START_PATH, TARGET_FILE } from "@/game/dungeon";
import { createCommandStats } from "@/game/adaptiveDungeon";
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
    expect((await runCommand("man grep", state())).lines[1].text).toBe("usage: grep <text> [file]");
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
});

