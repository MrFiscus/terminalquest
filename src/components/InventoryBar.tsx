import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";

interface InventoryBarProps {
  items: FileItem[];
  slots?: number;
  activeIndex?: number;
}

export function InventoryBar({ items, slots = 8, activeIndex = 0 }: InventoryBarProps) {
  const filled = items.slice(0, slots);
  const empties = Math.max(0, slots - filled.length);

  return (
    <div
      className="border-t-4 border-stone-slab-edge bg-stone-slab-edge px-4 py-3"
      style={{ boxShadow: "inset 0 2px 0 hsl(var(--stone-light) / 0.25), inset 0 -2px 8px hsl(0 0% 0% / 0.6)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-pixel text-[10px] text-primary">~/inventory</span>
        <span className="font-mono-pixel text-xs text-muted-foreground">
          {items.length}/{slots}
        </span>
      </div>
      <div className="flex gap-2">
        {filled.map((it, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={it.name}
              className={cn(
                "group relative flex h-12 w-12 items-center justify-center animate-fade-in",
                "stone-tex bg-stone",
              )}
              style={{
                boxShadow: isActive
                  ? "inset 0 0 0 2px hsl(var(--gold)), inset 0 0 0 4px hsl(var(--stone-slab-edge)), 0 0 12px hsl(var(--gold) / 0.5)"
                  : "inset 0 0 0 2px hsl(var(--stone-slab-edge)), inset 2px 2px 0 hsl(var(--stone-light) / 0.4), inset -2px -2px 0 hsl(0 0% 0% / 0.5)",
              }}
              title={it.name}
            >
              <span className="text-xl">{it.glyph ?? "▣"}</span>
              <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[7px] text-parchment opacity-0 transition-opacity group-hover:opacity-100">
                {it.name}
              </span>
            </div>
          );
        })}
        {Array.from({ length: empties }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-12 w-12 stone-tex bg-stone-dark"
            style={{
              boxShadow:
                "inset 0 0 0 2px hsl(var(--stone-slab-edge)), inset 2px 2px 6px hsl(0 0% 0% / 0.7), inset -1px -1px 0 hsl(var(--stone-light) / 0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
