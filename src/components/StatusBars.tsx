import { cn } from "@/lib/utils";

/**
 * Decorative status bars (HP, XP, Mana) for the left-side HUD.
 * These are purely visual / fake for now — they show static values
 * and animate gently to look alive.
 */

interface StatusBarsProps {
  /** Player display name shown above the bars */
  playerName?: string;
  className?: string;
}

function Bar({
  label,
  current,
  max,
  color,
  glowColor,
  icon,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  glowColor: string;
  icon: string;
}) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="flex flex-col gap-1.5 group">
      {/* Label row */}
      <div className="flex items-center justify-between px-0.5">
        <span className="flex items-center gap-2">
          <span className="text-xs filter drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]">{icon}</span>
          <span
            className="font-pixel text-[7px] uppercase tracking-[0.15em] text-parchment/80 group-hover:text-parchment transition-colors"
          >
            {label}
          </span>
        </span>
        <span
          className="font-pixel text-[7px] opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ color: "hsl(42 30% 70%)" }}
        >
          {current}/{max}
        </span>
      </div>

      {/* Bar track — Carved into stone with runic symbols */}
      <div
        className="relative h-4 w-full overflow-hidden rounded-[2px]"
        style={{
          background: "hsl(230 14% 4%)",
          border: "1px solid hsl(230 10% 12%)",
          boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.8), 0 1px 0 hsl(0 0% 100% / 0.05)",
        }}
      >
        {/* Background Runic Pattern (SVG) */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" preserveAspectRatio="none">
           <defs>
            <pattern id="runes" x="0" y="0" width="40" height="16" patternUnits="userSpaceOnUse">
              <text x="2" y="12" className="font-serif text-[10px] fill-white">ᚠ ᚦ ᚨ ᚱ ᚲ</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#runes)" />
        </svg>

        {/* Fill — Glowing magical energy */}
        <div
          className="absolute inset-y-0 left-0 rounded-[1px] transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${glowColor} 0%, ${color} 80%, ${glowColor} 100%)`,
            boxShadow: `0 0 12px ${glowColor}, inset 0 1px 1px hsl(0 0% 100% / 0.3)`,
          }}
        >
           {/* Animated energy pulse overlay */}
           <div className="absolute inset-0 bg-white/10 animate-pulse" />
           
           {/* Moving runic highlight */}
           <div className="absolute inset-0 opacity-30 overflow-hidden">
              <div className="h-full w-full animate-[lp-spell-marquee_15s_linear_infinite] whitespace-nowrap text-[8px] font-serif flex items-center gap-4 text-white">
                <span>ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛟᛞ</span>
                <span>ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛟᛞ</span>
              </div>
           </div>
        </div>

        {/* Bevel/Gloss overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)",
          }}
        />
        
        {/* Runic markers (ticks) */}
        <div className="absolute inset-0 flex px-2 justify-between pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-[1px] h-1.5 mt-auto mb-auto bg-white/10 self-center" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatusBars({ playerName = "Adventurer", className }: StatusBarsProps) {
  return (
    <div className={cn("flex flex-col gap-2 px-2 py-2", className)}>
      {/* Engraved container for status elements */}
      <div
        className="flex flex-col gap-4 rounded-lg p-3 relative overflow-hidden"
        style={{
          background: "hsl(230 14% 6% / 0.9)",
          border: "2px solid hsl(230 10% 12%)",
          boxShadow: "inset 0 4px 12px hsl(0 0% 0% / 0.9), 0 2px 4px hsl(0 0% 0% / 0.5)",
        }}
      >
        {/* Subtle stone grain overlay for the tablet */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none stone-tex" />

        {/* Bars */}
        <div className="flex flex-col gap-4 flex-none relative z-10">
          <Bar
            label="Vitality"
            current={85}
            max={100}
            color="hsl(0 75% 55%)"
            glowColor="hsl(0 80% 40%)"
            icon="🩸"
          />
          <Bar
            label="Essence"
            current={340}
            max={500}
            color="hsl(45 90% 55%)"
            glowColor="hsl(38 100% 45%)"
            icon="✨"
          />
          <Bar
            label="Arcana"
            current={60}
            max={80}
            color="hsl(210 85% 65%)"
            glowColor="hsl(210 70% 45%)"
            icon="🧿"
          />
        </div>

        {/* Small separator inside engraved area */}
        <div
          className="h-px w-full flex-none opacity-20"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(38 60% 40%) 50%, transparent)",
          }}
        />

        {/* Level badge — styled as an artifact */}
        <div
          className="flex items-center gap-3 rounded-[3px] px-3 py-2 flex-none relative z-10"
          style={{
            background: "linear-gradient(135deg, hsl(230 14% 4%), hsl(230 14% 8%))",
            border: "1px solid hsl(38 50% 20% / 0.8)",
            boxShadow: "inset 0 1px 4px hsl(0 0% 0% / 0.7), 0 1px 0 hsl(0 0% 100% / 0.03)",
          }}
        >
          <span className="text-base filter drop-shadow-[0_0_8px_hsl(38_100%_50%/0.4)]">🏛️</span>
          <div className="flex flex-col">
            <span
              className="font-pixel text-[9px] uppercase tracking-[0.12em]"
              style={{ color: "hsl(38 80% 65%)", textShadow: "0 0 8px hsl(38 100% 50% / 0.3)" }}
            >
              Tier III
            </span>
            <span
              className="font-pixel text-[6px] uppercase tracking-wider opacity-60"
              style={{ color: "hsl(42 15% 50%)" }}
            >
              Shell Apprentice
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}






