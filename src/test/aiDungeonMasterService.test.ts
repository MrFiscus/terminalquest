import { describe, expect, it } from "vitest";
import {
  classifyTerminalInput,
  fallbackDungeonMasterReply,
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
});
