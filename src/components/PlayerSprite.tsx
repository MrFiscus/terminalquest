import { useEffect } from "react";
import {
  getCharacterAnimation,
  preloadCharacterAnimations,
} from "@/game/characterAnimation";
import type { PlayerAnim, PlayerFacing } from "@/game/types";

interface PlayerSpriteProps {
  anim: PlayerAnim;
  facing: PlayerFacing;
  size?: number;
}

const facingToDirection = (facing: PlayerFacing) => {
  if (facing === "up") return "north";
  if (facing === "left") return "west";
  if (facing === "right") return "east";
  return "south";
};

export function PlayerSprite({ anim, facing, size = 32 }: PlayerSpriteProps) {
  useEffect(() => {
    preloadCharacterAnimations();
  }, []);

  const animation = getCharacterAnimation(anim, facingToDirection(facing));

  return (
    <div
      className="relative flex items-center justify-center overflow-visible"
      style={{ width: size, height: size }}
      data-facing={facing}
      aria-label={`adventurer ${anim} facing ${facing}`}
    >
      <img
        key={`${anim}-${facing}-${animation.src}`}
        src={animation.src}
        alt=""
        aria-hidden
        className="max-w-none max-h-none object-contain"
        style={{
          width: "145%",
          height: "145%",
          imageRendering: "pixelated",
          transform: animation.mirror ? "scaleX(-1)" : undefined,
          filter:
            "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.7)) drop-shadow(0 0 10px hsl(var(--torch-glow) / 0.45))",
        }}
      />
    </div>
  );
}
