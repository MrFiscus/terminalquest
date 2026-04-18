import { findDoor, getRoom, resolvePath } from "../dungeon";
import { out, relativePath } from "./helpers";
import type { CommandDefinition } from "./types";
import { err } from "./helpers";

export const navigationCommands: CommandDefinition[] = [
  {
    name: "ls",
    description: "List files and directories in the current room.",
    usage: "ls",
    run: (_args, { room }) => {
      const entries = [
        ...room.doors.map((door) => `${door.target}/`),
        ...room.files.map((file) => file.name),
      ];
      const cells = [
        ...room.doors.map((door) => ({ x: door.x, y: door.y })),
        ...room.files.map((file) => ({ x: file.x, y: file.y })),
      ];
      return {
        lines: entries.length ? entries.map(out) : [out("(empty)")],
        vfx: { kind: "ls", cells, durationMs: 900 },
      };
    },
  },
  {
    name: "cd",
    description: "Change directory by entering a door.",
    usage: "cd <directory>",
    run: (args, { state, room }) => {
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
        door.target === ".." ? state.cwd.split("/").slice(0, -1).join("/") || "/" : `${state.cwd}/${door.target}`;
      if (!getRoom(state.rooms, nextPath)) {
        return { lines: [err(`cd: the door is sealed: ${arg}`)] };
      }
      return {
        lines: [out(`You approach the ${door.target === ".." ? "way back" : door.target} door...`)],
        walkTo: { x: door.x, y: door.y },
        effect: {
          type: "enterRoom",
          path: nextPath,
          from: door.target === ".." ? "child" : "parent",
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

      for (const searchRoom of Object.values(state.rooms)) {
        const rel = relativePath(state.cwd, searchRoom.path);
        for (const file of searchRoom.files) {
          if (!file.name.includes(name)) continue;
          hits.push(`${rel}/${file.name}`.replace(/^\.\//, "./"));
          if (searchRoom.path === state.cwd) cells.push({ x: file.x, y: file.y });
        }
        for (const door of searchRoom.doors) {
          if (!door.target.includes(name)) continue;
          hits.push(`${rel}/${door.target}/`.replace(/^\.\//, "./"));
          if (searchRoom.path === state.cwd) cells.push({ x: door.x, y: door.y });
        }
      }

      return {
        lines: hits.length ? [out("You sense something hidden..."), ...hits.map(out)] : [out(`(no matches in ${room.name})`)],
        vfx: cells.length ? { kind: "find", cells, durationMs: 2200 } : undefined,
      };
    },
  },
];

