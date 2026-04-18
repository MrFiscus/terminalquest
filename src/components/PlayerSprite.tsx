import { cn } from "@/lib/utils";
import sprite from "@/assets/spritesheet.png";
import type { PlayerAnim, PlayerFacing } from "@/game/types";

interface PlayerSpriteProps {
  anim: PlayerAnim;
  facing: PlayerFacing;
  size?: number;
}

/**
 * The uploaded spritesheet has an irregular layout, so we render a CSS-driven
 * placeholder character that respects the sprite-sheet's color palette. Animation
 * states (idle bob, walk tilt, pickup squash/stretch) are pure CSS so swapping in
 * exact frame coords later only requires editing this one file.
 */
export function PlayerSprite({ anim, facing, size = 32 }: PlayerSpriteProps) {
  return (
    <div
      className={cn(
        "relative",
        anim === "idle" && "player-idle",
        anim === "walking" && "player-walk",
        anim === "pickingUp" && "player-pickup",
      )}
      style={{ width: size, height: size }}
      data-facing={facing}
      aria-label={`player ${anim} facing ${facing}`}
      data-sprite-src={sprite}
    >
      {/* Body */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: size * 0.7, height: size * 0.85 }}
      >
        {/* Head */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-sm"
          style={{
            width: size * 0.45,
            height: size * 0.4,
            background: "hsl(var(--parchment))",
            boxShadow:
              "inset 0 -2px 0 hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.25), 0 0 8px hsl(var(--torch-glow) / 0.5)",
          }}
        >
          {/* Eyes */}
          <div
            className="absolute"
            style={{
              top: size * 0.18,
              left: size * 0.08,
              width: size * 0.06,
              height: size * 0.06,
              background: "hsl(230 22% 4%)",
            }}
          />
          <div
            className="absolute"
            style={{
              top: size * 0.18,
              right: size * 0.08,
              width: size * 0.06,
              height: size * 0.06,
              background: "hsl(230 22% 4%)",
            }}
          />
        </div>
        {/* Torso */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: size * 0.38,
            width: size * 0.6,
            height: size * 0.4,
            background: "hsl(220 18% 26%)",
            boxShadow:
              "inset 0 -2px 0 hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.15), inset 0 0 0 1px hsl(var(--stone-slab-edge))",
          }}
        />
        {/* Belt */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: size * 0.66,
            width: size * 0.62,
            height: size * 0.06,
            background: "hsl(var(--gold))",
            boxShadow: "0 0 4px hsl(var(--gold) / 0.7)",
          }}
        />
        {/* Legs */}
        <div className="player-legs absolute left-1/2 -translate-x-1/2 flex gap-0.5" style={{ top: size * 0.74 }}>
          <div
            style={{
              width: size * 0.18,
              height: size * 0.2,
              background: "hsl(230 16% 14%)",
            }}
          />
          <div
            style={{
              width: size * 0.18,
              height: size * 0.2,
              background: "hsl(230 16% 14%)",
            }}
          />
        </div>
      </div>
      {/* Torch glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: "0 0 18px hsl(var(--torch-glow) / 0.65)",
        }}
        aria-hidden
      />
    </div>
  );
}
