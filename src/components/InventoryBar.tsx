import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";

interface InventoryBarProps {
  items: FileItem[];
  slots?: number;
  activeIndex?: number;
}

export function InventoryBar({ items, slots = 5, activeIndex = 0 }: InventoryBarProps) {
  const filled = items.slice(0, slots);
  const empties = Math.max(0, slots - filled.length);
  const displaySlots = [
    ...filled.map((it, i) => ({ kind: "filled" as const, item: it, i })),
    ...Array.from({ length: empties }).map((_, i) => ({ kind: "empty" as const, i })),
  ];

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
      <div className="flex justify-center gap-3">
        {displaySlots.map((slot, idx) => {
          if (slot.kind === "filled") {
            const isActive = slot.i === activeIndex;
            return (
              <div
                key={slot.item.name}
                className={cn(
                  "group relative flex h-14 w-14 items-center justify-center animate-fade-in",
                  "stone-tex bg-stone",
                )}
                style={{
                  boxShadow: isActive
                    ? "inset 0 0 0 2px hsl(var(--gold)), inset 0 0 0 4px hsl(var(--stone-slab-edge)), 0 0 12px hsl(var(--gold) / 0.55)"
                    : "inset 0 0 0 2px hsl(var(--stone-slab-edge)), inset 2px 2px 0 hsl(var(--stone-light) / 0.4), inset -2px -2px 0 hsl(0 0% 0% / 0.5)",
                }}
                title={slot.item.name}
              >
                <span className="text-2xl">{slot.item.glyph ?? "▣"}</span>
                <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[7px] text-parchment opacity-0 transition-opacity group-hover:opacity-100">
                  {slot.item.name}
                </span>
              </div>
            );
          }
          return (
            <div
              key={`empty-${idx}`}
              className="h-14 w-14 stone-tex bg-stone-dark"
              style={{
                boxShadow:
                  "inset 0 0 0 2px hsl(var(--stone-slab-edge)), inset 2px 2px 6px hsl(0 0% 0% / 0.7), inset -1px -1px 0 hsl(var(--stone-light) / 0.15)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
