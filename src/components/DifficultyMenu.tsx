import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty } from "@/game/aiLevelService";
import slateTexture from "@/assets/slate-texture.jpg";

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
    console.log("[DifficultyMenu] dungeonDifficulty =", dungeonDifficulty);
    setFading(true);
    window.setTimeout(() => onConfirm(tier.difficulty, dungeonDifficulty), 1000);
  };

  // Hover glow color: amber by default, deep red on Master tier
  const glowHue = isMaster ? "0 85% 50%" : "30 100% 50%";

  return (
    <div
      className="fixed inset-0 m-0 p-0 overflow-hidden engraved-menu"
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        zIndex: 100,
        ["--glow" as string]: glowHue,
      }}
    >
      {/* Seamless slate stone background */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: `url(${slateTexture})`,
          backgroundRepeat: "repeat",
          backgroundSize: "512px 512px",
        }}
      />
      {/* Darkening + central torch wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% 42%,
              hsl(33 40% 30% / 0.35) 0%,
              hsl(0 0% 0% / 0.0) 45%,
              hsl(0 0% 0% / 0.55) 80%,
              hsl(0 0% 0% / 0.9) 100%)
          `,
          mixBlendMode: "multiply",
        }}
      />
      {/* Soft top torch glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: `radial-gradient(circle at 50% 14%, hsl(${glowHue} / 0.18) 0%, transparent 42%)`,
          transition: "background 400ms ease",
        }}
      />

      {/* Title bar */}
      <div className="absolute top-0 left-0 right-0 border-b border-black/70 px-4 py-2 flex items-center gap-3 z-10"
        style={{ background: "hsl(0 0% 0% / 0.55)", backdropFilter: "blur(2px)" }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[hsl(0_70%_45%)] border border-black/60" />
          <span className="w-3 h-3 rounded-full bg-[hsl(45_90%_55%)] border border-black/60" />
          <span className="w-3 h-3 rounded-full bg-[hsl(140_50%_45%)] border border-black/60" />
        </div>
        <span className="engraved engraved-sm text-[12px] tracking-wider">Claude Dungeon</span>
        <span className="ml-auto engraved engraved-muted text-[10px] uppercase tracking-[0.25em]">
          Chamber of Selection
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pt-16">
        <h1 className="engraved engraved-hover text-center" style={{ fontSize: 92, lineHeight: 1.05 }}>
          TERMINAL QUEST
        </h1>
        <div className="mt-3 engraved engraved-muted text-center" style={{ fontSize: 22, letterSpacing: "0.3em" }}>
          ☩ CHOOSE THY PERIL ☩
        </div>

        {/* Engraved slider */}
        <div className="mt-14 w-full max-w-3xl select-none">
          <div className="relative px-6 pt-20 pb-2">
            {/* Floating engraved counter above thumb */}
            <div
              className="absolute pointer-events-none transition-[left] duration-75 engraved engraved-hover"
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
              className="relative h-14 cursor-pointer outline-none focus-visible:ring-2 rounded-sm"
              style={{ ["--ring" as string]: `hsl(${glowHue} / 0.5)` }}
            >
              {/* Carved channel */}
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

              {/* Molten fill in the engraved channel */}
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
                    `0 0 16px hsl(${glowHue} / 0.4)`,
                  ].join(", "),
                  display: "grid",
                  placeItems: "center",
                  transition: "box-shadow 300ms ease",
                }}>
                  <span className="engraved" style={{ fontSize: 26, fontWeight: 900 }}>✦</span>
                </div>
              </div>
            </div>

            {/* End labels */}
            <div className="mt-7 flex items-center justify-between">
              <span className="engraved engraved-hover" style={{ fontSize: 20 }}>0 — NOVICE'S PATH</span>
              <span className="engraved engraved-hover" style={{ fontSize: 20 }}>100 — MASTER'S CHALLENGE</span>
            </div>

            {/* Tier readout */}
            <div className="mt-3 text-center engraved engraved-hover" style={{ fontSize: 22, letterSpacing: "0.2em" }}>
              ✦ TIER · {tier.label.toUpperCase()} ✦
            </div>
          </div>
        </div>

        {/* Manifest button — engraved into stone */}
        <button
          type="button"
          disabled={busy || fading}
          onClick={handleManifest}
          className="manifest-btn engraved engraved-hover mt-12 px-12 py-5"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.18em" }}
        >
          {busy || fading ? "MANIFESTING…" : "⚔  MANIFEST THE DUNGEON  ⚔"}
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
        .engraved-menu .engraved {
          font-family: 'Cinzel', 'MedievalSharp', serif;
          font-weight: 700;
          color: hsl(0 0% 18%);
          /* Letter-press: dark top-left shadow + light bottom-right highlight */
          text-shadow:
            -1px -1px 0 hsl(0 0% 0% / 0.85),
            -1px -1px 2px hsl(0 0% 0% / 0.6),
             1px  1px 0 hsl(0 0% 100% / 0.22),
             1px  2px 2px hsl(0 0% 100% / 0.12);
          transition: color 300ms ease, filter 300ms ease, text-shadow 300ms ease;
        }
        .engraved-menu .engraved-muted {
          color: hsl(0 0% 28%);
          font-weight: 600;
        }
        .engraved-menu .engraved-sm { font-weight: 600; }

        /* Molten-rune hover: glow from within with tier-colored drop-shadow */
        .engraved-menu .engraved-hover:hover,
        .engraved-menu .engraved-hover:focus-visible {
          color: hsl(var(--glow) / 0.92);
          text-shadow:
            -1px -1px 0 hsl(0 0% 0% / 0.9),
             1px  1px 0 hsl(0 0% 100% / 0.18),
             0 0 6px hsl(var(--glow) / 0.85),
             0 0 14px hsl(var(--glow) / 0.55),
             0 0 28px hsl(var(--glow) / 0.35);
          filter: drop-shadow(0 0 6px hsl(var(--glow) / 0.6));
        }

        .engraved-menu .manifest-btn {
          position: relative;
          background-color: hsl(0 0% 8%);
          background-image:
            linear-gradient(180deg, hsl(0 0% 100% / 0.06), transparent 40%),
            linear-gradient(0deg, hsl(0 0% 0% / 0.6), transparent 50%);
          border: 2px solid hsl(0 0% 4%);
          border-radius: 4px;
          box-shadow:
            inset 1px 1px 0 hsl(0 0% 100% / 0.12),
            inset -1px -1px 0 hsl(0 0% 0% / 0.85),
            inset 0 2px 6px hsl(0 0% 0% / 0.6),
            inset 0 -3px 5px hsl(0 0% 0% / 0.55),
            0 2px 0 hsl(0 0% 0% / 0.7),
            0 6px 14px hsl(0 0% 0% / 0.65);
          cursor: pointer;
          transition: box-shadow 250ms ease, transform 120ms ease;
        }
        .engraved-menu .manifest-btn:hover:not(:disabled) {
          box-shadow:
            inset 1px 1px 0 hsl(0 0% 100% / 0.12),
            inset -1px -1px 0 hsl(0 0% 0% / 0.85),
            inset 0 0 24px hsl(var(--glow) / 0.45),
            0 0 18px hsl(var(--glow) / 0.55),
            0 0 36px hsl(var(--glow) / 0.35);
        }
        .engraved-menu .manifest-btn:active:not(:disabled) { transform: translateY(2px); }
        .engraved-menu .manifest-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
};
