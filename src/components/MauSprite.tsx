import { cn } from "@/lib/utils";

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
        src="/src/assets/characters/cat-idle.gif"
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
