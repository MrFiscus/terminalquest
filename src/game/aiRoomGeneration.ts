import { supabase } from "@/integrations/supabase/client";

export interface RoomBlueprintItem {
  name: string;
  type: "file" | "scroll" | "chest" | "potion";
}

export interface RoomBlueprintExit {
  name: string;
  type: "folder";
}

export interface RoomBlueprint {
  roomName: string;
  goal: string;
  visibleItems: RoomBlueprintItem[];
  visibleExits: RoomBlueprintExit[];
  requiredCommands: string[];
  hint: string;
}

export interface GenerateRoomInput {
  roomName: string;
  currentPath: string;
  weakCommands: string[];
  recentMistakes: string[];
  difficulty: string;
}

const cleanName = (value: unknown, fallback: string) => {
  const raw = typeof value === "string" ? value : fallback;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18) || fallback;
};

export function fallbackRoomBlueprint(roomName: string): RoomBlueprint {
  return {
    roomName,
    goal: "inspect the room",
    visibleItems: [{ name: `${roomName}.txt`, type: "scroll" }],
    visibleExits: [],
    requiredCommands: ["ls", "cat"],
    hint: "Use ls, then cat.",
  };
}

function sanitizeBlueprint(value: unknown, fallbackName: string): RoomBlueprint {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const items = Array.isArray(data.visibleItems)
    ? data.visibleItems.slice(0, 3).map((item, index) => {
        const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
        const type = entry.type === "chest" || entry.type === "potion" || entry.type === "scroll" ? entry.type : "file";
        return {
          name: cleanName(entry.name, `item${index + 1}.txt`),
          type,
        };
      })
    : [];
  const exits = Array.isArray(data.visibleExits)
    ? data.visibleExits.slice(0, 3).map((exit, index) => {
        const entry = exit && typeof exit === "object" ? exit as Record<string, unknown> : {};
        return {
          name: cleanName(entry.name, `room${index + 1}`),
          type: "folder" as const,
        };
      })
    : [];

  return {
    roomName: cleanName(data.roomName, fallbackName),
    goal: typeof data.goal === "string" ? data.goal.slice(0, 80) : "inspect the room",
    visibleItems: items,
    visibleExits: exits,
    requiredCommands: Array.isArray(data.requiredCommands)
      ? data.requiredCommands.filter((cmd): cmd is string => typeof cmd === "string").slice(0, 4)
      : ["ls"],
    hint: typeof data.hint === "string" ? data.hint.split(/\s+/).slice(0, 12).join(" ") : "Use ls.",
  };
}

export async function generateAIRoomBlueprint(input: GenerateRoomInput): Promise<RoomBlueprint> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-room", {
      body: input,
    });
    if (error) throw error;
    const parsed = typeof data?.room === "string" ? JSON.parse(data.room) : data?.room;
    return sanitizeBlueprint(parsed, input.roomName);
  } catch (error) {
    console.warn("AI room generation failed, using fallback:", error);
    return fallbackRoomBlueprint(input.roomName);
  }
}

export function glyphForBlueprintItem(item: RoomBlueprintItem) {
  if (item.type === "scroll") return "📜";
  if (item.type === "chest") return "📦";
  if (item.type === "potion") return "🧪";
  return "□";
}
