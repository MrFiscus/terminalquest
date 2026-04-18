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
    const onUp = () => {
      draggingRef.current = false;
    };
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
    window.setTimeout(() => {
      onConfirm(tier.difficulty, dungeonDifficulty);
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 m-0 p-0 overflow-hidden"
      style={{ width: "100vw", height: "100vh", background: "#000", zIndex: 100 }}
    >
      {/* Honed slate background with central radial light */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "hsl(0 0% 9%)",
          backgroundImage: `
            radial-gradient(ellipse 70% 60% at 50% 45%,
              hsl(0 0% 16%) 0%,
              hsl(0 0% 11%) 40%,
              hsl(0 0% 6%) 75%,
              hsl(0 0% 3%) 100%),
            repeating-linear-gradient(0deg, hsl(0 0% 100% / 0.014) 0 1px, transparent 1px 3px),
            repeating-linear-gradient(90deg, hsl(0 0% 0% / 0.18) 0 1px, transparent 1px 4px)
          `,
          backgroundBlendMode: "normal, overlay, multiply",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, hsl(33 100% 50% / 0.10) 0%, transparent 45%)",
        }}
        aria-hidden
      />

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
        <h1
          className="text-center"
          style={{
            fontFamily: "'Caveat', 'Kalam', cursive",
            fontSize: "clamp(44px, 7vw, 96px)",
            fontWeight: 700,
            lineHeight: 1.05,
            color: "hsl(45 95% 60%)",
            textShadow: `
              0 0 8px hsl(33 100% 50% / 0.7),
              0 0 18px hsl(33 100% 50% / 0.45),
              0 0 38px hsl(33 100% 45% / 0.35),
              0 2px 0 hsl(0 0% 0% / 0.9)
            `,
            transform: "rotate(-1.5deg)",
          }}
        >
          Dungeon Difficulty Level?
        </h1>

        {/* Custom iron-rail slider */}
        <div className="mt-16 w-full max-w-3xl select-none">
          <div className="relative px-6 pt-20 pb-2">
            {/* Floating value counter above the thumb */}
            <div
              className="absolute pointer-events-none transition-[left] duration-75"
              style={{
                left: `calc(24px + (100% - 48px) * ${dungeonDifficulty / 100})`,
                top: 0,
                transform: "translateX(-50%)",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "32px",
                color: "hsl(45 95% 62%)",
                textShadow: `
                  0 0 6px hsl(33 100% 50% / 0.9),
                  0 0 16px hsl(33 100% 50% / 0.55),
                  0 0 32px hsl(33 100% 45% / 0.35),
                  0 2px 0 hsl(0 0% 0% / 0.95)
                `,
                letterSpacing: "0.05em",
              }}
              aria-hidden
            >
              {dungeonDifficulty}
            </div>

            {/* Iron rail track with carved stone notches */}
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
              className="relative h-12 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[hsl(33_100%_50%/0.6)] rounded"
            >
              {/* Stone bed under the rail with carved notches */}
              <div
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-9 rounded"
                style={{
                  background: `
                    repeating-linear-gradient(90deg,
                      hsl(0 0% 0% / 0.55) 0 1px,
                      transparent 1px 10%),
                    linear-gradient(180deg, hsl(228 8% 22%) 0%, hsl(228 10% 12%) 50%, hsl(228 8% 18%) 100%)
                  `,
                  boxShadow:
                    "inset 0 2px 0 hsl(228 12% 32% / 0.6), inset 0 -2px 0 hsl(0 0% 0% / 0.85), inset 0 0 18px hsl(0 0% 0% / 0.7), 0 2px 6px hsl(0 0% 0% / 0.7)",
                  border: "2px solid hsl(0 0% 4%)",
                }}
              />
              {/* Carved notch markers (every 10%) */}
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2"
                  style={{
                    left: `${i * 10}%`,
                    width: 2,
                    height: i % 5 === 0 ? 18 : 12,
                    transform: "translate(-50%, -50%)",
                    background: "hsl(0 0% 0%)",
                    boxShadow:
                      "1px 0 0 hsl(228 14% 38% / 0.45), -1px 0 0 hsl(0 0% 0% / 0.9)",
                    borderRadius: 1,
                  }}
                  aria-hidden
                />
              ))}

              {/* The iron rail itself */}
              <div
                className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-2 rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(0 0% 32%) 0%, hsl(0 0% 18%) 35%, hsl(0 0% 8%) 65%, hsl(0 0% 22%) 100%)",
                  boxShadow:
                    "inset 0 1px 0 hsl(0 0% 45% / 0.7), inset 0 -1px 0 hsl(0 0% 0% / 0.9), 0 2px 4px hsl(0 0% 0% / 0.85), 0 0 10px hsl(0 0% 0% / 0.6)",
                  border: "1px solid hsl(0 0% 3%)",
                }}
                aria-hidden
              />
              {/* Ember-lit filled portion */}
              <div
                className="absolute left-2 top-1/2 -translate-y-1/2 h-2 rounded-full pointer-events-none"
                style={{
                  width: `calc((100% - 16px) * ${dungeonDifficulty / 100})`,
                  background:
                    "linear-gradient(90deg, hsl(33 100% 35%) 0%, hsl(33 100% 50%) 60%, hsl(45 95% 65%) 100%)",
                  boxShadow:
                    "0 0 8px hsl(33 100% 50% / 0.85), 0 0 18px hsl(33 100% 45% / 0.55)",
                }}
                aria-hidden
              />

              {/* Iron Key + Torch sprite (thumb) */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `calc(24px + (100% - 48px) * ${dungeonDifficulty / 100})`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  filter:
                    "drop-shadow(0 0 8px hsl(33 100% 50% / 0.85)) drop-shadow(0 0 18px hsl(33 100% 45% / 0.5)) drop-shadow(0 2px 2px hsl(0 0% 0% / 0.85))",
                }}
                aria-hidden
              >
                <KeyTorchSprite />
              </div>
            </div>

            {/* End labels */}
            <div className="mt-6 flex items-center justify-between font-pixel text-[10px] tracking-[0.2em] uppercase text-[hsl(0_0%_62%)]">
              <span style={{ textShadow: "0 1px 0 hsl(0 0% 0% / 0.9)" }}>
                0 — Novice's Path
              </span>
              <span style={{ textShadow: "0 1px 0 hsl(0 0% 0% / 0.9)" }}>
                100 — Master's Challenge
              </span>
            </div>

            {/* Tier readout */}
            <div className="mt-3 text-center font-pixel text-[11px] tracking-[0.25em] uppercase">
              <span className="text-[hsl(0_0%_45%)]">Tier · </span>
              <span
                style={{
                  color: "hsl(45 95% 65%)",
                  textShadow: "0 0 6px hsl(33 100% 50% / 0.55)",
                }}
              >
                {tier.label}
              </span>
            </div>
          </div>
        </div>

        {/* Manifest button */}
        <button
          type="button"
          disabled={busy || fading}
          onClick={handleManifest}
          className="manifest-btn mt-12 font-pixel text-[14px] tracking-[0.18em] uppercase px-10 py-5"
        >
          {busy || fading ? "Manifesting…" : "Manifest the Dungeon"}
        </button>
      </div>

      {/* Fade-to-black overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "#000",
          opacity: fading ? 1 : 0,
          transition: "opacity 1000ms ease-in",
          zIndex: 50,
        }}
        aria-hidden
      />

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
            inset 1px 1px 0 hsl(228 12% 42% / 0.9),
            inset -1px -1px 0 hsl(0 0% 0% / 0.8),
            inset 0 0 22px hsl(33 100% 50% / 0.45),
            inset 0 2px 6px hsl(0 0% 0% / 0.6),
            0 0 18px hsl(33 100% 50% / 0.6),
            0 0 36px hsl(33 100% 45% / 0.4);
          text-shadow:
            0 0 6px hsl(33 100% 55% / 0.9),
            0 0 14px hsl(33 100% 50% / 0.6),
            0 1px 0 hsl(0 0% 0% / 0.95);
        }
        .manifest-btn:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow:
            inset 0 3px 8px hsl(0 0% 0% / 0.85),
            inset 0 0 16px hsl(33 100% 50% / 0.35);
        }
        .manifest-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes torch-flame {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.95; }
          50%      { transform: scaleY(1.12) translateY(-1px); opacity: 1; }
        }
        .torch-flame { transform-origin: 50% 100%; animation: torch-flame 0.45s infinite alternate ease-in-out; }
      `}</style>
    </div>
  );
};

/** Pixel-styled iron key with a torch-emblem hilt. */
const KeyTorchSprite = () => (
  <svg
    width="56"
    height="44"
    viewBox="0 0 56 44"
    style={{ imageRendering: "pixelated" as const, shapeRendering: "crispEdges" }}
  >
    {/* Key shaft (horizontal iron bar) */}
    <rect x="20" y="20" width="22" height="4" fill="hsl(0 0% 18%)" />
    <rect x="20" y="19" width="22" height="1" fill="hsl(0 0% 38%)" />
    <rect x="20" y="24" width="22" height="1" fill="hsl(0 0% 6%)" />
    {/* Key teeth */}
    <rect x="36" y="24" width="2" height="4" fill="hsl(0 0% 14%)" />
    <rect x="40" y="24" width="2" height="6" fill="hsl(0 0% 14%)" />
    <rect x="36" y="28" width="2" height="1" fill="hsl(0 0% 4%)" />
    <rect x="40" y="30" width="2" height="1" fill="hsl(0 0% 4%)" />

    {/* Key bow (hilt) — circular iron */}
    <circle cx="14" cy="22" r="9" fill="hsl(0 0% 12%)" />
    <circle cx="14" cy="22" r="9" fill="none" stroke="hsl(0 0% 4%)" strokeWidth="1" />
    <circle cx="14" cy="22" r="5" fill="hsl(0 0% 6%)" />
    <circle cx="11" cy="19" r="1.4" fill="hsl(0 0% 35%)" opacity="0.7" />

    {/* Torch emblem on the hilt */}
    {/* Torch handle */}
    <rect x="13" y="22" width="2" height="5" fill="hsl(28 55% 28%)" />
    <rect x="13" y="22" width="1" height="5" fill="hsl(28 65% 40%)" />
    {/* Torch cup */}
    <rect x="11" y="20" width="6" height="2" fill="hsl(0 0% 22%)" />
    <rect x="11" y="20" width="6" height="1" fill="hsl(0 0% 38%)" />
    {/* Flame */}
    <g className="torch-flame">
      <path d="M14 11 L17 16 L15 16 L16 19 L14 17 L12 19 L13 16 L11 16 Z" fill="hsl(45 100% 60%)" />
      <path d="M14 13 L16 17 L14 16 L12 17 Z" fill="hsl(20 100% 55%)" />
      <rect x="13.5" y="14" width="1" height="2" fill="hsl(60 100% 80%)" />
    </g>
    {/* Flame glow */}
    <circle cx="14" cy="15" r="6" fill="hsl(33 100% 50%)" opacity="0.18" />
  </svg>
);
