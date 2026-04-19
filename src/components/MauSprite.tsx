import { cn } from "@/lib/utils";

interface MauSpriteProps {
  className?: string;
  size?: number;
}

export function MauSprite({ className, size = 128 }: MauSpriteProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <img
        src="/src/assets/characters/cat-idle.gif"
        alt="Mau the Cat"
        draggable={false}
        className="h-full w-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
