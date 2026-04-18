import { describe, expect, it } from "vitest";
import { teachingForCommandInput } from "@/game/commandTeaching";

describe("commandTeaching", () => {
  it("returns short tips for supported commands", () => {
    expect(teachingForCommandInput("mv relic.txt ~/inventory")?.message).toContain("'mv'");
    expect(teachingForCommandInput("ls")?.message).toContain("'ls'");
  });

  it("ignores unsupported or empty input", () => {
    expect(teachingForCommandInput("pwd")).toBeNull();
    expect(teachingForCommandInput("")).toBeNull();
  });
});
