import { useCallback, useRef, useState } from "react";
import type { Difficulty } from "@/game/aiLevelService";
import { cn } from "@/lib/utils";
import { FireBlazes } from "@/components/FireBlazes";
import { RepelDots } from "@/components/RepelDots";

interface DifficultyMenuProps {
  onConfirm: (difficulty: Difficulty, familiarity: number, precise: number) => void;
  busy?: boolean;
}

const tierFor = (v: number): { label: string; difficulty: Difficulty } => {
  if (v < 34) return { label: "Novice", difficulty: "easy" };
  if (v < 67) return { label: "Adept", difficulty: "medium" };
  return { label: "Master", difficulty: "hard" };
};

export const DifficultyMenu = ({ onConfirm, busy }: DifficultyMenuProps) => {
  const [precise, setPrecise] = useState<number>(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const tier = tierFor(precise);

  const handleMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPrecise(Math.round(pct * 100));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    handleMove(e.clientX);
    const onPointerMove = (moveEvent: PointerEvent) => handleMove(moveEvent.clientX);
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="fixed inset-0 dungeon-terminal flex flex-col items-center justify-center p-8 z-[9999]" style={{ outline: 'none', border: 'none', borderRadius: 0 }}>
      {/* Background ambient overlays */}
      <div className="dungeon-terminal-scanlines" aria-hidden />
      <div className="dungeon-terminal-vignette" aria-hidden />
      
      {/* Visual background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden style={{ zIndex: 1 }}>
        <FireBlazes count={20} />
      </div>
      <RepelDots count={80} />

      <div className="relative z-10 max-w-xl w-full space-y-12 text-center font-mono-clean">
        <header className="space-y-4">
          <h1 
            className="text-4xl md:text-6xl font-pixel text-[#ffcc00] tracking-widest uppercase italic"
            style={{ textShadow: "0 2px 0 #000, 0 4px 16px rgba(255,140,0,0.6)" }}
          >
            Terminal Quest
          </h1>
          <p className="text-[#a89f91] font-bold tracking-widest uppercase text-xs md:text-sm" style={{ textShadow: "0 1px 0 #000" }}>
            ⯌ CHOOSE THY PERIL ⯌
          </p>
        </header>

        <div className="space-y-8 p-10 relative">
          {/* Subtle carved stone backing for the menu block */}
          <div className="absolute inset-0 bg-[#161412]/80 rounded-sm border border-[#2a2622] shadow-[inset_0_0_24px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.6)]" style={{ zIndex: -1 }} />
          
          <div className="space-y-2">
            <div 
              className="text-6xl font-black text-[#f3e3cc] tabular-nums"
              style={{ textShadow: "0 2px 4px #000, 0 0 12px rgba(255,200,100,0.2)" }}
            >
              {precise}%
            </div>
            <div className="text-amber-500 font-bold uppercase tracking-widest text-xl">
              {tier.label}
            </div>
          </div>

          <div 
            ref={sliderRef}
            onPointerDown={onPointerDown}
            className="relative h-6 bg-[#0a0a0a] rounded-sm cursor-pointer overflow-hidden border-2 border-[#1f1d1a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] mx-8"
          >
            {/* The slider fill - Ember glow */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8b4513] via-[#cd853f] to-[#ffaa00] transition-all duration-75 shadow-[0_0_12px_#ffaa00]"
              style={{ width: `${precise}%` }}
            />
            {/* The slider thumb block */}
            <div 
              className="absolute top-1/2 -mt-4 w-6 h-8 stone-tablet-btn flex items-center justify-center transition-all duration-75 z-10"
              style={{ left: `calc(${precise}% - 12px)` }}
            >
              <div className="w-1.5 h-1.5 bg-[#ffcc00] rotate-45 shadow-[0_0_4px_#ffcc00]" />
            </div>
          </div>

          <div className="flex justify-between px-8 text-[#8c8273] font-bold uppercase tracking-widest text-[9px] md:text-[10px]" style={{ textShadow: "0 1px 0 #000" }}>
            <span>0<br/><span className="text-[#5a5349] mt-1 block italic">Novice</span></span>
            <span>100<br/><span className="text-[#5a5349] mt-1 block italic">Master</span></span>
          </div>

          <p className="text-[#a89f91] italic text-xs md:text-sm px-4 leading-relaxed" style={{ textShadow: "0 1px 0 #000" }}>
            "Thy choice here defines the density of shadows and the weight of the trials ahead."
          </p>
        </div>

        <button
          onClick={() => onConfirm(tier.difficulty, precise, precise)}
          disabled={busy}
          className={cn(
            "w-full max-w-[320px] mx-auto py-5 font-pixel text-base md:text-lg transition-all focus:outline-none uppercase italic tracking-tighter",
            "stone-tablet-btn text-[#ffcc00]",
            busy && "opacity-50 grayscale cursor-not-allowed"
          )}
        >
          {busy ? "MANIFESTING..." : "⚔ MANIFEST THE DUNGEON ⚔"}
        </button>
      </div>
    </div>
  );
};
