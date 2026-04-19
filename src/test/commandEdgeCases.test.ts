import { describe, expect, it, vi, beforeEach } from "vitest";
import { runCommand } from "@/game/commands";
import { DEFAULT_ROOMS, INVENTORY_PATH, START_PATH, TARGET_FILE } from "@/game/dungeon";
import { createCommandStats } from "@/game/adaptiveDungeon";
import type { GameState } from "@/game/types";

// Mock Supabase to prevent network calls during tests
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { room: "{ \"roomName\": \"test\", \"goal\": \"test\", \"visibleItems\": [], \"visibleExits\": [], \"requiredCommands\": [], \"hint\": \"test\" }" }, error: null }),
    },
  },
}));

function state(): GameState {
  const startRoom = DEFAULT_ROOMS[START_PATH];
  return {
    cwd: START_PATH,
    rooms: { ...DEFAULT_ROOMS },
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

describe("Command Edge Cases (Phase 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cat", () => {
    it("errors on missing file", async () => {
      const result = await runCommand("cat non-existent.txt", state());
      expect(result.lines[0].kind).toBe("error");
      expect(result.lines[0].text).toContain("no such file");
    });

    it("errors on locked permissions", async () => {
      const s = state();
      const lockedFile = { name: "secret.txt", contents: "top secret", permissions: "locked" as const, x: 1, y: 1, glyph: "scroll" };
      s.rooms[START_PATH].files.push(lockedFile);
      
      const result = await runCommand("cat secret.txt", s);
      expect(result.lines[0].kind).toBe("error");
      expect(result.lines[0].text).toContain("Permission denied");
    });

    it("triggers Mau Easter egg if Mau is present", async () => {
      const s = state();
      s.rooms[START_PATH].npcs = [{ id: "mau", name: "Mau", x: 2, y: 2, dialog: "Meow" }];
      
      const result = await runCommand("cat mau", s);
      expect(result.lines[0].text).toContain("Mau is not a file");
    });
  });

  describe("mkdir", () => {
    it("repairs a broken door if names match the mechanic", async () => {
      const s = state();
      s.mechanic = "mkdir";
      s.rooms[START_PATH].doors.push({ target: "vault", x: 0, y: 5, broken: true });
      
      const result = await runCommand("mkdir vault", s);
      expect(result.effect?.type).toBe("repairDoor");
      expect(result.lines[0].text).toContain("rebuild the broken doorway");
    });

    it("errors on duplicate directory", async () => {
      const s = state();
      s.rooms[START_PATH].doors.push({ target: "hallway", x: 0, y: 5 });
      
      const result = await runCommand("mkdir hallway", s);
      expect(result.lines[0].kind).toBe("error");
      expect(result.lines[0].text).toContain("already exists");
    });

    it("successfully creates a new directory door", async () => {
      const s = state();
      // Ensure space for a door on the top wall (y=0)
      s.rooms[START_PATH].width = 10;
      s.rooms[START_PATH].height = 10;
      s.rooms[START_PATH].doors = []; // Clear existing doors to give space
      
      const result = await runCommand("mkdir secret_room", s);
      expect(result.patch?.rooms?.[START_PATH].doors.some(d => d.target === "secret_room")).toBe(true);
      expect(result.patch?.rooms?.[`${START_PATH}/secret_room`]).toBeDefined();
    });
  });

  describe("rm", () => {
    it("protects the objective file from deletion", async () => {
      const s = state();
      // Objective file must actually be in the room for rm to handle it
      s.rooms[START_PATH].files.push({ name: TARGET_FILE, x: 2, y: 2, glyph: "🏆" });
      
      const result = await runCommand(`rm ${TARGET_FILE}`, s);
      expect(result.lines[0].kind).toBe("error");
      expect(result.lines[0].text).toContain("resists destruction");
    });

    it("removes a regular file", async () => {
      const s = state();
      s.rooms[START_PATH].files.push({ name: "trash.txt", x: 3, y: 3, glyph: "scroll" });
      const result = await runCommand("rm trash.txt", s);
      expect(result.effect?.type).toBe("removeFile");
      expect(result.effect?.fileName).toBe("trash.txt");
    });
  });

  describe("chmod", () => {
    it("only allows +r flag", async () => {
      const s = state();
      s.rooms[START_PATH].files.push({ name: "locked.txt", x: 1, y: 1, glyph: "scroll", permissions: "locked" as const });
      const result = await runCommand("chmod -x locked.txt", s);
      expect(result.lines[0].kind).toBe("error");
      expect(result.lines[0].text).toContain("only +r is useful");
    });

    it("unlocks a locked file with +r", async () => {
      const s = state();
      s.rooms[START_PATH].files.push({ name: "locked.txt", x: 1, y: 1, glyph: "scroll", permissions: "locked" as const });
      const result = await runCommand("chmod +r locked.txt", s);
      expect(result.effect?.type).toBe("chmodFile");
      expect(result.effect?.fileName).toBe("locked.txt");
    });
  });

  describe("mv", () => {
    it("only allows moving to ~/inventory", async () => {
      const result = await runCommand("mv readme.txt /tmp", state());
      expect(result.lines[0].kind).toBe("error");
      expect(result.lines[0].text).toContain("only ~/inventory is a valid destination");
    });
  });

  describe("cp", () => {
    it("copies a file to inventory", async () => {
      const s = state();
      const result = await runCommand("cp readme.txt ~/inventory", s);
      expect(result.patch?.inventory.some(f => f.name === "readme.txt")).toBe(true);
    });

    it("copies a directory (room tree)", async () => {
      const s = state();
      // hallway exists in DEFAULT_ROOMS
      const result = await runCommand("cp hallway hallway_copy", s);
      expect(result.patch?.rooms[`${START_PATH}/hallway_copy`]).toBeDefined();
      expect(result.lines[0].text).toContain("copied directory hallway");
    });
  });

  describe("grep", () => {
    it("finds text in a specific file", async () => {
      const s = state();
      const result = await runCommand("grep adventurer readme.txt", s);
      expect(result.lines[0].text).toContain("Welcome, adventurer");
    });

    it("shows (no matches) when nothing is found", async () => {
      const s = state();
      const result = await runCommand("grep non-existent-string readme.txt", s);
      expect(result.lines[0].text).toContain("no matches");
    });
  });

  describe("find", () => {
    it("senses something hidden in the current room", async () => {
      const s = state();
      const result = await runCommand("find readme", s);
      expect(result.lines[0].text).toContain("sense something hidden");
      expect(result.lines[1].text).toContain("./readme.txt");
    });

    it("finds files in other rooms", async () => {
      const s = state();
      const result = await runCommand("find relic.txt", s);
      expect(result.lines.some(l => l.text.includes("hallway/antechamber/vault/relic.txt"))).toBe(true);
    });
  });
});
