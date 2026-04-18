import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty } from "@/game/aiLevelService";

interface DifficultyMenuProps {
  onConfirm: (difficulty: Difficulty, value: number) => void;
  busy?: boolean;
}

const tierFor = (v: number): { label: string; difficulty: Difficulty } => {
  if (v < 34) return { label: "Novice", difficulty: "easy" };
  if (v < 67) return { label: "Adept", difficulty: "medium" };
  return { label: "Master", difficulty: "hard" };
};

export const DifficultyMenu = ({ onConfirm, busy }: DifficultyMenuProps) => {
  const [dungeonDifficulty, setDungeonDifficulty] = useState<number>(50);
  const [fading, setFading] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const tier = tierFor(dungeonDifficulty);

  const setFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDungeonDifficulty(Math.round(pct * 100));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      setFromClientX(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  const onTrackPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setFromClientX(e.clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setDungeonDifficulty((v) => Math.max(0, v - 1));
    else if (e.key === "ArrowRight") setDungeonDifficulty((v) => Math.min(100, v + 1));
    else if (e.key === "Home") setDungeonDifficulty(0);
    else if (e.key === "End") setDungeonDifficulty(100);
  };

  const handleManifest = () => {
    if (busy || fading) return;
    console.log("[DifficultyMenu] dungeonDifficulty =", dungeonDifficulty);
    setFading(true);
    window.setTimeout(() => onConfirm(tier.difficulty, dungeonDifficulty), 1000);
  };

  // Engraved (intaglio) text style — light highlight on top, deep shadow inside
  const engravedTextStyle = (size: number, color = "hsl(30 12% 22%)"): React.CSSProperties => ({
    fontFamily: "'MedievalSharp', 'Cinzel', serif",
    fontWeight: 700,
    fontSize: size,
    color,
    letterSpacing: "0.04em",
    textShadow: [
      "0 -1px 0 hsl(0 0% 0% / 0.85)",
      "0 1px 0 hsl(30 25% 55% / 0.55)",
      "0 2px 1px hsl(30 25% 60% / 0.25)",
      "inset 0 0 0 transparent",
    ].join(", "),
    filter: "drop-shadow(0 1px 0 hsl(30 25% 60% / 0.18))",
  });

  return (
    <div className="fixed inset-0 m-0 p-0 overflow-hidden"
      style={{ width: "100vw", height: "100vh", background: "#000", zIndex: 100 }}>

      {/* Stone wall background — large blocks, mortar lines, grain */}
      <div className="absolute inset-0" aria-hidden style={{
        backgroundColor: "hsl(30 8% 32%)",
        backgroundImage: `
          /* central torch wash */
          radial-gradient(ellipse 75% 65% at 50% 42%,
            hsl(33 30% 42%) 0%,
            hsl(30 12% 30%) 35%,
            hsl(28 10% 18%) 75%,
            hsl(0 0% 4%) 100%),
          /* fine pitted grain */
          radial-gradient(hsl(0 0% 0% / 0.35) 1px, transparent 1.4px),
          radial-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1.4px),
          /* mortar — horizontal courses */
          repeating-linear-gradient(0deg,
            transparent 0 118px,
            hsl(0 0% 0% / 0.85) 118px 122px,
            hsl(30 14% 22% / 0.6) 122px 124px),
          /* mortar — staggered verticals (course A) */
          repeating-linear-gradient(90deg,
            transparent 0 158px,
            hsl(0 0% 0% / 0.75) 158px 162px)
        `,
        backgroundSize: "100% 100%, 5px 5px, 7px 7px, 100% 100%, 100% 244px",
        backgroundPosition: "0 0, 0 0, 2px 3px, 0 0, 0 0",
        backgroundBlendMode: "normal, multiply, overlay, normal, normal",
      }} />
      {/* Second mortar layer offset to fake brick stagger */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        backgroundImage: `repeating-linear-gradient(90deg,
            transparent 0 158px,
            hsl(0 0% 0% / 0.75) 158px 162px)`,
        backgroundSize: "100% 244px",
        backgroundPosition: "80px 122px",
      }} />
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        background: "radial-gradient(ellipse at center, transparent 35%, hsl(0 0% 0% / 0.55) 80%, hsl(0 0% 0%) 100%)",
      }} />
      {/* Soft top torch glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        background: "radial-gradient(circle at 50% 18%, hsl(33 100% 50% / 0.18) 0%, transparent 40%)",
      }} />

      {/* Title bar */}
      <div className="absolute top-0 left-0 right-0 carved-stone-tex border-b-2 border-stone-slab-edge px-4 py-2 flex items-center gap-3 z-10">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[hsl(0_70%_45%)] border border-black/60" />
          <span className="w-3 h-3 rounded-full bg-[hsl(45_90%_55%)] border border-black/60" />
          <span className="w-3 h-3 rounded-full bg-[hsl(140_50%_45%)] border border-black/60" />
        </div>
        <span className="font-pixel carved-gold text-[11px] tracking-wider">Claude Dungeon</span>
        <span className="ml-auto font-pixel text-[9px] uppercase tracking-[0.2em] text-[hsl(0_0%_55%)]">
          Chamber of Selection
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pt-16">
        {/* Engraved title */}
        <h1 className="text-center" style={engravedTextStyle(96)}>
          Dungeon Difficulty
        </h1>
        <div className="mt-2 text-center" style={engravedTextStyle(28, "hsl(30 12% 28%)")}>
          ☩  choose thy peril  ☩
        </div>

        {/* Engraved slider — chiseled groove in the stone wall */}
        <div className="mt-14 w-full max-w-3xl select-none">
          <div className="relative px-6 pt-20 pb-2">
            {/* Floating engraved counter above thumb */}
            <div
              className="absolute pointer-events-none transition-[left] duration-75"
              style={{
                left: `calc(28px + (100% - 56px) * ${dungeonDifficulty / 100})`,
                top: 0,
                transform: "translateX(-50%)",
                fontFamily: "'MedievalSharp', 'Cinzel', serif",
                fontWeight: 900,
                fontSize: 56,
                color: "hsl(30 14% 24%)",
                letterSpacing: "0.04em",
                textShadow: [
                  "0 -1px 0 hsl(0 0% 0% / 0.9)",
                  "0 1px 0 hsl(30 28% 58% / 0.6)",
                  "0 2px 2px hsl(30 28% 60% / 0.25)",
                ].join(", "),
              }}
              aria-hidden
            >
              {dungeonDifficulty}
            </div>

            {/* Engraved groove channel */}
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={dungeonDifficulty}
              aria-label="Dungeon difficulty"
              onPointerDown={onTrackPointerDown}
              onKeyDown={onKeyDown}
              className="relative h-14 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[hsl(33_100%_50%/0.5)] rounded-sm"
            >
              {/* Carved channel — deep recessed groove in stone */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-7 rounded-sm" style={{
                background: "linear-gradient(180deg, hsl(0 0% 0% / 0.85) 0%, hsl(0 0% 0% / 0.55) 50%, hsl(30 18% 30% / 0.4) 100%)",
                boxShadow: [
                  "inset 0 3px 4px hsl(0 0% 0% / 0.95)",
                  "inset 0 -2px 0 hsl(30 25% 55% / 0.5)",
                  "inset 2px 0 3px hsl(0 0% 0% / 0.85)",
                  "inset -2px 0 3px hsl(0 0% 0% / 0.85)",
                  "0 1px 0 hsl(30 25% 58% / 0.55)",
                  "0 -1px 0 hsl(0 0% 0% / 0.7)",
                ].join(", "),
                border: "1px solid hsl(0 0% 0% / 0.95)",
              }} />

              {/* Engraved chisel-mark notches inside groove */}
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="absolute top-1/2" aria-hidden style={{
                  left: `${i * 10}%`,
                  width: 2,
                  height: i % 5 === 0 ? 22 : 14,
                  transform: "translate(-50%, -50%)",
                  background: "hsl(0 0% 0% / 0.95)",
                  boxShadow: "1px 0 0 hsl(30 28% 58% / 0.45), -1px 0 0 hsl(0 0% 0% / 0.85)",
                }} />
              ))}

              {/* Ember-lit fill in the engraved channel (molten gold seeping into the carving) */}
              <div className="absolute top-1/2 -translate-y-1/2 h-3 rounded-sm pointer-events-none"
                style={{
                  left: 6,
                  width: `calc((100% - 12px) * ${dungeonDifficulty / 100})`,
                  background: "linear-gradient(90deg, hsl(33 90% 30%) 0%, hsl(33 100% 50%) 60%, hsl(45 95% 70%) 100%)",
                  boxShadow: "0 0 8px hsl(33 100% 50% / 0.85), 0 0 18px hsl(33 100% 45% / 0.55), inset 0 1px 0 hsl(45 100% 80% / 0.6), inset 0 -1px 0 hsl(20 90% 25%)",
                }} aria-hidden />

              {/* Stone tablet thumb — looks like a chiseled slider stone embedded in the wall */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `calc(28px + (100% - 56px) * ${dungeonDifficulty / 100})`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                aria-hidden
              >
                <div style={{
                  width: 44,
                  height: 56,
                  borderRadius: 4,
                  backgroundColor: "hsl(30 10% 38%)",
                  backgroundImage: `
                    linear-gradient(180deg, hsl(30 18% 52%) 0%, hsl(30 12% 38%) 45%, hsl(28 10% 24%) 100%),
                    radial-gradient(hsl(0 0% 0% / 0.4) 1px, transparent 1.4px),
                    radial-gradient(hsl(0 0% 100% / 0.07) 1px, transparent 1.4px)
                  `,
                  backgroundSize: "100% 100%, 5px 5px, 7px 7px",
                  backgroundPosition: "0 0, 0 0, 2px 3px",
                  border: "2px solid hsl(0 0% 4%)",
                  boxShadow: [
                    "inset 1px 1px 0 hsl(30 25% 65% / 0.6)",
                    "inset -1px -1px 0 hsl(0 0% 0% / 0.85)",
                    "inset 0 -3px 4px hsl(0 0% 0% / 0.55)",
                    "0 3px 0 hsl(0 0% 0% / 0.8)",
                    "0 6px 12px hsl(0 0% 0% / 0.7)",
                    "0 0 16px hsl(33 100% 50% / 0.4)",
                  ].join(", "),
                  display: "grid",
                  placeItems: "center",
                }}>
                  {/* Engraved rune on the stone */}
                  <span style={{
                    fontFamily: "'MedievalSharp', serif",
                    fontSize: 26,
                    fontWeight: 900,
                    color: "hsl(30 14% 22%)",
                    textShadow: "0 -1px 0 hsl(0 0% 0% / 0.9), 0 1px 0 hsl(30 28% 65% / 0.6)",
                  }}>✦</span>
                </div>
              </div>
            </div>

            {/* Engraved end labels */}
            <div className="mt-7 flex items-center justify-between">
              <span style={engravedTextStyle(20)}>0 — Novice's Path</span>
              <span style={engravedTextStyle(20)}>100 — Master's Challenge</span>
            </div>

            {/* Engraved tier readout */}
            <div className="mt-3 text-center" style={engravedTextStyle(22, "hsl(30 14% 26%)")}>
              ✦ Tier · {tier.label} ✦
            </div>
          </div>
        </div>

        {/* Manifest button */}
        <button
          type="button"
          disabled={busy || fading}
          onClick={handleManifest}
          className="manifest-btn mt-12 px-12 py-5"
          style={{
            fontFamily: "'MedievalSharp', 'Cinzel', serif",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          {busy || fading ? "Manifesting…" : "⚔  Manifest the Dungeon  ⚔"}
        </button>
      </div>

      {/* Fade-to-black overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        background: "#000",
        opacity: fading ? 1 : 0,
        transition: "opacity 1000ms ease-in",
        zIndex: 50,
      }} />

      <style>{`
        .manifest-btn {
          position: relative;
          color: hsl(45 85% 72%);
          background-color: hsl(228 10% 20%);
          background-image:
            linear-gradient(180deg, hsl(0 0% 100% / 0.10), transparent 35%),
            linear-gradient(0deg, hsl(0 0% 0% / 0.55), transparent 45%),
            radial-gradient(hsl(0 0% 100% / 0.05) 1px, transparent 1.4px),
            radial-gradient(hsl(0 0% 0% / 0.4) 1px, transparent 1.4px);
          background-size: 100% 100%, 100% 100%, 5px 5px, 7px 7px;
          background-position: 0 0, 0 0, 0 0, 2px 3px;
          border: 3px solid hsl(20 35% 18%);
          border-radius: 4px;
          box-shadow:
            inset 0 0 0 1px hsl(18 40% 12%),
            inset 1px 1px 0 hsl(228 12% 38% / 0.8),
            inset -1px -1px 0 hsl(0 0% 0% / 0.8),
            inset 0 2px 6px hsl(0 0% 0% / 0.6),
            inset 0 -3px 5px hsl(0 0% 0% / 0.55),
            0 2px 0 hsl(0 0% 0% / 0.7),
            0 6px 14px hsl(0 0% 0% / 0.65);
          text-shadow: 0 1px 0 hsl(0 0% 0% / 0.95);
          transition: all 200ms ease;
        }
        .manifest-btn:hover:not(:disabled) {
          color: hsl(33 100% 75%);
          box-shadow:
            inset 0 0 0 1px hsl(33 100% 35%),
            inset 0 0 22px hsl(33 100% 50% / 0.45),
            0 0 18px hsl(33 100% 50% / 0.6),
            0 0 36px hsl(33 100% 45% / 0.4);
          text-shadow: 0 0 6px hsl(33 100% 55% / 0.9), 0 0 14px hsl(33 100% 50% / 0.6), 0 1px 0 hsl(0 0% 0% / 0.95);
        }
        .manifest-btn:active:not(:disabled) { transform: translateY(2px); }
        .manifest-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
};
