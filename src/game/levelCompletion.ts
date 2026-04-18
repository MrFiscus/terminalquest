const completionLines = [
  "You have mastered this trial. The dungeon bends to your will.",
  "The relic is secured. The realm acknowledges your growing command.",
  "Your command rings true. The dungeon yields its final secret.",
  "The trial is complete. Stone and shadow remember your name.",
  "You carried the relic home. The maze bows in silence.",
];

const hash = (value: string) => {
  let out = 0;
  for (let i = 0; i < value.length; i++) out = (out * 33 + value.charCodeAt(i)) >>> 0;
  return out;
};

export function levelCompletionLine(targetFile: string, goal = ""): string {
  const seed = `${targetFile}:${goal}`;
  return completionLines[hash(seed) % completionLines.length];
}
