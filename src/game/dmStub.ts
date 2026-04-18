import type { GameState } from "./types";

const LINES = [
  "The Dungeon Master strokes his beard. 'That spell is not in this realm... yet.'",
  "A whisper echoes: 'Try `help` to learn the old tongue.'",
  "The torches dim. The dungeon does not understand you.",
  "Somewhere, a goblin laughs at your syntax.",
  "The Dungeon Master shrugs. 'I'll remember that one for later.'",
  "A rat scurries past, unimpressed by your incantation.",
];

/**
 * Stubbed Dungeon Master responder for unknown commands.
 * Future: swap this for a real AI call.
 */
export function dmRespond(input: string, _ctx: GameState): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return LINES[h % LINES.length];
}
