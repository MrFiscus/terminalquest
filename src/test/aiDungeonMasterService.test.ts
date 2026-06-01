import { describe, expect, it } from "vitest";
import {
  buildGoalClarifierReply,
  classifyTerminalInput,
  fallbackDungeonMasterReply,
  isGoalClarifier,
} from "@/game/aiDungeonMasterService";

describe("aiDungeonMasterService", () => {
  it("splits command-like input from help-like input", () => {
    expect(classifyTerminalInput("sudo ls")).toBe("command-like");
    expect(classifyTerminalInput("grep treasure")).toBe("command-like");
    expect(classifyTerminalInput("abc123")).toBe("command-like");
    expect(classifyTerminalInput("i am lost")).toBe("help-like");
    expect(classifyTerminalInput("what does mv do")).toBe("help-like");
    expect(classifyTerminalInput("i am new to linux how does this work")).toBe("help-like");
  });

  it("answers beginner tutor fallbacks with Linux basics", () => {
    const reply = fallbackDungeonMasterReply("i am new to linux how does this work", "help-tutor", {
      goal: "Find victory.jpg and move it into your inventory.",
      winCondition: "mv victory.jpg ~/inventory",
      currentRoom: "Entry Hall",
    });

    expect(reply).toContain("Linux works");
    expect(reply).toContain("ls");
    expect(reply).toContain("cd");
    expect(reply).toContain("mv");
  });

  it("builds local goal clarifier replies from current objective", () => {
    expect(isGoalClarifier("what do i do")).toBe(true);
    expect(isGoalClarifier("what is my goal")).toBe(true);

    const reply = buildGoalClarifierReply({
      goal: "Find relic.txt and move it into your inventory.",
      requiredCommands: ["ls", "cd", "mv"],
      winCondition: "mv relic.txt ~/inventory",
      currentRoom: "Crypt",
    });

    expect(reply).toContain("relic.txt");
    expect(reply).toContain("mv relic.txt ~/inventory");
  });

  it("gives exact tutorial guidance in the Lantern Catacombs", () => {
    const reply = fallbackDungeonMasterReply("what command should i type next", "help-tutor", {
      tutorialId: "lantern-catacombs",
      tutorialProgress: {
        echoChildMet: true,
        cartographerMet: true,
        gateOpened: false,
      },
      currentPath: "/home/user/catacombs/entrance/hallway",
      currentRoom: "Bell Hallway",
      roomFiles: ["strange_bell.txt"],
      roomDoors: ["entrance", "sealed_gate(locked)"],
      recentCommands: ["pwd", "find bell", "cat strange_bell.txt"],
    });

    expect(reply).toContain("echo OPEN");
  });

  it("guides sealed gate inventory steps instead of using generic win text", () => {
    const reply = buildGoalClarifierReply({
      tutorialId: "lantern-catacombs",
      tutorialProgress: {
        elyraAskedWhoami: true,
      },
      currentPath: "/home/user/catacombs/entrance/hallway/sealed_gate",
      currentRoom: "Sealed Gate",
      roomFiles: ["lantern.key"],
      inventory: [],
    });

    expect(reply).toContain("mv lantern.key ~/inventory");
  });

  it("gives exact tutorial steps even for broad help questions", () => {
    const reply = fallbackDungeonMasterReply("i'm stuck", "help-tutor", {
      tutorialId: "lantern-catacombs",
      tutorialProgress: {
        echoChildMet: true,
        cartographerMet: true,
        gateOpened: true,
        elyraAskedWhoami: true,
      },
      currentPath: "/home/user/catacombs/entrance/hallway/sealed_gate",
      currentRoom: "Sealed Gate",
      inventory: [],
      roomFiles: ["lantern.key"],
    });

    expect(reply).toContain("mv lantern.key ~/inventory");
  });
});
