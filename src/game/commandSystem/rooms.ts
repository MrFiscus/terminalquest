import { getWeakCommands } from "../adaptiveDungeon";
import { generateAIRoomBlueprint, glyphForBlueprintItem } from "../aiRoomGeneration";
import { addDoorToRoom, generateRoom } from "../generator";
import { dm, err, isSafeName, out } from "./helpers";
import type { CommandDefinition } from "./types";

export const roomCommands: CommandDefinition[] = [
  {
    name: "mkdir",
    description: "Create a new directory connected by a door.",
    usage: "mkdir <name>",
    run: async (args, { state, room }) => {
      const name = args[0];
      if (!name) return { lines: [err("mkdir: missing name")] };
      if (!isSafeName(name)) return { lines: [err(`mkdir: invalid name '${name}'`)] };
      const childPath = `${state.cwd}/${name}`;
      if (state.rooms[childPath] || room.doors.some((door) => door.target === name)) {
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
    },
  },
];

