import type { CharState, Direction } from "./types";

export type AnimationState = "idle" | "walk" | "interact";

export interface CharacterAnimation {
  src: string;
  mirror?: boolean;
}

const fox = (name: string) => new URL(`../assets/characters/fox/${name}`, import.meta.url).href;

const idleSouth = fox("breathing-idle_south.gif");

const walkFrames: Record<Direction, CharacterAnimation> = {
  north: { src: fox("running-4-frames_north.gif") },
  south: { src: fox("running-4-frames_south.gif") },
  west: { src: fox("running-4-frames_west.gif") },
  east: { src: fox("running-4-frames_east.gif") },
  // Fallbacks for diagonals as fox doesn't have them yet
  "north-west": { src: fox("running-4-frames_west.gif") },
  "north-east": { src: fox("running-4-frames_east.gif") },
  "south-west": { src: fox("running-4-frames_west.gif") },
  "south-east": { src: fox("running-4-frames_east.gif") },
};

const interactFrames: Record<Direction, CharacterAnimation> = {
  north: { src: fox("picking-up_north.gif") },
  south: { src: fox("picking-up_south.gif") },
  west: { src: fox("picking-up_west.gif") },
  east: { src: fox("picking-up_east.gif") },
  // Fallbacks for diagonals
  "north-west": { src: fox("picking-up_west.gif") },
  "north-east": { src: fox("picking-up_east.gif") },
  "south-west": { src: fox("picking-up_west.gif") },
  "south-east": { src: fox("picking-up_east.gif") },
};

const animationCache = new Map<string, HTMLImageElement>();

export function animationStateFromCharState(charState: CharState): AnimationState {
  if (charState === "walking") return "walk";
  if (charState === "pickingUp") return "interact";
  return "idle";
}

export function getCharacterAnimation(
  charState: CharState,
  direction: Direction,
): CharacterAnimation {
  const state = animationStateFromCharState(charState);

  if (state === "walk") {
    return walkFrames[direction] ?? walkFrames.south!;
  }

  if (state === "interact") {
    return interactFrames[direction];
  }

  return { src: idleSouth };
}

export function preloadCharacterAnimations() {
  const animations = [
    { src: idleSouth },
    ...Object.values(walkFrames),
    ...Object.values(interactFrames),
  ].filter((animation): animation is CharacterAnimation => Boolean(animation));

  for (const animation of animations) {
    if (animationCache.has(animation.src)) continue;
    const img = new Image();
    img.src = animation.src;
    animationCache.set(animation.src, img);
  }
}

export function directionFromDelta(dx: number, dy: number): Direction {
  if (dy < 0 && dx < 0) return "north-west";
  if (dy < 0 && dx > 0) return "north-east";
  if (dy > 0 && dx < 0) return "south-west";
  if (dy > 0 && dx > 0) return "south-east";
  if (dy < 0) return "north";
  if (dy > 0) return "south";
  if (dx < 0) return "west";
  if (dx > 0) return "east";
  return "south";
}
