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
      className="border-t-4 border-stone-slab-edge carved-stone-tex px-4 py-3 relative z-10"
      style={{ boxShadow: "inset 0 2px 0 hsl(var(--stone-light) / 0.35), inset 0 -2px 8px hsl(0 0% 0% / 0.6)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-pixel text-[10px] text-primary drop-shadow-[0_1px_0_hsl(0_0%_0%/0.8)]">~/inventory</span>
        <span className="font-pixel text-[9px] text-primary/90 drop-shadow-[0_1px_0_hsl(0_0%_0%/0.8)]">
          {items.length}/{slots}
        </span>
      </div>
      <div className="flex justify-center gap-3">
        {displaySlots.map((slot, idx) => {
          const isActive = slot.kind === "filled" && slot.i === activeIndex;
          // Carved-stone alcove: deep inset + dark interior + (active) torch-glow rim
          const alcoveShadow = isActive
            ? [
                "inset 0 0 0 2px hsl(33 100% 50%)",            // bright torch-glow #ff8c00
                "inset 0 0 0 4px hsl(var(--stone-slab-edge))",
                "inset 0 0 12px hsl(0 0% 0% / 0.85)",
                "0 0 14px hsl(33 100% 50% / 0.7)",
              ].join(", ")
            : [
                "inset 0 0 0 2px hsl(var(--stone-slab-edge))",
                "inset 2px 2px 0 hsl(var(--stone-light) / 0.35)",
                "inset -2px -2px 0 hsl(0 0% 0% / 0.55)",
                "inset 0 0 14px hsl(0 0% 0% / 0.8)",
              ].join(", ");

          if (slot.kind === "filled") {
            return (
              <div
                key={slot.item.name}
                className={cn(
                  "group relative flex h-14 w-14 items-center justify-center animate-fade-in carved-stone-tex",
                )}
                style={{ boxShadow: alcoveShadow }}
                title={slot.item.name}
              >
                <span className="text-2xl drop-shadow-[0_2px_2px_hsl(0_0%_0%/0.8)]">
                  {slot.item.glyph ?? "▣"}
                </span>
                <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[7px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {slot.item.name}
                </span>
              </div>
            );
          }
          return (
            <div
              key={`empty-${idx}`}
              className="h-14 w-14 carved-stone-tex"
              style={{ boxShadow: alcoveShadow, filter: "brightness(0.7)" }}
            />
          );
        })}
      </div>
    </div>
  );
}
