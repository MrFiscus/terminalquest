import type { Room } from "./types";

const pickBySeed = <T,>(values: T[], seed: string): T => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return values[hash % values.length];
};

export function roomFlavor(room: Room): string {
  const name = room.name.toLowerCase();
  const itemNames = room.files.map((file) => file.name.toLowerCase());

  if (itemNames.some((item) => item.includes("victory") || item.includes("relic"))) {
    return `A cold vault where something valuable waits in the gloom.`;
  }

  if (itemNames.some((item) => item.endsWith(".scroll") || item.endsWith(".txt") || item.includes("note"))) {
    return `A dusty archive filled with forgotten scraps of knowledge.`;
  }

  if (name.includes("crypt") || name.includes("tomb")) {
    return `A narrow crypt lined with ancient stone.`;
  }

  if (name.includes("vault") || name.includes("treasury")) {
    return `A sealed vault where old riches sleep beneath dust.`;
  }

  if (name.includes("hall") || name.includes("corridor")) {
    return `A long stone passage where every footstep answers back.`;
  }

  if (name.includes("library") || name.includes("archive")) {
    return `A quiet archive thick with dust and brittle pages.`;
  }

  if (name.includes("forge")) {
    return `A blackened forge still warm beneath the ash.`;
  }

  if (room.doors.length >= 3) {
    return `A branching chamber where several paths compete for your courage.`;
  }

  if (room.files.length > 0) {
    return `A dim chamber with something curious resting on the floor.`;
  }

  return pickBySeed([
    `A damp chamber of old stone and patient shadows.`,
    `A quiet room where torchlight trembles across the walls.`,
    `A cold room with dust gathered in every corner.`,
    `A silent chamber waiting for the next command.`,
  ], room.path);
}
