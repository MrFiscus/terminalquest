import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";
import hintBookImage from "@/assets/hintbook.png";

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
    <div className="flex h-full flex-col items-center px-1.5 py-2">
      {/* Inventory Slots — vertical stack */}
      <div className="flex flex-col gap-2">
        {displaySlots.map((slot, idx) => {
          const isActive = slot.kind === "filled" && slot.i === activeIndex;
          if (slot.kind === "filled") {
            return (
              <div
                key={slot.item.name}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center animate-fade-in chest-slot item-glow",
                  isActive && "chest-slot-active",
                )}
                title={slot.item.name}
              >
                <span className="font-pixel absolute top-0.5 left-1 text-[6px] text-parchment/30 select-none leading-none">
                  {idx + 1}
                </span>
                <span className="text-xl drop-shadow-[0_2px_2px_hsl(0_0%_0%/0.85)] drop-shadow-[0_0_8px_hsl(var(--gold)/0.6)]">
                  {slot.item.glyph ?? "*"}
                </span>
                {/* Tooltip — positioned to the left */}
                <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[7px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {slot.item.name}
                </span>
              </div>
            );
          }

          return (
            <div
              key={`empty-${idx}`}
              className="relative flex h-11 w-11 items-center justify-center chest-slot"
            >
              <span className="font-pixel absolute top-0.5 left-1 text-[6px] text-parchment/30 select-none leading-none">
                {idx + 1}
              </span>
              <span className="select-none text-[16px] opacity-15 grayscale">*</span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div
        className="my-3 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, hsl(38 60% 35% / 0.4) 50%, transparent 90%)",
        }}
      />

      {/* Book of Secrets */}
      {onOpenBook && (
        <button
          type="button"
          onClick={onOpenBook}
          title="Open the Book of Secrets"
          aria-label="Open the Book of Secrets"
          className="group relative flex h-20 w-20 items-center justify-center transition hover:scale-105"
        >
          <img
            src={hintBookImage}
            alt=""
            className="h-20 w-20 object-contain drop-shadow-[0_4px_4px_hsl(0_0%_0%/0.85)]"
            draggable={false}
          />
          {/* Tooltip — positioned to the left */}
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[7px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Book of Secrets
          </span>
        </button>
      )}
    </div>
  );
}
