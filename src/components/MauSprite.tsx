import { cn } from "@/lib/utils";
import catIdle from "@/assets/characters/cat-idle.gif";

interface MauSpriteProps {
  className?: string;
  size?: number;
}

export function MauSprite({ className, size = 32 }: MauSpriteProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={catIdle}
        alt="Mau the Cat"
        draggable={false}
        className="max-w-none max-h-none object-contain"
        style={{ 
          width: "145%",
          height: "145%",
          imageRendering: "pixelated" 
        }}
      />
    </div>
  );
}
