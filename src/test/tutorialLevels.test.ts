import { describe, expect, it } from "vitest";
import { createLanternCatacombsLevel, LANTERN_CATACOMBS_ID, LANTERN_PATHS } from "@/game/tutorialLevels";

describe("Lantern Catacombs tutorial level", () => {
  it("builds a normal GeneratedLevel with the expected start path and command curriculum", () => {
    const level = createLanternCatacombsLevel(18);

    expect(level.tutorialId).toBe(LANTERN_CATACOMBS_ID);
    expect(level.startPath).toBe(LANTERN_PATHS.entrance);
    expect(level.required).toEqual(["help", "ls", "echo", "cat", "cd", "pwd", "find", "man", "whoami", "mv"]);
    expect(level.goal).toMatch(/lantern\.key/i);
    expect(level.targetFile).toBe("lantern.key");
    expect(level.winCondition).toMatch(/cd sanctum/i);
  });

  it("locks the echo gate and sanctum gate with the intended conditions", () => {
    const level = createLanternCatacombsLevel(18);
    const hallwayDoor = level.roomMap[LANTERN_PATHS.hallway]?.doors.find((door) => door.target === "sealed_gate");
    const sanctumDoor = level.roomMap[LANTERN_PATHS.sealedGate]?.doors.find((door) => door.target === "sanctum");

    expect(hallwayDoor?.locked).toBe(true);
    expect(sanctumDoor?.locked).toBe(true);
    expect(sanctumDoor?.requiredKey).toBe("lantern.key");
  });
});
