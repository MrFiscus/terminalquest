import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";
import slateTexture from "@/assets/slate-texture.jpg";
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
    <div
      className="relative z-10 border-t-4 border-stone-slab-edge carved-stone-tex px-4 py-3"
      style={{
        backgroundImage: `url(${slateTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "inset 0 2px 0 hsl(var(--stone-light) / 0.35), inset 0 -2px 8px hsl(0 0% 0% / 0.6)",
      }}
    >
      <div className="mb-2 text-center">
        <span className="font-pixel carved-gold text-[12px]">~/inventory</span>
      </div>

      <div className="flex items-center justify-center">
        <div className="grid grid-cols-[64px_auto_64px] items-center gap-4">
          <div className="flex justify-center">
            {onOpenBook && (
              <button
                type="button"
                onClick={onOpenBook}
                title="Open the Book of Secrets"
                aria-label="Open the Book of Secrets"
                className="group relative flex h-14 w-14 items-center justify-center rounded-sm border border-[hsl(var(--torch-glow)/0.45)] bg-[hsl(230_20%_7%/0.72)] shadow-[inset_0_1px_0_hsl(42_70%_70%/0.12),0_2px_8px_hsl(0_0%_0%/0.55)] transition hover:scale-105 hover:border-[hsl(var(--torch-glow)/0.85)] hover:shadow-[0_0_14px_hsl(var(--torch-glow)/0.45)]"
              >
                <img
                  src={hintBookImage}
                  alt=""
                  className="h-12 w-12 object-contain drop-shadow-[0_2px_2px_hsl(0_0%_0%/0.8)]"
                  draggable={false}
                />
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[7px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Book of Secrets
                </span>
              </button>
            )}
          </div>

          <div className="flex justify-center gap-3">
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
                      {slot.item.glyph ?? "*"}
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
                  <span className="select-none text-[18px] opacity-15 grayscale">*</span>
                </div>
              );
            })}
          </div>

          <div aria-hidden />
        </div>
      </div>
    </div>
  );
}
