import { INVENTORY_PATH, findFile, resolvePath } from "../dungeon";
import { addDoorToRoom } from "../generator";
import { mauKeyQuizForDoor, mauQuizForMechanic } from "../difficultyMechanics";
import type { Room } from "../types";
import {
  baseName,
  cloneFile,
  currentFile,
  dm,
  err,
  findOpenFloor,
  isSafeName,
  out,
  resolveDestinationRoom,
  uniqueName,
} from "./helpers";
import type { CommandDefinition } from "./types";

function describeFile(name: string, fileType?: "key" | "blocker") {
  if (fileType === "key") return "iron key, ancient and heavy";
  if (fileType === "blocker") return "stone blocker, heavy and immovable";
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
    run: (args, context) => {
      const { state, room, startMauQuiz, openScroll } = context;
      const name = args[0];
      if (!name) return { lines: [err("cat: missing file")] };

      // Mau Easter Egg
      if (name.toLowerCase() === "mau") {
        const mau = (room.npcs || []).find(n => n.id === "mau");
        if (mau) {
          if (state.mechanic === "chmod" && mau.blocksDoorTarget && state.mauSecretKnown) {
            startMauQuiz(mauKeyQuizForDoor(mau.blocksDoorTarget));
          } else if (state.mechanic) {
            startMauQuiz(mauQuizForMechanic(state.mechanic));
          }
          return {
            lines: [
              dm("Dungeon Master: Mau purrs loudly as you attempt to read his contents. Mau is not a file, but he appreciates the attention."),
            ],
            vfx: { kind: "inspect", cells: (room.npcs || []).filter(n => n.id === "mau").map(n => ({ x: n.x, y: n.y })), durationMs: 2000 }
          };
        }
      }

      const file = currentFile(state, room, name);
      if (!file) return { lines: [err(`cat: ${name}: no such file`)] };
      if (file.permissions === "locked") {
        return { lines: [err(`Permission denied. Use chmod +r ${file.name} to unlock.`)] };
      }
      
      // Visual Scroll implementation
      const shouldOpenScrollView =
        file.contents &&
        (file.name.toLowerCase().includes("scroll") ||
          file.name.toLowerCase() === "readme.txt" ||
          file.name.toLowerCase().endsWith(".txt"));
      if (shouldOpenScrollView) {
        openScroll(file.name, file.contents);
      }

      // Special win condition for Mau's Secret Vault
      if (file.name === "relic.txt" && room.name === "Mau's Secret Vault") {
        return {
          lines: [dm("Dungeon Master: As you read the relic, the room begins to glow with an otherworldly light.")],
          effect: { type: "win", fileName: "relic.txt" }
        };
      }

      const body = file.contents ?? "(empty file)";
      return {
        lines: body.split("\n").map(out),
        popup: shouldOpenScrollView ? undefined : { title: name, body },
        patch: file.name === "scroll" && file.permissions === "readable" ? { mauSecretKnown: true } : undefined,
      };
    },
  },
  {
    name: "file",
    description: "Inspect a file and show its type.",
    usage: "file <name>",
    run: (args, { state, room }) => {
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
            vfx: { kind: "manifest", cells: [{ x: sourceFile.x, y: sourceFile.y }], durationMs: 1100 },
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
            vfx: { kind: "manifest", cells: [{ x: sourceFile.x, y: sourceFile.y }], durationMs: 1100 },
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
          vfx: { kind: "manifest", cells: [pos, { x: sourceFile.x, y: sourceFile.y }], durationMs: 1300 },
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
      const cells: { x: number; y: number }[] = [];
      for (const file of files) {
        const body = file?.contents ?? "";
        const lines = body.split("\n");
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(needle.toLowerCase())) {
            matches.push(`${file.name}:${index + 1}: ${line}`);
            if (file) cells.push({ x: file.x, y: file.y });
          }
        });
      }
      return {
        lines: matches.length ? matches.map(out) : [out("(no matches)")],
        vfx: cells.length ? { kind: "find", cells, durationMs: 1800 } : undefined,
      };
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
      if (name === state.targetFile) return { lines: [err(`rm: ${name}: the objective resists destruction`)] };
      return {
        lines: [dm(`Dungeon Master: You raise your hand toward '${name}'.`)],
        vfx: { kind: "rm", cells: [{ x: file.x, y: file.y }], durationMs: 1100 },
        effect: { type: "removeFile", fileName: name },
      };
    },
  },
  {
    name: "chmod",
    description: "Change file permissions.",
    usage: "chmod +r <file>",
    run: (args, { room }) => {
      const [flag, name] = args;
      if (!flag || !name) return { lines: [err("chmod: usage: chmod +r <file>")] };
      if (flag !== "+r") return { lines: [err("chmod: only +r is useful here")] };
      const file = findFile(room, name);
      if (!file) return { lines: [err(`chmod: ${name}: no such file`)] };
      if (file.permissions !== "locked") return { lines: [out(`${name} is already readable.`)] };
      return {
        lines: [dm(`Dungeon Master: You grant read permission to ${name}.`)],
        vfx: { kind: "inspect", cells: [{ x: file.x, y: file.y }], durationMs: 1200 },
        effect: { type: "chmodFile", fileName: name },
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
          lines: [dm(`Dungeon Master: You stride toward '${fileArg}'.`)],
          walkTo: { x: file.x, y: file.y },
          effect: pickupEffect,
        };
      }
      // Key items must never trigger victory — they are tools, not relics.
      const isWin = file.name === state.targetFile && file.type !== "key";
      console.log(`[mv] file="${fileArg}" targetFile="${state.targetFile}" type="${file.type}" isWin=${isWin}`);
      return {
        lines: [dm(`Dungeon Master: You stride toward '${fileArg}'.`)],
        walkTo: { x: file.x, y: file.y },
        effect: isWin ? { type: "win", fileName: fileArg } : pickupEffect,
      };
    },
  },
];
