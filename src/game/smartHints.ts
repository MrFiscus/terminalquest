import { START_PATH } from "./dungeon";
import type { GameState, Room } from "./types";

export type HintMode = "light" | "direct";

const shortPath = (path: string) => path.replace(`${START_PATH}/`, "~/").replace(START_PATH, "~");

const roomWithFile = (rooms: Record<string, Room>, fileName: string) =>
  Object.values(rooms).find((room) => room.files.some((file) => file.name === fileName));

const nextStepToward = (currentPath: string, targetPath: string): string | null => {
  if (currentPath === targetPath) return null;
  if (targetPath.startsWith(`${currentPath}/`)) {
    return targetPath.slice(currentPath.length + 1).split("/")[0] || null;
  }
  return "..";
};

export function generateSmartHint(state: GameState, mode: HintMode = "light"): string {
  const room = state.rooms[state.cwd];
  if (!room) return "The dungeon goes silent. Type `pwd` to steady yourself.";

  const targetName = state.targetFile;
  const targetRoom = roomWithFile(state.rooms, targetName);
  const targetHere = room.files.some((file) => file.name === targetName);
  const hasTarget = state.inventory.some((file) => file.name === targetName);
  const commands = new Set(state.requiredCommands);

  if (hasTarget) {
    return `You already carry ${targetName}. The quest should now be complete.`;
  }

  if (targetHere) {
    return mode === "direct"
      ? `${targetName} is in ${room.name}. Use \`mv ${targetName} ~/inventory\` to carry it into your inventory.`
      : `${targetName} glimmers in this room. You will need \`mv\` when you are ready to claim it.`;
  }

  if (commands.has("mkdir") && mode === "direct" && room.doors.length <= 1) {
    return `This chamber needs a new path. Use \`mkdir <name>\` to create a folder-door, then explore it.`;
  }

  if (targetRoom) {
    const step = nextStepToward(state.cwd, targetRoom.path);
    if (mode === "direct" && step) {
      return step === ".."
        ? `${targetName} lies elsewhere, in ${targetRoom.name}. Use \`cd ..\` to backtrack toward ${shortPath(targetRoom.path)}.`
        : `${targetName} lies in ${targetRoom.name}. Use \`cd ${step}\` to move toward it.`;
    }

    if (commands.has("find")) {
      return `The relic is not in ${room.name}. Use \`find ${targetName}\` to reveal which path hides it.`;
    }

    return `The relic lies beyond this chamber. Use \`ls\` to study the doors, then \`cd\` toward ${targetRoom.name}.`;
  }

  if (room.files.length > 0 && commands.has("file")) {
    return `This room holds ${room.files[0].name}. Use \`file ${room.files[0].name}\` to learn what kind of relic it is.`;
  }

  if (room.doors.length > 0) {
    const door = room.doors.find((entry) => entry.target !== "..") ?? room.doors[0];
    return `No relic is visible in ${room.name}. Use \`ls\`, then \`cd ${door.target}\` to explore the next door.`;
  }

  return `No clear path remains here. Use \`cd ..\` to return, then search another room.`;
}
