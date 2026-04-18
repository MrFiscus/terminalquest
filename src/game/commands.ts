import {
  INVENTORY_PATH,
  findDoor,
  findFile,
  getRoom,
  resolvePath,
} from "./dungeon";
import { addDoorToRoom, generateRoom } from "./generator";
import {
  generateAIRoomBlueprint,
  glyphForBlueprintItem,
} from "./aiRoomGeneration";
import { getWeakCommands } from "./adaptiveDungeon";
import { generateSmartHint } from "./smartHints";
import type { CommandResult, GameState } from "./types";

function out(text: string): CommandResult["lines"][number] {
  return { kind: "output", text };
}
function err(text: string): CommandResult["lines"][number] {
  return { kind: "error", text };
}
function dm(text: string): CommandResult["lines"][number] {
  return { kind: "dm", text };
}

const relativePath = (from: string, to: string) => {
  if (to === from) return ".";
  if (to.startsWith(`${from}/`)) return `.${to.slice(from.length)}`;
  return to;
};

export async function runCommand(raw: string, state: GameState): Promise<CommandResult> {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };

  const [cmd, ...args] = trimmed.split(/\s+/);
  const room = getRoom(state.rooms, state.cwd);
  if (!room) return { lines: [err("The void surrounds you. (room missing)")] };

  switch (cmd) {
    case "help":
      return {
        lines: [
          out("Available commands:"),
          out("  ls                     list files & doors here"),
          out("  cd <dir>               enter a door (folder)"),
          out("  pwd                    print current room path"),
          out("  cat <file>             read a scroll"),
          out("  file <name>            inspect an item"),
          out("  find <name>            track a name"),
          out("  mkdir <name>           manifest a directory"),
          out("  rm <name>              vanish a file"),
          out("  mv <file> ~/inventory  pick up a file"),
          out("  hint                   get a contextual nudge"),
          out("  clear                  clear the terminal"),
          out("  help                   this list"),
          out(""),
          out(`Goal: ${state.winCondition}`),
          dm(`Hint: ${generateSmartHint(state, "light")}`),
        ],
      };

    case "hint":
      return {
        lines: [dm(`Hint: ${generateSmartHint(state, "direct")}`)],
      };

    case "clear":
      return { lines: [], clear: true };

    case "pwd":
      return {
        lines: [out(state.cwd)],
        vfx: { kind: "pwd", cells: [{ x: state.player.x, y: state.player.y }], durationMs: 1400 },
      };

    case "ls": {
      const entries = [
        ...room.doors.map((d) => `${d.target}/`),
        ...room.files.map((f) => f.name),
      ];
      const cells = [
        ...room.doors.map((d) => ({ x: d.x, y: d.y })),
        ...room.files.map((f) => ({ x: f.x, y: f.y })),
      ];
      return {
        lines: entries.length ? entries.map(out) : [out("(empty)")],
        vfx: { kind: "ls", cells, durationMs: 900 },
      };
    }

    case "cd": {
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
    }

    case "cat": {
      const name = args[0];
      if (!name) return { lines: [err("cat: missing file")] };
      const f = findFile(room, name) ?? state.inventory.find((it) => it.name === name);
      if (!f) return { lines: [err(`cat: ${name}: no such file`)] };
      const body = f.contents ?? "(empty file)";
      return {
        lines: body.split("\n").map(out),
        popup: { title: name, body },
      };
    }

    case "file": {
      const name = args[0];
      if (!name) return { lines: [err("file: missing name")] };
      const f = findFile(room, name);
      if (!f) return { lines: [err(`file: ${name}: not found`)] };
      const ext = name.includes(".") ? name.split(".").pop() : "";
      const desc = ext === "jpg" ? "JPEG image data, ancient" : ext === "txt" ? "ASCII text, scrawled" : "data, mysterious";
      return {
        lines: [out(`${name}: ${desc}`)],
        vfx: { kind: "inspect", cells: [{ x: f.x, y: f.y }], durationMs: 1600 },
      };
    }

    case "find": {
      const name = args[0];
      if (!name) return { lines: [err("find: missing pattern")] };
      const hits: string[] = [];
      const cells: { x: number; y: number }[] = [];

      for (const searchRoom of Object.values(state.rooms)) {
        const rel = relativePath(state.cwd, searchRoom.path);
        for (const f of searchRoom.files) {
          if (!f.name.includes(name)) continue;
          hits.push(`${rel}/${f.name}`.replace(/^\.\//, "./"));
          if (searchRoom.path === state.cwd) cells.push({ x: f.x, y: f.y });
        }
        for (const d of searchRoom.doors) {
          if (!d.target.includes(name)) continue;
          hits.push(`${rel}/${d.target}/`.replace(/^\.\//, "./"));
          if (searchRoom.path === state.cwd) cells.push({ x: d.x, y: d.y });
        }
      }

      return {
        lines: hits.length ? hits.map(out) : [out(`(no matches in ${room.name})`)],
        vfx: cells.length ? { kind: "find", cells, durationMs: 2200 } : undefined,
      };
    }

    case "mkdir": {
      const name = args[0];
      if (!name) return { lines: [err("mkdir: missing name")] };
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) return { lines: [err(`mkdir: invalid name '${name}'`)] };
      const childPath = `${state.cwd}/${name}`;
      if (state.rooms[childPath] || findDoor(room, name)) {
        return { lines: [err(`mkdir: '${name}' already exists`)] };
      }

      const currentWithDoor = addDoorToRoom(room, name);
      if (!currentWithDoor) return { lines: [err("mkdir: no wall space for another door")] };

      const blueprint = await generateAIRoomBlueprint({
        roomName: name,
        currentPath: state.cwd,
        weakCommands: getWeakCommands(state.commandStats, 4),
        recentMistakes: state.recentMistakes,
        difficulty: "normal",
      });
      const childRoom = generateRoom({
        path: childPath,
        name,
        description: blueprint.goal,
        hasParent: true,
        exits: blueprint.visibleExits.map((exit) => exit.name),
        files: blueprint.visibleItems.map((item) => ({
          name: item.name,
          glyph: glyphForBlueprintItem(item),
          contents: `${blueprint.goal}\n\nHint: ${blueprint.hint}`,
        })),
      });
      const nextRooms = {
        ...state.rooms,
        [state.cwd]: currentWithDoor,
        [childPath]: childRoom,
      };
      for (const exit of blueprint.visibleExits) {
        const exitPath = `${childPath}/${exit.name}`;
        if (nextRooms[exitPath]) continue;
        nextRooms[exitPath] = generateRoom({
          path: exitPath,
          name: exit.name,
          description: `A quiet chamber beyond ${name}.`,
          hasParent: true,
          exits: [],
          files: [],
        });
      }

      const newDoor = currentWithDoor.doors.find((door) => door.target === name);
      return {
        lines: [
          out(`You carve '${name}' into the wall, and a directory door opens.`),
          dm(`Dungeon Master: ${blueprint.hint}`),
        ],
        patch: { rooms: nextRooms },
        vfx: newDoor ? { kind: "manifest", cells: [{ x: newDoor.x, y: newDoor.y }], durationMs: 1400 } : undefined,
      };
    }

    case "rm": {
      const name = args[0];
      if (!name) return { lines: [err("rm: missing operand")] };
      const f = findFile(room, name);
      if (!f) return { lines: [err(`rm: ${name}: no such file`)] };
      if (name === state.targetFile) {
        return { lines: [err(`rm: ${name}: the relic resists destruction`)] };
      }
      const newRoom = { ...room, files: room.files.filter((x) => x.name !== name) };
      return {
        lines: [out(`You smash '${name}' into nothing.`)],
        patch: { rooms: { ...state.rooms, [room.path]: newRoom } },
        vfx: { kind: "rm", cells: [{ x: f.x, y: f.y }], durationMs: 1100 },
      };
    }

    case "mv": {
      const fileArg = args[0];
      const dest = args[1];
      if (!fileArg || !dest) return { lines: [err("mv: usage: mv <file> ~/inventory")] };
      const destResolved = resolvePath(state.cwd, dest);
      if (destResolved !== INVENTORY_PATH) {
        return { lines: [err("mv: only ~/inventory is a valid destination")] };
      }
      const f = findFile(room, fileArg);
      if (!f) return { lines: [err(`mv: ${fileArg}: no such file`)] };
      return {
        lines: [out(`You stride toward '${fileArg}'...`)],
        walkTo: { x: f.x, y: f.y },
        effect:
          fileArg === state.targetFile
            ? { type: "win" }
            : { type: "pickup", fileName: fileArg },
      };
    }

    default:
      return { lines: [], unknown: trimmed };
  }
}
