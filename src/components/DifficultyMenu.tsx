import { useCallback, useRef, useState } from "react";
import type { Difficulty } from "@/game/aiLevelService";
import { FireBlazes } from "@/components/FireBlazes";
import { RepelDots } from "@/components/RepelDots";
import slateTexture from "@/assets/slate-texture.jpg";
import logoImage from "@/assets/logo_updated.png";

interface DifficultyMenuProps {
  onConfirm: (difficulty: Difficulty, familiarity: number, precise: number) => void;
  busy?: boolean;
}

const tierFor = (v: number): { label: string; difficulty: Difficulty } => {
  if (v < 34) return { label: "Novice", difficulty: "easy" };
  if (v < 67) return { label: "Adept", difficulty: "medium" };
  return { label: "Archmage", difficulty: "hard" };
};

const rankFor = (v: number): string => {
  if (v < 17) return "Novice";
  if (v < 33) return "Apprentice";
  if (v < 50) return "Adept";
  if (v < 67) return "Journeyman";
  if (v < 83) return "Veteran";
  if (v < 100) return "Expert";
  return "Archmage";
};

export const DifficultyMenu = ({ onConfirm, busy }: DifficultyMenuProps) => {
  const [precise, setPrecise] = useState<number>(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const tier = tierFor(precise);
  const rank = rankFor(precise);

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
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden p-4 text-[#d7d0c2] md:p-6"
      style={{
        outline: "none",
        border: "none",
        borderRadius: 0,
        backgroundColor: "hsl(230 18% 5%)",
        backgroundImage: `radial-gradient(ellipse at 50% 30%, hsl(230 14% 14%) 0%, hsl(230 18% 7%) 55%, hsl(230 22% 3%) 100%), url(${slateTexture})`,
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "100% 100%, cover",
        backgroundPosition: "center, center",
        backgroundAttachment: "fixed, fixed",
        backgroundBlendMode: "multiply, normal",
      }}
    >
      <style>{`
        .difficulty-eng {
          font-family: 'Cinzel','MedievalSharp',serif;
          font-weight: 700;
          text-shadow: -1px -1px 0 hsl(0 0%0%/0.85), -1px -1px 2px hsl(0 0%0%/0.6), 1px 1px 0 hsl(0 0%100%/0.22), 1px 2px 2px hsl(0 0%100%/0.12);
          transition: color 300ms, text-shadow 300ms;
        }
        .difficulty-eng-glow {
          font-family:'Cinzel','MedievalSharp',serif;
          font-weight:700;
          color:hsl(38 80% 60%);
          text-shadow:-1px -1px 0 hsl(0 0%0%/0.9),1px 1px 0 hsl(0 0%100%/0.12),0 0 8px hsl(30 100%50%/0.7),0 0 20px hsl(30 100%45%/0.45),0 0 36px hsl(30 100%40%/0.25);
        }
        .difficulty-stone-btn {
          font-family:'Cinzel',serif; font-weight:700; letter-spacing:0.16em; cursor:pointer;
          background-color:hsl(0 0%8%);
          background-image:linear-gradient(180deg,hsl(0 0%100%/0.06),transparent 40%),linear-gradient(0deg,hsl(0 0%0%/0.6),transparent 50%);
          border:2px solid hsl(0 0%4%); border-radius:4px; text-decoration:none; display:inline-block;
          box-shadow:inset 1px 1px 0 hsl(0 0%100%/0.12),inset -1px -1px 0 hsl(0 0%0%/0.85),inset 0 2px 6px hsl(0 0%0%/0.6),0 2px 0 hsl(0 0%0%/0.7),0 6px 14px hsl(0 0%0%/0.65);
          transition:box-shadow 250ms,transform 120ms;
        }
        .difficulty-stone-btn:hover {
          box-shadow:inset 1px 1px 0 hsl(0 0%100%/0.12),inset -1px -1px 0 hsl(0 0%0%/0.85),inset 0 0 24px hsl(30 100%50%/0.4),0 0 18px hsl(30 100%50%/0.5),0 0 36px hsl(30 100%45%/0.3);
        }
        .difficulty-stone-btn:active { transform:translateY(2px); }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at center, transparent 38%, hsl(0 0% 0% / 0.85) 100%)" }} aria-hidden />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.35,
          mixBlendMode: "overlay",
          backgroundImage: "radial-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1.4px), radial-gradient(hsl(0 0% 0% / 0.4) 1px, transparent 1.4px)",
          backgroundSize: "5px 5px, 7px 7px",
          backgroundPosition: "0 0, 2px 3px",
        }}
        aria-hidden
      />

      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-25" aria-hidden style={{ zIndex: 1 }}>
        <FireBlazes count={20} />
      </div>
      <RepelDots count={80} />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 py-8 text-center md:py-10">
        <header className="space-y-4">
          <img
            src={logoImage}
            alt="Terminal Quest"
            style={{ width: 760, maxWidth: "92vw", margin: "0 auto" }}
          />
          <p className="difficulty-eng uppercase" style={{ fontSize: "clamp(12px,1.8vw,18px)", letterSpacing: "0.32em", marginTop: 22, color: "hsl(0 0%26%)", fontWeight: 600 }}>
            Choose your challenge
          </p>
          <p
            className="difficulty-eng uppercase"
            style={{
              fontSize: "clamp(11px,1.4vw,15px)",
              letterSpacing: "0.2em",
              color: "hsl(38 70% 52%)",
              fontWeight: 600,
              textShadow: "0 0 10px hsl(33 100% 45% / 0.35), 0 1px 0 hsl(0 0% 0% / 0.8)",
            }}
          >
            The dungeon adapts to thy skill, adventurer.
          </p>
        </header>

        <div className="relative space-y-8 px-2 py-2 md:px-8">
          <div className="space-y-2">
            <div
              className="difficulty-eng relative tabular-nums"
              style={{
                color: "hsl(38 80% 60%)",
                fontFamily: "'Cinzel', 'MedievalSharp', serif",
                fontWeight: 700,
                fontSize: "clamp(42px, 7vw, 72px)",
                lineHeight: 1,
                letterSpacing: "0.04em",
                textShadow: "-1px -1px 0 hsl(0 0%0%/0.9),1px 1px 0 hsl(0 0%100%/0.12),0 0 8px hsl(30 100%50%/0.55),0 0 20px hsl(30 100%45%/0.3)",
              }}
            >
              {precise}%
            </div>
            <div className="difficulty-eng relative uppercase" style={{ color: "#c9a84c", letterSpacing: "0.3em", fontSize: "0.85rem" }}>
              {rank.toUpperCase()}
            </div>
          </div>

          <div className="mx-2 md:mx-12">
            <div
              ref={sliderRef}
              onPointerDown={onPointerDown}
              className="relative h-5 cursor-pointer overflow-visible"
            >
              <div
                className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-white/10"
                aria-hidden
              />
              <div
                className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-gradient-to-r from-[#c9a84c] to-[#f59e0b] transition-all duration-75"
                style={{ width: `${precise}%` }}
              />
              <div
                className="absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-[#c9a84c] bg-[#f59e0b] transition-all duration-75"
                style={{ left: `calc(${precise}% - 10px)`, boxShadow: "0 0 10px rgba(249,159,11,0.6)" }}
              />
            </div>
          </div>

          <div className="flex justify-between px-2 text-[#8c8273] font-bold uppercase tracking-widest text-[9px] md:mx-12 md:px-0 md:text-[10px]" style={{ textShadow: "0 1px 0 #000" }}>
            <span>0<br/><span className="mt-1 block italic text-[#5a5349]">Demo</span></span>
            <span>100<br/><span className="mt-1 block italic text-[#5a5349]">Archmage</span></span>
          </div>

          <p className="text-[#a89f91] italic text-xs md:text-sm px-4 leading-relaxed" style={{ textShadow: "0 1px 0 #000" }}>
            "Thy choice here defines the density of shadows and the weight of the trials ahead."
          </p>
        </div>

        <button
          onClick={() => onConfirm(tier.difficulty, precise, precise)}
          disabled={busy}
          className="difficulty-stone-btn mx-auto uppercase focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale"
          style={{ padding: "16px 40px", fontSize: "clamp(11px,1.5vw,15px)" }}
        >
          <span className="difficulty-eng-glow">
            {busy ? "SUMMONING..." : ">\u00a0\u00a0ENTER THE DUNGEON"}
          </span>
        </button>
      </div>
    </div>
  );
};
