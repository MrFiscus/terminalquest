import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Difficulty } from "@/game/aiLevelService";
import { readFamiliarity, saveFamiliarity } from "@/game/progressStats";

interface DifficultySettingsProps {
  onConfirm?: (difficulty: Difficulty, familiarity: number) => void;
}

const tierFor = (v: number): { label: string; difficulty: Difficulty } => {
  if (v < 34) return { label: "Novice", difficulty: "easy" };
  if (v < 67) return { label: "Adept", difficulty: "medium" };
  return { label: "Master", difficulty: "hard" };
};

const getDifficultyTone = (v: number) => {
  if (v < 34) {
    return {
      color: "hsl(140 55% 52%)",
      dark: "hsl(140 28% 16% / 0.98)",
      glow: "hsl(140 55% 42% / 0.65)",
      label: "Scout's Threshold",
    };
  }

  if (v < 67) {
    return {
      color: "hsl(38 80% 58%)",
      dark: "hsl(28 62% 24% / 0.98)",
      glow: "hsl(33 100% 50% / 0.7)",
      label: "Adept's Threshold",
    };
  }

  return {
    color: "hsl(0 78% 62%)",
    dark: "hsl(0 45% 18% / 0.98)",
    glow: "hsl(0 80% 58% / 0.7)",
    label: "Master's Threshold",
  };
};

function Medallion({ color, glow }: { color: string; glow: string }) {
  return (
    <div style={{
      flexShrink: 0,
      width: 24, height: 24,
      borderRadius: "50%",
      background: "radial-gradient(circle at 38% 32%, hsl(228 14% 16%), hsl(228 14% 6%))",
      border: "1.5px solid hsl(35 38% 22% / 0.8)",
      boxShadow: `0 0 0 1px hsl(0 0% 0% / 0.9), 0 0 8px ${glow}, inset 0 1px 0 hsl(0 0% 100% / 0.08)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <div key={deg} style={{
          position: "absolute",
          width: 1.5, height: 3,
          background: "hsl(35 34% 30% / 0.72)",
          borderRadius: 1,
          transformOrigin: "50% 10px",
          transform: `rotate(${deg}deg)`,
        }} />
      ))}
      <div style={{
        width: 5, height: 5,
        background: `radial-gradient(circle at 38% 33%, hsl(0 0% 100% / 0.7), ${color})`,
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        boxShadow: `0 0 5px ${glow}`,
      }} />
    </div>
  );
}

export const DifficultySettings = ({ onConfirm }: DifficultySettingsProps) => {
  const [precise, setPrecise] = useState<number>(() => readFamiliarity() ?? 50);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const sliderAreaRef = useRef<HTMLDivElement>(null);

  const tier = tierFor(precise);
  const tone = getDifficultyTone(precise);

  const handleMove = useCallback((clientX: number) => {
    if (!sliderAreaRef.current) return;
    const rect = sliderAreaRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPrecise(Math.round(pct * 100));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onPointerUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging, handleMove]);

  const handleSave = () => {
    saveFamiliarity(precise);
    onConfirm?.(tier.difficulty, precise);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* Title */}
      <div style={{
        textAlign: "center",
        fontFamily: "'Cinzel', serif",
        fontSize: 14,
        letterSpacing: "0.1em",
        color: "#3b1f0a",
        fontWeight: 700,
        marginBottom: 8,
      }}>
        Difficulty Calibration
      </div>

      {/* Difficulty Display */}
      <div style={{
        background: "linear-gradient(180deg, rgba(255, 248, 220, 0.88), rgba(244, 228, 188, 0.82))",
        border: "1px solid rgba(106,72,24,0.45)",
        borderRadius: 4,
        boxShadow: "inset 0 0 18px rgba(139,105,20,0.1)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
      }}>
        <Medallion color={tone.color} glow={tone.glow} />
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.24em", color: "#3b1f0a", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
            Challenge Level
          </div>
          <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: "#3b1f0a", lineHeight: 1.1 }}>
            <span style={{ color: "#3b1f0a" }}>{tier.label} <span style={{ color: tone.color, fontWeight: "bold" }}>{precise}%</span></span>
          </div>
        </div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.2em", color: "#6a4818", textTransform: "uppercase", textAlign: "right" }}>
          {tone.label}
        </div>
      </div>

      {/* Slider */}
      <div ref={sliderAreaRef} onPointerDown={onPointerDown} className="cursor-pointer" style={{
        position: "relative",
        height: 28,
        padding: 5,
        background: "linear-gradient(180deg, rgba(255, 248, 220, 0.86), rgba(236, 216, 170, 0.8))",
        border: "1px solid rgba(106,72,24,0.45)",
        boxShadow: "inset 0 0 12px rgba(139,105,20,0.12)",
        borderRadius: 4,
      }}>
        <div style={{ position: "absolute", inset: 5, borderRadius: 2, background: "linear-gradient(180deg, rgba(245, 229, 192, 0.95), rgba(224, 200, 152, 0.92))", border: "1px solid rgba(106,72,24,0.4)", boxShadow: "inset 0 1px 4px rgba(139,105,20,0.2)" }} />

        <motion.div animate={{ width: `${precise}%` }} style={{ position: "absolute", top: 5, bottom: 5, left: 5, overflow: "hidden", borderRadius: 2 }} transition={{ type: "spring", stiffness: 400, damping: 35 }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${tone.color} 0%, ${tone.color} 55%, ${tone.dark} 100%)`, boxShadow: `0 0 14px ${tone.glow}, 0 0 30px ${tone.glow}55` }} />
          <div style={{ position: "absolute", top: 0, left: "-5%", right: "-5%", height: 3, background: "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.22) 15%, rgba(255,255,255,0.78) 50%, rgba(255,255,255,0.22) 85%, transparent 100%)", animation: "liquid-surface 3s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 1, height: "48%", width: "35%", background: "linear-gradient(to right, transparent, rgba(255,255,255,0.11), transparent)", animation: "liquid-reflect 5s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 4, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.42))", boxShadow: `2px 0 10px ${tone.glow}` }} />
        </motion.div>

        {[33, 67].map((pos) => (
          <div key={pos} style={{ position: "absolute", top: 5, bottom: 5, left: `calc(${pos}% + 2px)`, width: 2, background: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(50,38,12,0.9) 30%, rgba(70,52,16,0.95) 50%, rgba(50,38,12,0.9) 70%, rgba(0,0,0,0.05))", zIndex: 22, pointerEvents: "none", transform: "translateX(-50%)" }} />
        ))}

        {[10, 20, 40, 50, 60, 80, 90].map((pos) => (
          <div key={pos} style={{ position: "absolute", top: 8, bottom: 8, left: `${pos}%`, width: 1, background: "linear-gradient(to bottom, transparent, rgba(60,45,12,0.45), transparent)", zIndex: 21, pointerEvents: "none", transform: "translateX(-50%)" }} />
        ))}

        <motion.div animate={{ left: `${precise}%` }} transition={{ type: "spring", stiffness: 400, damping: 35 }} style={{ position: "absolute", top: "50%", width: 18, height: 18, zIndex: 30, pointerEvents: "none", transform: "translate(-50%, -50%)" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, hsl(228 14% 16%), hsl(228 14% 6%))", border: "1.5px solid hsl(38 70% 58% / 0.9)", boxShadow: "0 0 0 1px hsl(0 0% 0% / 0.9), 0 0 8px hsl(33 100% 50% / 0.55), inset 0 1px 0 hsl(38 70% 58% / 0.16)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 6, height: 6, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92), #ffcc00)", boxShadow: "0 0 5px #ffcc00, 0 0 10px rgba(255,200,0,0.55)" }} />
        </motion.div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: 12,
        fontFamily: "'VT323', monospace",
        color: "#3b1f0a",
        lineHeight: 1.4,
        textAlign: "center",
      }}>
        {precise < 34
          ? "A softer on-ramp for explorers returning to the dungeon."
          : precise < 67
          ? "The intended balance point for most questing runs."
          : "A harsher trial for players who want the dungeon to bite back."}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 11,
          letterSpacing: "0.2em",
          padding: "10px 20px",
          background: "linear-gradient(180deg, hsl(228 10% 16%), hsl(228 12% 10%))",
          border: "2px solid hsl(0 0% 3%)",
          borderRadius: "4px",
          color: "#f0d68a",
          cursor: "pointer",
          boxShadow: [
            "0 0 8px hsl(33 100% 50% / 0.45)",
            "0 0 20px hsl(33 100% 45% / 0.22)",
            "0 0 36px hsl(33 100% 40% / 0.12)",
            "inset 1px 1px 0 hsl(0 0% 100% / 0.08)",
            "inset -1px -1px 0 hsl(0 0% 0% / 0.85)",
            "inset 0 0 22px hsl(0 0% 0% / 0.55)",
            "0 6px 18px hsl(0 0% 0% / 0.65)",
          ].join(", "),
          transition: "all 0.2s ease",
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)"; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
      >
        {saved ? "✓ SAVED" : "SAVE DIFFICULTY"}
      </button>

      <style>{`
        @keyframes liquid-surface {
          0%   { transform: translateX(-8%); opacity: 0.6; }
          50%  { transform: translateX(8%);  opacity: 1; }
          100% { transform: translateX(-8%); opacity: 0.6; }
        }
        @keyframes liquid-reflect {
          0%   { left: -10%; opacity: 0.6; }
          50%  { left: 75%;  opacity: 1; }
          100% { left: -10%; opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
