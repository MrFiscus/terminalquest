import type { CharState, Direction } from "./types";

export type AnimationState = "idle" | "walk" | "interact";

export interface CharacterAnimation {
  src: string;
  mirror?: boolean;
}

const gif = (name: string) => new URL(`../../gifs/${name}`, import.meta.url).href;

const idleSouth = gif("breathing-idle_south.gif");

const walkFrames: Partial<Record<Direction, CharacterAnimation>> = {
  north: { src: gif("running-4-frames_north.gif") },
  south: { src: gif("running-4-frames_south.gif") },
  west: { src: gif("running-4-frames_west.gif") },
  east: { src: gif("running-4-frames_west.gif"), mirror: true },
  "north-west": { src: gif("running-4-frames_north-west.gif") },
  "north-east": { src: gif("running-4-frames_north-west.gif"), mirror: true },
  "south-west": { src: gif("running-4-frames_south-west.gif") },
  "south-east": { src: gif("running-4-frames_south-west.gif"), mirror: true },
};

const interactFrames: Record<Direction, CharacterAnimation> = {
  north: { src: gif("picking-up_north.gif") },
  south: { src: gif("picking-up_south.gif") },
  west: { src: gif("picking-up_west.gif") },
  east: { src: gif("picking-up_east.gif") },
  "north-west": { src: gif("picking-up_north-west.gif") },
  "north-east": { src: gif("picking-up_north-east.gif") },
  "south-west": { src: gif("picking-up_south-west.gif") },
  "south-east": { src: gif("picking-up_south-east.gif") },
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
