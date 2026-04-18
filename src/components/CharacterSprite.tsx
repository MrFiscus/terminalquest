import { useEffect, useMemo, useRef, useState } from "react";
import type { CharState, Direction } from "@/game/types";
import {
  getCharacterAnimation,
  preloadCharacterAnimations,
} from "@/game/characterAnimation";

interface CharacterSpriteProps {
  state: CharState;
  direction: Direction;
}

export function CharacterSprite({ state, direction }: CharacterSpriteProps) {
  const animation = useMemo(
    () => getCharacterAnimation(state, direction),
    [state, direction],
  );
  const [previous, setPrevious] = useState<typeof animation | null>(null);
  const currentRef = useRef(animation);

  useEffect(() => {
    preloadCharacterAnimations();
  }, []);

  useEffect(() => {
    const current = currentRef.current;
    if (current.src === animation.src && current.mirror === animation.mirror) return;

    setPrevious(current);
    currentRef.current = animation;

    const timeout = window.setTimeout(() => setPrevious(null), 120);
    return () => window.clearTimeout(timeout);
  }, [animation]);

  const renderFrame = (
    frame: typeof animation,
    className: string,
    alt: string,
  ) => (
    <img
      src={frame.src}
      alt={alt}
      draggable={false}
      className={`absolute inset-0 h-full w-full object-contain ${className}`}
      style={{
        imageRendering: "pixelated",
        transform: frame.mirror ? "scaleX(-1)" : undefined,
        transformOrigin: "center",
      }}
    />
  );

  return (
    <div className="relative h-full w-full overflow-visible">
      {previous && renderFrame(previous, "opacity-0 transition-opacity duration-100", "")}
      {renderFrame(animation, "opacity-100", "main character")}
    </div>
  );
}
