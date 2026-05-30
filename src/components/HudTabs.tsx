import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/game/types";
import { Package, ScrollText, BookOpen, UserRound } from "lucide-react";
import hintBookImage from "@/assets/hintbook.png";

type HudTab = "inventory" | "chronicles" | "book" | "profile";

interface HudTabsProps {
  /** Player's inventory items */
  items: FileItem[];
  /** Number of inventory slots to display */
  slots?: number;
  /** Recent successful commands with narrations */
  commandLog?: { command: string; narration: string }[];
  /** Callback to open Book of Secrets modal */
  onOpenBook: () => void;
  /** Callback to open Profile modal */
  onOpenProfile: () => void;
  className?: string;
}

const TABS: { id: HudTab; label: string; icon: typeof Package }[] = [
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "chronicles", label: "Chronicles", icon: ScrollText },
  { id: "book", label: "Secrets", icon: BookOpen },
  { id: "profile", label: "Profile", icon: UserRound },
];

export function HudTabs({
  items,
  slots = 5,
  commandLog,
  onOpenBook,
  onOpenProfile,
  className,
}: HudTabsProps) {
  const [activeTab, setActiveTab] = useState<HudTab>("inventory");
  const chronicleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chronicle to bottom when new entries appear
  useEffect(() => {
    if (activeTab === "chronicles" && chronicleRef.current) {
      chronicleRef.current.scrollTo({
        top: chronicleRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [commandLog?.length, activeTab]);

  const filled = items.slice(0, slots);
  const empties = Math.max(0, slots - filled.length);

  return (
    <div className={cn("flex flex-col min-h-0 flex-1", className)}>
      {/* Tab bar */}
      <div className="hud-tab-bar flex-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn("hud-tab", isActive && "hud-tab-active")}
              title={tab.label}
            >
              <Icon size={13} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="hud-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content area */}
      <div
        className="flex-1 min-h-0 overflow-hidden rounded-b-lg relative"
        style={{
          background: "hsl(230 14% 6% / 0.9)",
          border: "2px solid hsl(230 10% 12%)",
          borderTop: "none",
          boxShadow: "inset 0 4px 12px hsl(0 0% 0% / 0.9), 0 2px 4px hsl(0 0% 0% / 0.5)",
        }}
      >
        {/* Stone grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none stone-tex" />

        <div className="relative z-10 h-full overflow-y-auto wizard-scroll p-3">
          {/* ── Inventory Tab ── */}
          {activeTab === "inventory" && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <span className="font-pixel text-[6px] uppercase tracking-[0.2em] text-center opacity-60 text-amber-500 flex-none">
                Adventurer's Pack
              </span>
              <div className="grid grid-cols-5 gap-2">
                {filled.map((item, idx) => (
                  <div
                    key={item.name}
                    className="group relative flex h-12 w-full items-center justify-center chest-slot item-glow"
                    title={item.name}
                  >
                    <span className="font-pixel absolute top-0.5 left-1 text-[6px] text-parchment/30 select-none leading-none">
                      {idx + 1}
                    </span>
                    <span className="text-xl drop-shadow-[0_2px_2px_hsl(0_0%_0%/0.85)] drop-shadow-[0_0_8px_hsl(var(--gold)/0.6)]">
                      {item.glyph ?? "*"}
                    </span>
                    {/* Tooltip */}
                    <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-slab-edge px-1.5 py-0.5 font-pixel text-[6px] text-primary opacity-0 transition-opacity group-hover:opacity-100 z-20">
                      {item.name}
                    </span>
                  </div>
                ))}
                {Array.from({ length: empties }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="relative flex h-12 w-full items-center justify-center chest-slot"
                  >
                    <span className="font-pixel absolute top-0.5 left-1 text-[6px] text-parchment/30 select-none leading-none">
                      {filled.length + idx + 1}
                    </span>
                    <span className="select-none text-[16px] opacity-15 grayscale">*</span>
                  </div>
                ))}
              </div>
              {filled.length === 0 && (
                <p className="font-pixel text-[7px] text-center text-parchment/40 italic mt-2">
                  Your pack is empty. Explore the dungeon to find items.
                </p>
              )}
            </div>
          )}

          {/* ── Chronicles Tab ── */}
          {activeTab === "chronicles" && (
            <div className="flex flex-col gap-2 h-full animate-fade-in">
              <span className="font-pixel text-[6px] uppercase tracking-[0.2em] text-center opacity-60 text-amber-500 flex-none">
                Chronicle of Deeds
              </span>
              {commandLog && commandLog.length > 0 ? (
                <div
                  ref={chronicleRef}
                  className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1 min-h-0 wizard-scroll"
                >
                  {commandLog.map((entry, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1.5 px-2 py-1.5 rounded bg-black/40 border border-amber-900/20 shadow-inner flex-none"
                    >
                      {entry.command && (
                        <span className="font-mono text-[9px] text-amber-400/80 leading-none">
                          $ {entry.command}
                        </span>
                      )}
                      <span className="font-pixel text-[7px] leading-relaxed text-parchment/80 italic">
                        {entry.narration}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-pixel text-[7px] text-center text-parchment/40 italic mt-4">
                  No deeds recorded yet. Begin your quest!
                </p>
              )}
            </div>
          )}

          {/* ── Book of Secrets Tab ── */}
          {activeTab === "book" && (
            <div className="flex flex-col items-center gap-4 py-4 animate-fade-in">
              <img
                src={hintBookImage}
                alt=""
                className="h-20 w-20 object-contain drop-shadow-[0_4px_4px_hsl(0_0%_0%/0.85)] drop-shadow-[0_0_12px_hsl(38_80%_50%/0.3)]"
                draggable={false}
              />
              <span className="font-pixel text-[6px] uppercase tracking-[0.2em] text-center opacity-60 text-amber-500">
                Arcane Knowledge
              </span>
              <p className="font-pixel text-[7px] text-center text-parchment/60 leading-relaxed px-2">
                The Book of Secrets contains all the spells and commands you'll need on your quest.
              </p>
              <button
                type="button"
                onClick={onOpenBook}
                className="hud-action-btn"
              >
                <BookOpen size={14} />
                <span>Open the Book</span>
              </button>
            </div>
          )}

          {/* ── Profile Tab ── */}
          {activeTab === "profile" && (
            <div className="flex flex-col items-center gap-4 py-4 animate-fade-in">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, hsl(228 14% 16%), hsl(228 14% 6%))",
                  border: "2px solid hsl(38 80% 50%)",
                  boxShadow: "0 0 16px hsl(38 80% 50% / 0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <UserRound size={28} className="text-amber-400" />
              </div>
              <span className="font-pixel text-[6px] uppercase tracking-[0.2em] text-center opacity-60 text-amber-500">
                Adventurer Profile
              </span>
              <p className="font-pixel text-[7px] text-center text-parchment/60 leading-relaxed px-2">
                View your stats, achievements, mastery progress, and account settings.
              </p>
              <button
                type="button"
                onClick={onOpenProfile}
                className="hud-action-btn"
              >
                <UserRound size={14} />
                <span>View Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
