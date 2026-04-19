import { INVENTORY_PATH, TARGET_FILE, findFile, resolvePath } from "../dungeon";
import { addDoorToRoom } from "../generator";
import type { Room } from "../types";
import {
  baseName,
  cloneFile,
  currentFile,
  err,
  findOpenFloor,
  isSafeName,
  out,
  resolveDestinationRoom,
  uniqueName,
} from "./helpers";
import type { CommandDefinition } from "./types";

function describeFile(name: string, fileType?: "key") {
  if (fileType === "key") return "iron key, ancient and heavy";
  const ext = name.includes(".") ? name.split(".").pop() : "";
  if (ext === "jpg") return "JPEG image data, ancient";
  if (ext === "txt") return "ASCII text, scrawled";
  if (ext === "key") return "iron key, ancient and heavy";
  return "data, mysterious";
}

function copyRoomTree(rooms: Record<string, Room>, fromPath: string, toPath: string, newName: string) {
  const next = { ...rooms };
  for (const [path, room] of Object.entries(rooms)) {
    if (path !== fromPath && !path.startsWith(`${fromPath}/`)) continue;
    const copiedPath = path.replace(fromPath, toPath);
    const isRoot = path === fromPath;
    next[copiedPath] = {
      ...room,
      path: copiedPath,
      name: isRoot ? newName : room.name,
      files: room.files.map((file) => ({ ...file })),
      doors: room.doors.map((door) => ({ ...door })),
      tiles: room.tiles.map((tile) => ({ ...tile })),
      decor: room.decor?.map((item) => ({ ...item })),
      spawn: { ...room.spawn },
      returnSpawn: room.returnSpawn ? { ...room.returnSpawn } : undefined,
    };
  }
  return next;
}

export const fileCommands: CommandDefinition[] = [
  {
    name: "cat",
    description: "Display the contents of a file.",
    usage: "cat <file>",
    run: (args, { state, room }) => {
      const name = args[0];
      if (!name) return { lines: [err("cat: missing file")] };
      const file = currentFile(state, room, name);
      if (!file) return { lines: [err(`cat: ${name}: no such file`)] };
      const body = file.contents ?? "(empty file)";
      return {
        lines: body.split("\n").map(out),
        popup: { title: name, body },
      };
    },
  },
  {
    name: "file",
    description: "Inspect a file and show its type.",
    usage: "file <name>",
    run: (args, { room }) => {
      const name = args[0];
      if (!name) return { lines: [err("file: missing name")] };
      const file = findFile(room, name);
      if (!file) return { lines: [err(`file: ${name}: not found`)] };
      return {
        lines: [out(`${name}: ${describeFile(name, file.type)}`)],
        vfx: { kind: "inspect", cells: [{ x: file.x, y: file.y }], durationMs: 1600 },
      };
    },
  },
  {
    name: "touch",
    description: "Create an empty file in the current directory.",
    usage: "touch <file>",
    run: (args, { state, room }) => {
      const name = args[0];
      if (!name) return { lines: [err("touch: missing file operand")] };
      if (!isSafeName(name)) return { lines: [err(`touch: invalid file name '${name}'`)] };
      if (findFile(room, name)) return { lines: [out(`touch: refreshed ${name}`)] };
      const pos = findOpenFloor(room, state, name);
      if (!pos) return { lines: [err("touch: no open floor for a new file")] };
      const newRoom = {
        ...room,
        files: [...room.files, { name, contents: "", glyph: "scroll", x: pos.x, y: pos.y }],
      };
      return {
        lines: [out(`created ${name}`)],
        patch: { rooms: { ...state.rooms, [room.path]: newRoom } },
        vfx: { kind: "manifest", cells: [pos], durationMs: 1000 },
      };
    },
  },
  {
    name: "cp",
    description: "Copy a file, or copy a visible directory to a new name.",
    usage: "cp <source> <destination>",
    run: (args, { state, room }) => {
      const [source, dest] = args;
      if (!source || !dest) return { lines: [err("cp: usage: cp <source> <destination>")] };

      const sourceFile = currentFile(state, room, source);
      if (sourceFile) {
        const destinationRoom = resolveDestinationRoom(state, room, dest);
        if (destinationRoom === "inventory") {
          const name = uniqueName(state.inventory.map((file) => file.name), sourceFile.name);
          return {
            lines: [out(`copied ${sourceFile.name} to ~/inventory`)],
            patch: { inventory: [...state.inventory, cloneFile(sourceFile, sourceFile, name)] },
          };
        }
        if (destinationRoom) {
          const pos = findOpenFloor(destinationRoom, state, sourceFile.name);
          if (!pos) return { lines: [err(`cp: ${destinationRoom.name}: no open floor`)] };
          const name = uniqueName(destinationRoom.files.map((file) => file.name), sourceFile.name);
          const copiedRoom = {
            ...destinationRoom,
            files: [...destinationRoom.files, cloneFile(sourceFile, pos, name)],
          };
          return {
            lines: [out(`copied ${sourceFile.name} to ${destinationRoom.path}`)],
            patch: { rooms: { ...state.rooms, [destinationRoom.path]: copiedRoom } },
          };
        }

        const newName = baseName(dest);
        if (!isSafeName(newName)) return { lines: [err(`cp: invalid destination '${dest}'`)] };
        const pos = findOpenFloor(room, state, newName);
        if (!pos) return { lines: [err("cp: no open floor for copy")] };
        const safeName = uniqueName(room.files.map((file) => file.name), newName);
        const newRoom = { ...room, files: [...room.files, cloneFile(sourceFile, pos, safeName)] };
        return {
          lines: [out(`copied ${sourceFile.name} to ${safeName}`)],
          patch: { rooms: { ...state.rooms, [room.path]: newRoom } },
        };
      }

      const sourcePath = resolvePath(state.cwd, source);
      const sourceRoom = state.rooms[sourcePath] ?? state.rooms[`${state.cwd}/${source}`];
      const destName = baseName(dest);
      const destPath = `${state.cwd}/${destName}`;
      if (!sourceRoom) return { lines: [err(`cp: ${source}: no such file or directory`)] };
      if (!isSafeName(destName)) return { lines: [err(`cp: invalid destination '${dest}'`)] };
      if (state.rooms[destPath]) return { lines: [err(`cp: '${destName}' already exists`)] };
      const roomWithDoor = addDoorToRoom(room, destName);
      if (!roomWithDoor) return { lines: [err("cp: no wall space for copied directory")] };
      const rooms = copyRoomTree(state.rooms, sourceRoom.path, destPath, destName);
      rooms[room.path] = roomWithDoor;
      return {
        lines: [out(`copied directory ${source} to ${destName}/`)],
        patch: { rooms },
      };
    },
  },
  {
    name: "grep",
    description: "Search for plain text inside files.",
    usage: "grep <text> [file]",
    run: (args, { state, room }) => {
      const needle = args[0];
      const fileName = args[1];
      if (!needle) return { lines: [err("grep: missing search text")] };
      const files = fileName ? [currentFile(state, room, fileName)].filter(Boolean) : room.files;
      if (fileName && !files.length) return { lines: [err(`grep: ${fileName}: no such file`)] };
      const matches: string[] = [];
      for (const file of files) {
        const body = file?.contents ?? "";
        const lines = body.split("\n");
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(needle.toLowerCase())) {
            matches.push(`${file.name}:${index + 1}: ${line}`);
          }
        });
      }
      return { lines: matches.length ? matches.map(out) : [out("(no matches)")] };
    },
  },
  {
    name: "rm",
    description: "Remove a file from the current directory.",
    usage: "rm <file>",
    run: (args, { state, room }) => {
      const name = args[0];
      if (!name) return { lines: [err("rm: missing operand")] };
      const file = findFile(room, name);
      if (!file) return { lines: [err(`rm: ${name}: no such file`)] };
      if (name === state.targetFile) return { lines: [err(`rm: ${name}: the relic resists destruction`)] };
      const newRoom = { ...room, files: room.files.filter((item) => item.name !== name) };
      return {
        lines: [out(`You smash '${name}' into nothing.`)],
        patch: { rooms: { ...state.rooms, [room.path]: newRoom } },
        vfx: { kind: "rm", cells: [{ x: file.x, y: file.y }], durationMs: 1100 },
      };
    },
  },
  {
    name: "mv",
    description: "Move a file. In this dungeon, move loot into inventory.",
    usage: "mv <file> ~/inventory",
    run: (args, { state, room }) => {
      const fileArg = args[0];
      const dest = args[1];
      console.log(`[mv] win check triggered by file="${fileArg ?? ""}"`);
      if (!fileArg || !dest) return { lines: [err("mv: usage: mv <file> ~/inventory")] };
      const destResolved = resolvePath(state.cwd, dest);
      if (destResolved !== INVENTORY_PATH) return { lines: [err("mv: only ~/inventory is a valid destination")] };
      const file = findFile(room, fileArg);
      if (!file) return { lines: [err(`mv: ${fileArg}: no such file`)] };
      const pickupEffect = { type: "pickup" as const, fileName: fileArg };
      if (file.name !== state.targetFile) {
        console.log(`[mv] file="${fileArg}" targetFile="${state.targetFile}" type="${file.type}" isWin=false`);
        return {
          lines: [out(`You stride toward '${fileArg}'...`)],
          walkTo: { x: file.x, y: file.y },
          effect: pickupEffect,
        };
      }
      // Key items must never trigger victory — they are tools, not relics.
      const isWin = file.name === TARGET_FILE && state.targetFile === TARGET_FILE && file.type !== "key";
      console.log(`[mv] file="${fileArg}" targetFile="${state.targetFile}" type="${file.type}" isWin=${isWin}`);
      return {
        lines: [out(`You stride toward '${fileArg}'...`)],
        walkTo: { x: file.x, y: file.y },
        effect: isWin ? { type: "win", fileName: fileArg } : pickupEffect,
      };
    },
  },
];
