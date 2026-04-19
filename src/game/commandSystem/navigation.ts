import { findDoor, getRoom, isWalkable, resolvePath, pathfind } from "../dungeon";
import { out, relativePath } from "./helpers";
import type { CommandDefinition } from "./types";
import { err } from "./helpers";
import type { CommandResult } from "../types";

function insideDoorStop(room: { width: number; height: number }, door: { x: number; y: number }) {
  if (door.x === 0) return { x: 1, y: door.y };
  if (door.x === room.width - 1) return { x: room.width - 2, y: door.y };
  if (door.y === 0) return { x: door.x, y: 1 };
  if (door.y === room.height - 1) return { x: door.x, y: room.height - 2 };
  return { x: door.x, y: door.y };
}

function blockedDoorStop(room: Parameters<typeof isWalkable>[0], door: { x: number; y: number }) {
  const inside = insideDoorStop(room, door);
  const away = {
    x: inside.x + Math.sign(inside.x - door.x),
    y: inside.y + Math.sign(inside.y - door.y),
  };
  if (isWalkable(room, away.x, away.y)) return away;
  if (isWalkable(room, inside.x, inside.y)) return inside;
  return undefined;
}

export const navigationCommands: CommandDefinition[] = [
  {
    name: "ls",
    description: "List files and directories in the current room.",
    usage: "ls",
    run: (_args, { room }) => {
      const entries = [
        ...room.doors.map((door) =>
          door.broken
            ? "broken door"
            : door.locked
              ? `[locked] ${door.target}/`
              : `${door.target}/`,
        ),
        ...room.files.map((file) => file.name),
        ...(room.npcs || []).map((npc) => npc.name),
      ];
      const cells = [
        ...room.doors.map((door) => ({ x: door.x, y: door.y })),
        ...room.files.map((file) => ({ x: file.x, y: file.y })),
        ...(room.npcs || []).map((npc) => ({ x: npc.x, y: npc.y })),
      ];
      return {
        lines: entries.length ? entries.map(out) : [out("(empty)")],
        vfx: { kind: "ls", cells, durationMs: 5000 },
      };
    },
  },
  {
    name: "cd",
    description: "Change directory by entering a door.",
    usage: "cd <directory>",
    run: (args, { state, room }) => {
      console.log(
        "[cd] current room doors:",
        state.rooms[state.cwd]?.doors.map((d) => `${d.target}(locked=${d.locked})`),
      );
      const arg = args[0];
      if (!arg) return { lines: [err("cd: missing argument")] };
      const targetPath = resolvePath(state.cwd, arg);
      let doorTarget: string | undefined;
      if (arg === "..") doorTarget = "..";
      else if (!arg.includes("/")) doorTarget = arg;
      else {
        const last = targetPath.split("/").pop() || "";
        if (findDoor(room, last)) doorTarget = last;
      }
      const door = doorTarget ? findDoor(room, doorTarget) : undefined;
      if (!door) return { lines: [err(`cd: no such door: ${arg}`)] };

      const nextPath =
        door.toPath ??
        (door.target === ".." ? state.cwd.split("/").slice(0, -1).join("/") || "/" : `${state.cwd}/${door.target}`);
      if (!getRoom(state.rooms, nextPath)) {
        return { lines: [err(`cd: the door is sealed: ${arg}`)] };
      }

      // Re-read the door from live state.rooms so we never act on a stale room reference.
      const liveDoor = state.rooms[state.cwd]?.doors.find((d) => d.target === door.target) ?? door;
      console.log(`[cd] entering "${liveDoor.target}" | locked=${liveDoor.locked} | requiredKey=${liveDoor.requiredKey} | inventory=[${state.inventory.map((f) => f.name).join(",")}]`);

      let unlockPatch: CommandResult["patch"];
      if (liveDoor.blockedBy) {
        const blocker = room.files.find((file) => file.name === liveDoor.blockedBy && file.type === "blocker");
        if (blocker) {
          return {
            lines: [err("A heavy stone blocks the way.")],
            walkTo: { x: blocker.x, y: blocker.y },
          };
        }
      }
      if (liveDoor.broken) {
        return {
          lines: [err("The door is broken. You need to repair it.")],
          walkTo: blockedDoorStop(room, liveDoor),
        };
      }
      const mauBlocker = (room.npcs ?? []).find((npc) => npc.id === "mau" && npc.blocksDoorTarget === liveDoor.target);
      if (mauBlocker) {
        const stopAt = [
          { x: mauBlocker.x, y: mauBlocker.y + 1 },
          { x: mauBlocker.x - 1, y: mauBlocker.y },
          { x: mauBlocker.x + 1, y: mauBlocker.y },
          { x: mauBlocker.x, y: mauBlocker.y - 1 },
        ].find((candidate) => isWalkable(room, candidate.x, candidate.y)) ?? { x: liveDoor.x, y: liveDoor.y };
        return {
          lines: [err("Mau blocks your path. Speak with Mau first.")],
          walkTo: stopAt,
        };
      }
      if (liveDoor.locked && liveDoor.requiredKey) {
        const hasKey = state.inventory.some((f) => f.name === liveDoor.requiredKey);
        console.log(`[cd] lock check: hasKey=${hasKey}`);
        if (!hasKey) {
          return {
            lines: [err(`The door is locked. You need a key to enter.`)],
            walkTo: blockedDoorStop(room, liveDoor),
          };
        }
        const liveRoom = state.rooms[state.cwd];
        if (liveRoom) {
          unlockPatch = {
            rooms: {
              ...state.rooms,
              [state.cwd]: {
                ...liveRoom,
                doors: liveRoom.doors.map((d) =>
                  d.target === liveDoor.target ? { ...d, locked: false } : d,
                ),
              },
            },
          };
        }
      }

      const isUnlocking = !!(liveDoor.locked && liveDoor.requiredKey);
      const approachText = isUnlocking
        ? `You use the ${liveDoor.requiredKey}. The door creaks open...`
        : `You approach the ${door.target === ".." ? "way back" : door.target} door...`;

      console.log("[cd] isUnlocking=", isUnlocking);
      console.log("[cd] liveDoor.locked=", liveDoor.locked);
      console.log("[cd] liveDoor.requiredKey=", liveDoor.requiredKey);

      return {
        lines: [out(approachText)],
        walkTo: { x: liveDoor.x, y: liveDoor.y },
        patch: unlockPatch,
        effect: {
          type: "enterRoom",
          path: nextPath,
          from: door.target === ".." ? "child" : "parent",
          wasLocked: isUnlocking,
          requiredKey: liveDoor.requiredKey,
        },
      };
    },
  },
  {
    name: "find",
    description: "Search rooms for files or directories by name.",
    usage: "find <name>",
    run: (args, { state, room }) => {
      const name = args[0];
      if (!name) return { lines: [err("find: missing pattern")] };
      const hits: string[] = [];
      const cells: { x: number; y: number }[] = [];
      let walkTo: { x: number; y: number } | undefined;

      for (const searchRoom of Object.values(state.rooms)) {
        const rel = relativePath(state.cwd, searchRoom.path);
        const isCurrentRoom = searchRoom.path === state.cwd;

        for (const file of searchRoom.files) {
          if (!file.name.includes(name)) continue;
          hits.push(`${rel}/${file.name}`.replace(/^\.\//, "./"));
          if (isCurrentRoom) {
            cells.push({ x: file.x, y: file.y });
            const currentRoom = state.rooms[state.cwd] ?? room;
            const candidates = [
              { x: file.x, y: file.y - 1 },
              { x: file.x + 1, y: file.y },
              { x: file.x - 1, y: file.y },
              { x: file.x, y: file.y + 1 },
            ];
            const stopAt = candidates.find((candidate) =>
              isWalkable(currentRoom, candidate.x, candidate.y),
            ) ?? { x: file.x, y: file.y };
            const path = pathfind(currentRoom, state.player, stopAt);
            if (path) cells.push(...path);
            walkTo = stopAt;
          }
        }
        for (const door of searchRoom.doors) {
          if (!door.target.includes(name)) continue;
          hits.push(`${rel}/${door.target}/`.replace(/^\.\//, "./"));
          if (isCurrentRoom) {
            cells.push({ x: door.x, y: door.y });
            const path = pathfind(room, state.player, { x: door.x, y: door.y });
            if (path) cells.push(...path);
          }
        }
        for (const npc of (searchRoom.npcs || [])) {
          if (!npc.name.toLowerCase().includes(name.toLowerCase())) continue;
          hits.push(`${rel}/${npc.name}`.replace(/^\.\//, "./"));
          if (isCurrentRoom) {
            cells.push({ x: npc.x, y: npc.y });

            // Special Case: Walk to Mau specifically
            if (npc.id === "mau") {
              const currentRoom = state.rooms[state.cwd] ?? room;
              const candidates = [
                { x: npc.x, y: npc.y - 1 },
                { x: npc.x + 1, y: npc.y },
                { x: npc.x - 1, y: npc.y },
                { x: npc.x, y: npc.y + 1 },
              ];
              const stopAt = candidates.find((candidate) =>
                isWalkable(currentRoom, candidate.x, candidate.y),
              ) ?? { x: npc.x, y: npc.y };
              const path = pathfind(currentRoom, state.player, stopAt);
              if (path) cells.push(...path);
              walkTo = stopAt;
            } else {
              const path = pathfind(room, state.player, { x: npc.x, y: npc.y });
              if (path) cells.push(...path);
            }
          }
        }
      }

      return {
        lines: hits.length ? [out("You sense something hidden..."), ...hits.map(out)] : [out(`(no matches in ${room.name})`)],
        vfx: cells.length ? { kind: "find", cells, durationMs: 2200 } : undefined,
        walkTo,
      };
    },
  },
];
