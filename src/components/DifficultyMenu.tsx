import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty } from "@/game/aiLevelService";
import slateTexture from "@/assets/slate-texture.jpg";

interface DifficultyMenuProps {
  onConfirm: (difficulty: Difficulty, value: number) => void;
  busy?: boolean;
}

const TAGLINES = [
  "CHOOSE THY PERIL",
  "EVERY COMMAND IS A SPELL",
  "THE DUNGEON ADAPTS TO THEE",
  "TURN BACK, OR PRESS ONWARD",
];

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
  const isMaster = tier.difficulty === "hard";

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
    setFading(true);
    window.setTimeout(() => onConfirm(tier.difficulty, dungeonDifficulty), 1000);
  };

  // Master tier subtly shifts the ember glow toward deep red
  const glowHue = isMaster ? "0 85% 50%" : "33 100% 50%";

  return (
    <div
      className="fixed inset-0 m-0 p-0 overflow-hidden engraved-menu"
      style={{
        width: "100vw",
        height: "100vh",
        zIndex: 100,
        backgroundColor: "hsl(230 18% 5%)",
        backgroundImage: `radial-gradient(ellipse at 50% 30%, hsl(230 14% 14%) 0%, hsl(230 18% 7%) 55%, hsl(230 22% 3%) 100%), url(${slateTexture})`,
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "100% 100%, cover",
        backgroundPosition: "center, center",
        backgroundBlendMode: "multiply, normal",
        ["--glow" as string]: glowHue,
      }}
    >
      {/* Global vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: "radial-gradient(ellipse at center, transparent 38%, hsl(0 0% 0% / 0.85) 100%)" }}
      />
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          opacity: 0.35,
          mixBlendMode: "overlay",
          backgroundImage:
            "radial-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1.4px), radial-gradient(hsl(0 0% 0% / 0.4) 1px, transparent 1.4px)",
          backgroundSize: "5px 5px, 7px 7px",
          backgroundPosition: "0 0, 2px 3px",
        }}
      />
      {/* Breathing torch wash */}
      <div
        className="lp-breathe absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 45%, hsl(${glowHue} / 0.22) 0%, transparent 60%)`,
          mixBlendMode: "screen",
          transition: "background 400ms ease",
        }}
      />
      <div
        className="lp-breathe absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: `radial-gradient(circle at 50% 12%, hsl(${glowHue} / 0.16) 0%, transparent 44%)`,
          animationDelay: "1.2s",
        }}
      />

      {/* Ember particles */}
      {Array.from({ length: 10 }).map((_, i) => {
        const left = 6 + (i * 11) % 90;
        const dur = 6 + (i % 4) * 1.2;
        const delay = (i * 0.9) % 7;
        const drift = (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 4);
        const bottom = 8 + (i * 7) % 30;
        return (
          <span key={i} className="lp-ember" style={{
            left: `${left}%`,
            bottom: `${bottom}%`,
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
            ["--ember-drift" as never]: `${drift}px`,
          }} />
        );
      })}

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        <h1
          className="lp-silver-cast lp-hero-in text-center"
          style={{
            margin: 0,
            fontFamily: "'Cinzel', 'Pirata One', serif",
            fontWeight: 900,
            letterSpacing: "0.05em",
            fontSize: "clamp(48px, 7.5vw, 104px)",
            lineHeight: 1,
            animationDelay: "0ms",
          }}
        >
          TERMINAL QUEST
        </h1>

        <p
          className="lp-eng lp-hero-in text-center"
          style={{
            fontSize: "clamp(11px, 1.5vw, 16px)",
            letterSpacing: "0.32em",
            marginTop: 18,
            color: "hsl(0 0% 26%)",
            fontWeight: 600,
            animationDelay: "220ms",
          }}
        >
          ☩ DON'T JUST PLAY THE GAME. WRITE THE REALITY. ☩
        </p>

        {/* Tagline rotator */}
        <div
          className="lp-hero-in"
          style={{ height: 26, marginTop: 14, position: "relative", width: "100%", maxWidth: 560, animationDelay: "420ms" }}
        >
          {TAGLINES.map((t, i) => (
            <span
              key={i}
              className="lp-tagline lp-eng"
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "clamp(10px, 1.3vw, 14px)", letterSpacing: "0.22em",
                color: `hsl(${glowHue.split(" ")[0]} 70% 52%)`,
                fontWeight: 600,
                textShadow: `0 0 10px hsl(${glowHue} / 0.35), 0 1px 0 hsl(0 0% 0% / 0.8)`,
                animationDelay: `${i * 4}s`,
                animationDuration: `${TAGLINES.length * 4}s`,
                opacity: 0,
                transition: "color 300ms ease, text-shadow 300ms ease",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Engraved slider */}
        <div className="lp-hero-in mt-14 w-full max-w-3xl select-none" style={{ animationDelay: "640ms" }}>
          <div className="relative px-6 pt-20 pb-2">
            {/* Floating engraved counter above thumb */}
            <div
              className="absolute pointer-events-none transition-[left] duration-75 lp-eng-glow"
              style={{
                left: `calc(28px + (100% - 56px) * ${dungeonDifficulty / 100})`,
                top: 0,
                transform: "translateX(-50%)",
                fontSize: 56,
                fontWeight: 900,
              }}
              aria-hidden
            >
              {dungeonDifficulty}
            </div>

            {/* Carved channel */}
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
              className="relative h-14 cursor-pointer outline-none rounded-sm"
            >
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-7 rounded-sm" style={{
                background: "linear-gradient(180deg, hsl(0 0% 0% / 0.85) 0%, hsl(0 0% 0% / 0.55) 50%, hsl(220 8% 22% / 0.4) 100%)",
                boxShadow: [
                  "inset 0 3px 4px hsl(0 0% 0% / 0.95)",
                  "inset 0 -2px 0 hsl(0 0% 100% / 0.18)",
                  "inset 2px 0 3px hsl(0 0% 0% / 0.85)",
                  "inset -2px 0 3px hsl(0 0% 0% / 0.85)",
                  "0 1px 0 hsl(0 0% 100% / 0.18)",
                  "0 -1px 0 hsl(0 0% 0% / 0.7)",
                ].join(", "),
                border: "1px solid hsl(0 0% 0% / 0.95)",
              }} />

              {/* Chisel notches */}
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="absolute top-1/2" aria-hidden style={{
                  left: `${i * 10}%`,
                  width: 2,
                  height: i % 5 === 0 ? 22 : 14,
                  transform: "translate(-50%, -50%)",
                  background: "hsl(0 0% 0% / 0.95)",
                  boxShadow: "1px 0 0 hsl(0 0% 100% / 0.2), -1px 0 0 hsl(0 0% 0% / 0.85)",
                }} />
              ))}

              {/* Molten fill */}
              <div className="absolute top-1/2 -translate-y-1/2 h-3 rounded-sm pointer-events-none"
                style={{
                  left: 6,
                  width: `calc((100% - 12px) * ${dungeonDifficulty / 100})`,
                  background: `linear-gradient(90deg, hsl(${glowHue} / 0.5) 0%, hsl(${glowHue}) 60%, hsl(45 95% 75%) 100%)`,
                  boxShadow: `0 0 8px hsl(${glowHue} / 0.85), 0 0 18px hsl(${glowHue} / 0.55), inset 0 1px 0 hsl(45 100% 80% / 0.6), inset 0 -1px 0 hsl(0 0% 0% / 0.5)`,
                  transition: "background 300ms ease, box-shadow 300ms ease",
                }} aria-hidden />

              {/* Stone tablet thumb */}
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
                  backgroundImage: `url(${slateTexture})`,
                  backgroundSize: "200px 200px",
                  border: "2px solid hsl(0 0% 4%)",
                  boxShadow: [
                    "inset 1px 1px 0 hsl(0 0% 100% / 0.18)",
                    "inset -1px -1px 0 hsl(0 0% 0% / 0.85)",
                    "inset 0 -3px 4px hsl(0 0% 0% / 0.55)",
                    "0 3px 0 hsl(0 0% 0% / 0.8)",
                    "0 6px 12px hsl(0 0% 0% / 0.7)",
                    `0 0 16px hsl(${glowHue} / 0.5)`,
                  ].join(", "),
                  display: "grid",
                  placeItems: "center",
                  transition: "box-shadow 300ms ease",
                }}>
                  <span className="lp-eng-glow" style={{ fontSize: 26, fontWeight: 900 }}>✦</span>
                </div>
              </div>
            </div>

            {/* End labels */}
            <div className="mt-3 flex items-start justify-between px-1">
              <div className="flex flex-col items-start">
                <span className="lp-eng" style={{ fontSize: 22, fontWeight: 900, color: "hsl(0 0% 28%)" }}>0</span>
                <span className="lp-eng mt-1" style={{ fontSize: 12, letterSpacing: "0.22em", color: "hsl(0 0% 26%)" }}>NOVICE'S PATH</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="lp-eng" style={{ fontSize: 22, fontWeight: 900, color: "hsl(0 0% 28%)" }}>100</span>
                <span className="lp-eng mt-1" style={{ fontSize: 12, letterSpacing: "0.22em", color: "hsl(0 0% 26%)" }}>MASTER'S CHALLENGE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Manifest button — exact landing page hero CTA */}
        <button
          type="button"
          disabled={busy || fading}
          onClick={handleManifest}
          className="lp-stone-btn lp-stone-btn-sweep lp-hero-in mt-12"
          style={{
            padding: "16px 40px",
            fontSize: "clamp(11px, 1.5vw, 15px)",
            animationDelay: "860ms",
            opacity: busy || fading ? 0.6 : 1,
            cursor: busy || fading ? "not-allowed" : "pointer",
            border: "none",
          }}
        >
          <span className="lp-eng-glow">
            {busy || fading ? "▶  MANIFESTING…" : "▶  MANIFEST THE DUNGEON"}
          </span>
        </button>

        {/* Scroll cue */}
        <div
          className="lp-scroll-cue lp-eng"
          style={{
            marginTop: 36, fontSize: 9, letterSpacing: "0.3em", color: "hsl(0 0% 26%)",
            fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}
        >
          <span>DRAG THE STONE TO CHOOSE</span>
          <span style={{ fontSize: 14, lineHeight: 1 }}>◆</span>
        </div>
      </div>

      {/* Fade-to-black overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
        background: "#000",
        opacity: fading ? 1 : 0,
        transition: "opacity 1000ms ease-in",
        zIndex: 50,
      }} />
    </div>
  );
};
