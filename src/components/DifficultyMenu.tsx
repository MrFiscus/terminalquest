import { useState } from "react";
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
  const [value, setValue] = useState(50);
  const tier = tierFor(value);

  return (
    <div
      className="fixed inset-0 m-0 p-0 overflow-hidden"
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        zIndex: 100,
      }}
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
      {/* Central torch glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, hsl(33 100% 50% / 0.10) 0%, transparent 45%)",
        }}
        aria-hidden
      />

      {/* Title bar — Claude Dungeon */}
      <div className="absolute top-0 left-0 right-0 carved-stone-tex border-b-2 border-stone-slab-edge px-4 py-2 flex items-center gap-3 z-10">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[hsl(0_70%_45%)] border border-black/60" />
          <span className="w-3 h-3 rounded-full bg-[hsl(45_90%_55%)] border border-black/60" />
          <span className="w-3 h-3 rounded-full bg-[hsl(140_50%_45%)] border border-black/60" />
        </div>
        <span className="font-pixel carved-gold text-[11px] tracking-wider">
          Claude Dungeon
        </span>
        <span className="ml-auto font-pixel text-[9px] uppercase tracking-[0.2em] text-[hsl(0_0%_55%)]">
          Chamber of Selection
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 pt-16">
        <h1
          className="text-center"
          style={{
            fontFamily: "'Caveat', 'Kalam', 'Comic Sans MS', cursive",
            fontSize: "clamp(48px, 8vw, 110px)",
            fontWeight: 700,
            lineHeight: 1.05,
            color: "hsl(45 95% 60%)",
            textShadow: `
              0 0 8px hsl(33 100% 50% / 0.7),
              0 0 18px hsl(33 100% 50% / 0.45),
              0 0 38px hsl(33 100% 45% / 0.35),
              0 2px 0 hsl(0 0% 0% / 0.9)
            `,
            letterSpacing: "0.01em",
            transform: "rotate(-1.5deg)",
          }}
        >
          Dungeon Difficulty Level?
        </h1>

        {/* Slider */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="flex items-center gap-4">
            <span className="font-pixel text-[12px] text-[hsl(45_80%_60%)]">0</span>
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="difficulty-slider w-full"
                aria-label="Difficulty value"
              />
            </div>
            <span className="font-pixel text-[12px] text-[hsl(45_80%_60%)]">100</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="font-pixel text-[10px] uppercase tracking-[0.25em] text-[hsl(0_0%_50%)]">
              Tier
            </span>
            <span
              className="font-pixel text-[14px] tracking-wider"
              style={{
                color: "hsl(45 95% 65%)",
                textShadow: "0 0 6px hsl(33 100% 50% / 0.55)",
              }}
            >
              {tier.label} — {value}
            </span>
          </div>
        </div>

        {/* Manifest button */}
        <button
          type="button"
          disabled={busy}
          onClick={() => onConfirm(tier.difficulty, value)}
          className="manifest-btn mt-14 font-pixel text-[14px] tracking-[0.18em] uppercase px-10 py-5"
        >
          {busy ? "Manifesting…" : "Manifest the Dungeon"}
        </button>
      </div>

      <style>{`
        .difficulty-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          background: linear-gradient(
            to right,
            hsl(33 100% 45%) 0%,
            hsl(33 100% 45%) ${value}%,
            hsl(0 0% 14%) ${value}%,
            hsl(0 0% 14%) 100%
          );
          border: 1px solid hsl(0 0% 4%);
          border-radius: 4px;
          box-shadow:
            inset 0 2px 4px hsl(0 0% 0% / 0.85),
            inset 0 -1px 0 hsl(0 0% 22% / 0.5),
            0 0 12px hsl(33 100% 50% / 0.25);
          outline: none;
        }
        .difficulty-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 30%, hsl(45 95% 75%) 0%, hsl(38 95% 50%) 45%, hsl(25 80% 25%) 100%);
          border: 2px solid hsl(0 0% 4%);
          box-shadow:
            0 0 10px hsl(33 100% 50% / 0.85),
            0 0 22px hsl(33 100% 45% / 0.45),
            inset 0 -2px 3px hsl(0 0% 0% / 0.5);
          cursor: grab;
        }
        .difficulty-slider::-webkit-slider-thumb:active { cursor: grabbing; }
        .difficulty-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 30%, hsl(45 95% 75%) 0%, hsl(38 95% 50%) 45%, hsl(25 80% 25%) 100%);
          border: 2px solid hsl(0 0% 4%);
          box-shadow:
            0 0 10px hsl(33 100% 50% / 0.85),
            0 0 22px hsl(33 100% 45% / 0.45);
          cursor: grab;
        }

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
      `}</style>
    </div>
  );
};
