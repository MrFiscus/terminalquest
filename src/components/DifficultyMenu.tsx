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

const getGothicProps = (v: number) => {
  if (v < 34) {
    return {
      color: "rgba(96, 165, 250, 0.9)",
      dark:  "rgba(14, 45, 140, 0.95)",
      glow:  "rgba(59, 130, 246, 0.7)",
      label: "Novice's Whisper",
    };
  } else if (v < 67) {
    return {
      color: "rgba(251, 191, 36, 1)",
      dark:  "rgba(105, 50, 4, 1)",
      glow:  "rgba(245, 158, 11, 0.8)",
      label: "Adept's Trial",
    };
  } else {
    return {
      color: "rgba(239, 68, 68, 1)",
      dark:  "rgba(85, 6, 6, 1)",
      glow:  "rgba(185, 28, 28, 0.9)",
      label: "Master's Doom",
    };
  }
};

function Medallion({ color, glow }: { color: string; glow: string }) {
  return (
    <div style={{
      flexShrink: 0,
      width: 26, height: 26,
      borderRadius: "50%",
      background: "radial-gradient(circle at 38% 32%, #2a2010, #0c0904)",
      border: "1.5px solid rgba(80,60,18,0.7)",
      boxShadow: `0 0 0 1px rgba(0,0,0,0.9), 0 0 6px ${glow}44, inset 0 1px 0 rgba(150,110,30,0.12)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <div key={deg} style={{
          position: "absolute",
          width: 1.5, height: 3,
          background: "rgba(120,90,25,0.55)",
          borderRadius: 1,
          transformOrigin: "50% 11px",
          transform: `rotate(${deg}deg)`,
        }} />
      ))}
      <div style={{
        width: 6, height: 6,
        background: `radial-gradient(circle at 38% 33%, rgba(255,255,255,0.55), ${color})`,
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
  const props = getGothicProps(precise);

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
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center select-none" style={{ zIndex: 9999 }}>
      
      {/* Background Image */}
      <img 
        src={difficultyBg} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover opacity-100"
        style={{ imageRendering: "pixelated" }}
      />
      
      {/* Global Vignette */}
      <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

      {/* --- Main UI --- */}
      <div className="relative z-20 flex flex-col items-center max-w-5xl w-full px-12">

        {/* --- Gothic Title --- */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Pirata One', serif",
            fontWeight: 400,
            fontSize: "clamp(4rem, 10vw, 7.5rem)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#d4a843",
            textShadow: [
              "0 1px 0 #8a6010",
              "0 2px 0 #6b4a0c",
              "0 3px 0 #4a3208",
              "0 4px 0 #2e1f05",
              "0 0 20px rgba(196,154,34,0.5)",
              "0 0 60px rgba(196,154,34,0.2)",
              "0 6px 20px rgba(0,0,0,0.95)",
            ].join(", "),
            margin: 0,
            lineHeight: 1,
          }}>
            Difficulty
          </h1>
          {/* Ornamental divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <div style={{ height: 1, width: 60, background: "linear-gradient(to right, transparent, rgba(196,154,34,0.5))" }} />
            <span style={{ color: "rgba(196,154,34,0.55)", fontSize: 10 }}>✦</span>
            <div style={{ height: 1, width: 60, background: "linear-gradient(to left, transparent, rgba(196,154,34,0.5))" }} />
          </div>
        </div>

        {/* --- Dungeon Slider --- */}
        <div className="relative w-full max-w-4xl flex flex-col items-center mb-6">

          {/* Outer iron housing */}
          <div
            className="relative w-full"
            style={{
              background: "linear-gradient(180deg, #1c1508 0%, #0b0903 50%, #161106 100%)",
              border: "1.5px solid rgba(90,68,24,0.8)",
              boxShadow: [
                "0 0 0 1px rgba(0,0,0,0.95)",
                "0 0 0 3px rgba(14,11,4,0.95)",
                "0 0 0 4.5px rgba(60,44,14,0.35)",
                "0 14px 44px rgba(0,0,0,0.95)",
                "inset 0 1px 0 rgba(160,120,40,0.08)",
              ].join(", "),
              padding: "3px 4px",
            }}
          >
            {/* Corner rivets */}
            {([
              { top: 3, left: 3 },
              { top: 3, right: 3 },
              { bottom: 3, left: 3 },
              { bottom: 3, right: 3 },
            ] as React.CSSProperties[]).map((pos, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  ...pos,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 30%, rgba(170,130,45,0.9), rgba(40,30,8,1))",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
                }}
              />
            ))}

            {/* Accent lines top/bottom */}
            {(["top", "bottom"] as const).map((side) => (
              <div key={side} style={{
                position: "absolute",
                [side]: 3,
                left: "5%", right: "5%",
                height: 1,
                background: "linear-gradient(to right, transparent, rgba(90,68,20,0.45), rgba(140,105,35,0.55), rgba(90,68,20,0.45), transparent)",
              }} />
            ))}

            {/* Main row */}
            <div className="flex items-center">

              {/* Left medallion */}
              <Medallion color={props.color} glow={props.glow} />

              {/* Track */}
              <div
                ref={sliderAreaRef}
                onPointerDown={onPointerDown}
                className="cursor-pointer"
                style={{ flex: 1, position: "relative", height: 18 }}
              >
                {/* Carved stone channel */}
                <div style={{
                  position: "absolute",
                  top: 2, bottom: 2, left: 0, right: 0,
                  background: "linear-gradient(180deg, #010101 0%, #050403 50%, #020201 100%)",
                  border: "1px solid rgba(38,28,8,0.8)",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,1), inset 0 0 16px rgba(0,0,0,0.9)",
                }} />

                {/* Liquid fill — overflow:hidden clips the liquid to the filled region */}
                <motion.div
                  animate={{ width: `${precise}%` }}
                  style={{ position: "absolute", top: 3, bottom: 3, left: 0, overflow: "hidden" }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                >
                  {/* Liquid body: light top surface → full color → dark murky bottom */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `linear-gradient(180deg,
                      rgba(255,255,255,0.22) 0%,
                      ${props.color} 16%,
                      ${props.color} 52%,
                      ${props.dark} 100%)`,
                    boxShadow: `0 0 14px ${props.glow}, 0 0 32px ${props.glow}45`,
                  }} />

                  {/* Surface shimmer — a bright horizontal band that pulses at the waterline */}
                  <div style={{
                    position: "absolute",
                    top: 0, left: "-5%", right: "-5%", height: 3,
                    background: `linear-gradient(to right,
                      transparent 0%,
                      rgba(255,255,255,0.2) 15%,
                      rgba(255,255,255,0.75) 50%,
                      rgba(255,255,255,0.2) 85%,
                      transparent 100%)`,
                    animation: "liquid-surface 3s ease-in-out infinite",
                  }} />

                  {/* Slow-sweeping interior reflection */}
                  <div style={{
                    position: "absolute",
                    top: 1, height: "48%", width: "35%",
                    background: "linear-gradient(to right, transparent, rgba(255,255,255,0.11), transparent)",
                    animation: "liquid-reflect 5s ease-in-out infinite",
                  }} />

                  {/* Leading-edge meniscus — brighter right edge like liquid surface tension */}
                  <div style={{
                    position: "absolute",
                    top: 0, bottom: 0, right: 0, width: 4,
                    background: `linear-gradient(to right, transparent, rgba(255,255,255,0.42))`,
                    boxShadow: `2px 0 10px ${props.glow}`,
                  }} />
                </motion.div>

                {/* Tier boundary dividers at 33% / 67% — always on top of liquid */}
                {[33, 67].map((pos) => (
                  <div key={pos} style={{
                    position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2,
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(50,38,12,0.9) 30%, rgba(70,52,16,0.95) 50%, rgba(50,38,12,0.9) 70%, rgba(0,0,0,0.05))",
                    zIndex: 22, pointerEvents: "none", transform: "translateX(-50%)",
                  }} />
                ))}

                {/* Fine hairline notches every 10% */}
                {[10, 20, 40, 50, 60, 80, 90].map((pos) => (
                  <div key={pos} style={{
                    position: "absolute", top: 3, bottom: 3, left: `${pos}%`, width: 1,
                    background: "linear-gradient(to bottom, transparent, rgba(60,45,12,0.5), transparent)",
                    zIndex: 21, pointerEvents: "none", transform: "translateX(-50%)",
                  }} />
                ))}

                {/* Circle needle */}
                <motion.div
                  animate={{ left: `${precise}%` }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  style={{ position: "absolute", top: "50%", width: 20, height: 20, zIndex: 30, pointerEvents: "none", transform: "translate(-50%, -50%)" }}
                >
                  {/* Outer iron ring */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "radial-gradient(circle at 38% 32%, #2e2010, #090604)",
                    border: "1.5px solid rgba(200,160,50,0.85)",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.9), 0 0 8px rgba(220,170,40,0.55), inset 0 1px 0 rgba(200,160,50,0.18)",
                  }} />
                  {/* Center gem */}
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 7, height: 7, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), #ffcc00)",
                    boxShadow: "0 0 5px #ffcc00, 0 0 10px rgba(255,200,0,0.55)",
                  }} />
                </motion.div>
              </div>

              {/* Right medallion */}
              <Medallion color={props.color} glow={props.glow} />
            </div>
          </div>

        </div>

        {/* --- Info Panel (Iron Stat Plate) --- */}
        <motion.div
          key={tier.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            background: "linear-gradient(180deg, #1a1108 0%, #0d0902 60%, #141004 100%)",
            border: "1.5px solid rgba(90,68,24,0.7)",
            boxShadow: [
              "0 0 0 1px rgba(0,0,0,0.95)",
              "0 0 0 3px rgba(14,11,4,0.95)",
              "0 0 0 4.5px rgba(60,44,14,0.25)",
              "0 12px 40px rgba(0,0,0,0.9)",
              "inset 0 1px 0 rgba(160,120,40,0.05)",
            ].join(", "),
            position: "relative",
          }}>
            {/* Corner rivets */}
            {([
              { top: 4, left: 4 }, { top: 4, right: 4 },
              { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
            ] as React.CSSProperties[]).map((pos, i) => (
              <div key={i} style={{
                position: "absolute", ...pos,
                width: 5, height: 5, borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, rgba(170,130,45,0.9), rgba(40,30,8,1))",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
              }} />
            ))}

            {/* Left cell — Rank */}
            <div style={{ padding: "18px 24px", textAlign: "center", borderRight: "1px solid rgba(90,68,24,0.35)" }}>
              <div style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(140,105,35,0.45)", fontFamily: "Cinzel, serif", marginBottom: 8 }}>RANK</div>
              <motion.div
                key={tier.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 20, color: props.color, textShadow: `0 0 14px ${props.glow}`, letterSpacing: "0.08em" }}
              >
                {tier.label}
              </motion.div>
              <div style={{ marginTop: 8, fontSize: 9, fontFamily: "Cinzel, serif", fontStyle: "italic", color: "rgba(200,170,110,0.4)", letterSpacing: "0.1em" }}>
                {props.label}
              </div>
            </div>

            {/* Center cell — Power % */}
            <div style={{ padding: "14px 32px", textAlign: "center", borderRight: "1px solid rgba(90,68,24,0.35)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(140,105,35,0.45)", fontFamily: "Cinzel, serif", marginBottom: 4 }}>POWER</div>
              <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 42, lineHeight: 1, color: "#c49a22", textShadow: "0 0 12px rgba(196,154,34,0.45)" }}>
                {precise}<span style={{ fontSize: 18, opacity: 0.35 }}>%</span>
              </div>
            </div>

          </div>
        </motion.div>

        {/* --- Portal Button --- */}
        <button
          onClick={() => {
            setFading(true);
            setTimeout(() => onConfirm(tier.difficulty, precise, precise), 1000);
          }}
          disabled={busy || fading}
          style={{
            marginTop: 20,
            position: "relative",
            padding: "13px 56px",
            background: "linear-gradient(180deg, #1e1608 0%, #0d0902 100%)",
            border: "1.5px solid rgba(160,120,40,0.55)",
            boxShadow: [
              "0 0 0 1px rgba(0,0,0,0.95)",
              "0 0 0 3px rgba(10,8,2,0.95)",
              "0 0 0 4.5px rgba(80,60,16,0.2)",
              "0 8px 28px rgba(0,0,0,0.85)",
              "inset 0 1px 0 rgba(160,120,40,0.06)",
            ].join(", "),
            cursor: (busy || fading) ? "not-allowed" : "pointer",
            opacity: (busy || fading) ? 0.45 : 1,
            transition: "opacity 0.2s, box-shadow 0.2s, transform 0.1s",
          }}
          onMouseEnter={(e) => {
            if (busy || fading) return;
            (e.currentTarget as HTMLButtonElement).style.boxShadow = [
              "0 0 0 1px rgba(0,0,0,0.95)",
              "0 0 0 3px rgba(10,8,2,0.95)",
              "0 0 0 4.5px rgba(80,60,16,0.2)",
              "0 8px 28px rgba(0,0,0,0.85)",
              "0 0 22px rgba(196,154,34,0.18)",
              "inset 0 1px 0 rgba(160,120,40,0.1)",
            ].join(", ");
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = [
              "0 0 0 1px rgba(0,0,0,0.95)",
              "0 0 0 3px rgba(10,8,2,0.95)",
              "0 0 0 4.5px rgba(80,60,16,0.2)",
              "0 8px 28px rgba(0,0,0,0.85)",
              "inset 0 1px 0 rgba(160,120,40,0.06)",
            ].join(", ");
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
        >
          {/* Corner ornaments */}
          {([{ top: 5, left: 8 }, { top: 5, right: 8 }, { bottom: 5, left: 8 }, { bottom: 5, right: 8 }] as React.CSSProperties[]).map((pos, i) => (
            <span key={i} style={{ position: "absolute", ...pos, fontSize: 7, color: "rgba(160,120,40,0.5)", lineHeight: 1, pointerEvents: "none" }}>✦</span>
          ))}
          {/* Top / bottom hairlines */}
          {(["top", "bottom"] as const).map((side) => (
            <div key={side} style={{
              position: "absolute", [side]: 4, left: "15%", right: "15%", height: 1,
              background: "linear-gradient(to right, transparent, rgba(140,105,35,0.35), transparent)",
              pointerEvents: "none",
            }} />
          ))}
          <span style={{
            fontFamily: "Cinzel, serif",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.5em",
            color: "#c49a22",
            textShadow: "0 0 10px rgba(196,154,34,0.35)",
            textTransform: "uppercase",
            position: "relative",
          }}>
Initiate
          </span>
        </button>
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
