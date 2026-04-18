import { describe, expect, it } from "vitest";
import { magicLineForCommandInput } from "@/game/commandMagic";

describe("commandMagic", () => {
  it("returns fantasy command feedback for supported commands", () => {
    expect(magicLineForCommandInput("ls")?.text).toContain("room reveals");
    expect(magicLineForCommandInput("mkdir vault")?.text).toContain("'mkdir'");
  });

  it("ignores unsupported and empty input", () => {
    expect(magicLineForCommandInput("pwd")).toBeNull();
    expect(magicLineForCommandInput("")).toBeNull();
  });
});
