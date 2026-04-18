import { cn } from "@/lib/utils";
import knight from "@/assets/knight-topdown.png";
import type { PlayerAnim, PlayerFacing } from "@/game/types";

interface PlayerSpriteProps {
  anim: PlayerAnim;
  facing: PlayerFacing;
  size?: number;
}

/**
 * Knight sprite — top-down pixel art of a knight in heavy armor with a blue cape.
 * Animation states (idle bob, walking tilt, pickup squash) are pure-CSS classes.
 */
export function PlayerSprite({ anim, facing, size = 32 }: PlayerSpriteProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        anim === "idle" && "player-idle",
        anim === "walking" && "player-walk",
        anim === "pickingUp" && "player-pickup",
      )}
      style={{ width: size, height: size }}
      data-facing={facing}
      aria-label={`knight ${anim} facing ${facing}`}
    >
      <img
        src={knight}
        alt=""
        aria-hidden
        className="h-full w-full object-contain"
        style={{
          imageRendering: "pixelated",
          transform: facing === "left" ? "scaleX(-1)" : undefined,
          filter: "drop-shadow(0 2px 3px hsl(0 0% 0% / 0.7)) drop-shadow(0 0 10px hsl(var(--torch-glow) / 0.45))",
        }}
      />
    </div>
  );
}
