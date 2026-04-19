import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";
import slateTexture from "@/assets/slate-texture.jpg";

interface InventoryBarProps {
  items: FileItem[];
  slots?: number;
  activeIndex?: number;
  onOpenBook?: () => void;
}

export function InventoryBar({ items, slots = 5, activeIndex = 0, onOpenBook }: InventoryBarProps) {
  const filled = items.slice(0, slots);
  const empties = Math.max(0, slots - filled.length);
  const displaySlots = [
    ...filled.map((it, i) => ({ kind: "filled" as const, item: it, i })),
    ...Array.from({ length: empties }).map((_, i) => ({ kind: "empty" as const, i })),
  ];

  return (
    <div
      className="border-t-4 border-stone-slab-edge carved-stone-tex px-4 py-3 relative z-10"
      style={{
        backgroundImage: `url(${slateTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "inset 0 2px 0 hsl(var(--stone-light) / 0.35), inset 0 -2px 8px hsl(0 0% 0% / 0.6)",
      }}
    >
      <div className="mb-2">
        <span className="font-pixel carved-gold text-[12px]">~/inventory</span>
      </div>
      <div className="flex items-center gap-3">
        {onOpenBook && (
          <button
            type="button"
            onClick={onOpenBook}
            title="Open the Book of Secrets"
            className="stone-toggle shrink-0 self-center"
          >
            BOOK OF SECRETS
          </button>
        )}
        <div className="flex flex-1 justify-center gap-3">
          {displaySlots.map((slot, idx) => {
            const isActive = slot.kind === "filled" && slot.i === activeIndex;
            if (slot.kind === "filled") {
              return (
                <div
                  key={slot.item.name}
                  className={cn(
                    "group relative flex h-14 w-14 items-center justify-center animate-fade-in chest-slot item-glow",
                    isActive && "chest-slot-active",
                  )}
                  title={slot.item.name}
                >
                  <span className="font-pixel absolute top-0.5 left-1 text-[7px] text-parchment/30 select-none leading-none">
                    {idx + 1}
                  </span>
                  <span className="text-2xl drop-shadow-[0_2px_2px_hsl(0_0%_0%/0.85)] drop-shadow-[0_0_8px_hsl(var(--gold)/0.6)]">
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
                className="relative flex h-14 w-14 items-center justify-center chest-slot"
              >
                <span className="font-pixel absolute top-0.5 left-1 text-[7px] text-parchment/30 select-none leading-none">
                  {idx + 1}
                </span>
                <span className="text-[18px] select-none" style={{ opacity: 0.12, filter: "grayscale(1)" }}>⚔</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
