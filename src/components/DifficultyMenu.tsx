import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Difficulty } from "@/game/aiLevelService";
import difficultyBg from "@/assets/Difficulty-Page.png";

interface DifficultyMenuProps {
  onConfirm: (difficulty: Difficulty, familiarity: number, precise: number) => void;
  busy?: boolean;
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

const boxStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, hsl(228 10% 16%), hsl(228 12% 10%))",
  border: "2px solid hsl(0 0% 3%)",
  borderRadius: "4px",
  boxShadow: [
    "0 0 8px hsl(33 100% 50% / 0.45)",
    "0 0 20px hsl(33 100% 45% / 0.22)",
    "0 0 36px hsl(33 100% 40% / 0.12)",
    "inset 1px 1px 0 hsl(0 0% 100% / 0.08)",
    "inset -1px -1px 0 hsl(0 0% 0% / 0.85)",
    "inset 0 0 22px hsl(0 0% 0% / 0.55)",
    "0 6px 18px hsl(0 0% 0% / 0.65)",
  ].join(", "),
  backdropFilter: "blur(3px)",
};

function Medallion({ color, glow }: { color: string; glow: string }) {
  return (
    <div style={{
      flexShrink: 0,
      width: 28, height: 28,
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
          transformOrigin: "50% 12px",
          transform: `rotate(${deg}deg)`,
        }} />
      ))}
      <div style={{
        width: 6, height: 6,
        background: `radial-gradient(circle at 38% 33%, hsl(0 0% 100% / 0.7), ${color})`,
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        boxShadow: `0 0 5px ${glow}`,
      }} />
    </div>
  );
}

export const DifficultyMenu = ({ onConfirm, busy }: DifficultyMenuProps) => {
  const [precise, setPrecise] = useState<number>(50);
  const [fading, setFading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        zIndex: 9999,
        backgroundImage: `url(${difficultyBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "'VT323', 'Courier New', monospace",
      }}
    >
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 38%, hsl(0 0% 0% / 0.8) 100%)" }} />
      <div className="pointer-events-none fixed inset-0" style={{ background: "hsl(230 18% 5% / 0.42)" }} />
      <div className="pointer-events-none fixed inset-0" style={{ opacity: 0.34, mixBlendMode: "overlay", backgroundImage: "radial-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1.4px), radial-gradient(hsl(0 0% 0% / 0.35) 1px, transparent 1.4px)", backgroundSize: "5px 5px, 7px 7px", backgroundPosition: "0 0, 2px 3px" }} />

      <div className="relative z-20 flex h-full items-center justify-center px-5 py-8 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex w-full max-w-5xl flex-col gap-5"
        >
          <div style={{ ...boxStyle, width: "min(100%, 560px)", padding: "18px 22px 16px", backgroundColor: "hsl(226 12% 8% / 0.5)" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.38em", textTransform: "uppercase", color: "hsl(0 0% 28%)", fontWeight: 700, marginBottom: "8px", textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85), 1px 1px 0 hsl(0 0% 100%/0.18)" }}>
              Terminal Quest
            </p>
            <h1 style={{ fontFamily: "'Cinzel', 'Pirata One', serif", fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 900, letterSpacing: "0.08em", lineHeight: 1.05, margin: 0, color: "hsl(38 80% 60%)", textShadow: ["-1px -1px 0 hsl(0 0% 0%/0.9)", "1px 1px 0 hsl(0 0% 100%/0.12)", "0 0 8px hsl(30 100% 50%/0.7)", "0 0 20px hsl(30 100% 45%/0.45)", "0 0 36px hsl(30 100% 40%/0.25)"].join(", ") }}>
              Tune the Dungeon
            </h1>
            <div style={{ marginTop: "12px", height: "1px", width: "60px", background: "linear-gradient(90deg, hsl(33 100% 45% / 0.6), transparent)" }} />
            <p style={{ marginTop: 12, marginBottom: 0, color: "hsl(42 30% 74%)", fontSize: 18, lineHeight: 1.35 }}>
              Drag the stone slider to set the level of challenge before you step through.
            </p>
          </div>

          <div style={{ ...boxStyle, width: "100%", padding: "18px", backgroundColor: "hsl(226 12% 8% / 0.44)", backgroundImage: ["radial-gradient(120% 90% at 86% 8%, hsl(34 92% 50% / 0.12), transparent 54%)", "radial-gradient(120% 130% at 18% 100%, hsl(214 42% 30% / 0.12), transparent 62%)", "linear-gradient(180deg, hsl(226 12% 15% / 0.48), hsl(224 16% 7% / 0.6))", "repeating-linear-gradient(45deg, hsl(0 0% 100% / 0.02) 0 2px, transparent 2px 7px)"].join(", ") }}>
            <div style={{ display: "grid", gap: 12, alignItems: "stretch", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 12px", background: "linear-gradient(180deg, hsl(228 14% 7% / 0.95), hsl(228 14% 5% / 0.95))", border: "1px solid hsl(0 0% 0% / 0.65)", borderRadius: 4, boxShadow: "inset 0 2px 6px hsl(0 0% 0% / 0.5)" }}>
                <Medallion color={tone.color} glow={tone.glow} />
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.24em", color: "hsl(0 0% 38%)", textTransform: "uppercase", marginBottom: 3 }}>
                    Difficulty Dial
                  </div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 20, color: "hsl(42 45% 82%)", lineHeight: 1.1 }}>
                    {tier.label} <span style={{ color: tone.color, textShadow: `0 0 10px ${tone.glow}` }}>{precise}%</span>
                  </div>
                </div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.2em", color: tone.color, textTransform: "uppercase", justifySelf: "end", textAlign: "right" }}>
                  {tone.label}
                </div>
              </div>

              <div ref={sliderAreaRef} onPointerDown={onPointerDown} className="cursor-pointer" style={{ gridColumn: "1 / -1", position: "relative", height: 34, padding: 5, background: "linear-gradient(180deg, hsl(220 18% 10%), hsl(220 18% 5%))", border: "1px solid hsl(0 0% 0% / 0.7)", boxShadow: ["inset 0 1px 0 hsl(0 0% 100% / 0.06)", "inset 0 -2px 12px hsl(0 0% 0% / 0.55)", "0 0 0 1px hsl(0 0% 0% / 0.65)"].join(", "), borderRadius: 4 }}>
                <div style={{ position: "absolute", inset: 5, borderRadius: 2, background: "linear-gradient(180deg, hsl(228 12% 7%), hsl(228 14% 4%))", border: "1px solid hsl(0 0% 0% / 0.8)", boxShadow: "inset 0 2px 8px hsl(0 0% 0% / 0.95), inset 0 0 16px hsl(0 0% 0% / 0.9)" }} />

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

                <motion.div animate={{ left: `${precise}%` }} transition={{ type: "spring", stiffness: 400, damping: 35 }} style={{ position: "absolute", top: "50%", width: 22, height: 22, zIndex: 30, pointerEvents: "none", transform: "translate(-50%, -50%)" }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, hsl(228 14% 16%), hsl(228 14% 6%))", border: "1.5px solid hsl(38 70% 58% / 0.9)", boxShadow: "0 0 0 1px hsl(0 0% 0% / 0.9), 0 0 8px hsl(33 100% 50% / 0.55), inset 0 1px 0 hsl(38 70% 58% / 0.16)" }} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 7, height: 7, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.92), #ffcc00)", boxShadow: "0 0 5px #ffcc00, 0 0 10px rgba(255,200,0,0.55)" }} />
                </motion.div>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, background: "linear-gradient(180deg, hsl(226 12% 11% / 0.95), hsl(226 12% 7% / 0.95))", border: "1px solid hsl(0 0% 0% / 0.7)", borderRadius: 4, boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.06), inset 0 -2px 16px hsl(0 0% 0% / 0.45)", position: "relative" }}>
                {([{ top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 }] as React.CSSProperties[]).map((pos, i) => (
                  <div key={i} style={{ position: "absolute", ...pos, width: 5, height: 5, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(170,130,45,0.9), rgba(40,30,8,1))", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)" }} />
                ))}

                <div style={{ padding: "16px 18px", borderRight: "1px solid hsl(35 38% 22% / 0.25)" }}>
                  <div style={{ fontSize: 8, letterSpacing: "0.3em", color: "hsl(35 38% 32% / 0.55)", fontFamily: "'Cinzel', serif", marginBottom: 8, textTransform: "uppercase" }}>Rank</div>
                  <motion.div key={tier.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 20, color: tone.color, textShadow: `0 0 14px ${tone.glow}`, letterSpacing: "0.08em" }}>
                    {tier.label}
                  </motion.div>
                  <div style={{ marginTop: 8, fontSize: 9, fontFamily: "'Cinzel', serif", fontStyle: "italic", color: "hsl(42 22% 60% / 0.5)", letterSpacing: "0.1em" }}>
                    {precise < 34 ? "A softer on-ramp for explorers returning to the dungeon." : precise < 67 ? "The intended balance point for most questing runs." : "A harsher trial for players who want the dungeon to bite back."}
                  </div>
                </div>

                <div style={{ padding: "14px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 140 }}>
                  <div style={{ fontSize: 8, letterSpacing: "0.3em", color: "hsl(35 38% 32% / 0.55)", fontFamily: "'Cinzel', serif", marginBottom: 4, textTransform: "uppercase" }}>Power</div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 42, lineHeight: 1, color: "hsl(38 80% 60%)", textShadow: "0 0 12px hsl(33 100% 50% / 0.4)" }}>
                    {precise}<span style={{ fontSize: 18, opacity: 0.35 }}>%</span>
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", paddingTop: 2 }}>
                <span style={{ color: "hsl(42 22% 68%)", fontFamily: "'VT323', monospace", fontSize: 18, letterSpacing: "0.08em" }}>
                  {isDragging ? "Adjusting the seal..." : "Drag the gem to set your challenge."}
                </span>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", paddingTop: 2 }}>
                <button
                  onClick={() => {
                    setFading(true);
                    onConfirm(tier.difficulty, precise, precise);
                  }}
                  disabled={busy || fading}
                  className="stone-tablet-btn"
                  style={{ minWidth: 280, padding: "15px 36px", fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.38em" }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)"; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
                >
                  {busy || fading ? "SUMMONING..." : "ENTER THE DUNGEON"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {fading && (
          <motion.div 
            className="absolute inset-0 bg-black z-[10000] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        )}
      </AnimatePresence>

      <style>{`
        .font-pixel { font-family: 'VT323', monospace; }
        .font-serif { font-family: 'Cinzel', serif; }
        .engraved-muted {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          color: #000;
          text-shadow: 1px 1px 0px rgba(255,255,255,0.05);
        }
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
