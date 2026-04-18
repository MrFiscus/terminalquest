import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";

interface InventoryBarProps {
  items: FileItem[];
  slots?: number;
}

export function InventoryBar({ items, slots = 8 }: InventoryBarProps) {
  const filled = items.slice(0, slots);
  const empties = Math.max(0, slots - filled.length);

  return (
    <div className="border-t-2 border-stone-dark bg-stone-dark/80 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-pixel text-[10px] text-primary">~/inventory</span>
        <span className="font-mono-pixel text-xs text-muted-foreground">
          {items.length}/{slots}
        </span>
      </div>
      <div className="flex gap-2">
        {filled.map((it) => (
          <div
            key={it.name}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center",
              "border-2 border-primary/70 bg-stone shadow-[inset_0_0_0_2px_hsl(var(--stone-dark))]",
              "animate-fade-in",
            )}
            title={it.name}
          >
            <span className="text-xl">{it.glyph ?? "▣"}</span>
            <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-dark px-1.5 py-0.5 font-pixel text-[7px] text-parchment opacity-0 transition-opacity group-hover:opacity-100">
              {it.name}
            </span>
          </div>
        ))}
        {Array.from({ length: empties }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-12 w-12 border-2 border-stone-light/40 bg-stone-dark shadow-[inset_0_0_0_2px_hsl(var(--stone-dark))]"
          />
        ))}
      </div>
    </div>
  );
}
