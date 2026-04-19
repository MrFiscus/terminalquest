import { useState, useMemo, useRef } from "react";
import { commandLibrary, type CommandEntry, type DifficultyLevel } from "@/game/commandLibrary";

// ── Constants ──────────────────────────────────────────────────────────────
const PER_SPREAD = 4;
const FLIP_MS    = 650;

// ── Palette (Mossy stone-leather tome with silver brackets) ────────────────
const C = {
  // Parchment — cooler cream with stone pebble texture
  parchLight:  "#f4e4bf",
  parchMid:    "#e8d4a8",
  parchDark:   "#b89668",
  parchText:   "#2a1a08",
  parchRule:   "#8a6a3a",

  // Binding — mossy green stone-leather (was leather*)
  bind:        "#5a7a35",
  bindDeep:    "#2a3a18",
  bindMid:     "#3d5a22",
  bindHigh:    "#8aa850",
  bindRim:     "#1a2810",

  // Silver — brushed steel for corner brackets
  silverHigh:  "#e8edf2",
  silverMid:   "#9aa4ad",
  silverDark:  "#5d6770",
  silverRivet: "#2a3038",

  // Wood — bookmark tabs
  woodLight:   "#9b7340",
  woodDark:    "#6b4a22",

  // Gold accents (kept for badges/text legibility)
  gold:        "#c8913a",
  goldBright:  "#e8b84a",
  goldDark:    "#8a5c1a",

  // Entry separators — darker green-bronze
  sepDark:     "#1a2810",
  sepMid:      "#3d5a22",

  // Legacy aliases (so existing references still resolve)
  leather:     "#5a7a3500",
  leatherDeep: "#2a3a18",
  leatherMid:  "#3d5a22",
  leatherRim:  "#1a2810",

  // Rank colours
  apprentice:  { text: "#1a5c2a", bg: "#d4f0da", border: "#2d7a3a" },
  journeyman:  { text: "#5c3d00", bg: "#fff3cd", border: "#c8913a" },
  archmage:    { text: "#6b0000", bg: "#ffd5d5", border: "#8b1a1a" },
} as const;

const RANK: Record<DifficultyLevel, string> = {
  beginner:     "APPRENTICE",
  intermediate: "JOURNEYMAN",
  expert:       "ARCHMAGE",
};
const RANK_C = {
  beginner:     C.apprentice,
  intermediate: C.journeyman,
  expert:       C.archmage,
};

const DIFF_OPTIONS: Array<DifficultyLevel | "all"> = ["all", "beginner", "intermediate", "expert"];

// ── CSS keyframes + Google Font ────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');

@keyframes bookFlipNext {
  0%   { transform: rotateY(0deg);    }
  100% { transform: rotateY(-180deg); }
}
@keyframes bookFlipPrev {
  0%   { transform: rotateY(0deg);   }
  100% { transform: rotateY(180deg); }
}
@keyframes pageShadowFadeIn {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0; }
}
`;

// ── Parchment background (reused in Page + FlipPage) ──────────────────────
const PARCH_BG = `
  radial-gradient(ellipse at 18% 14%, rgba(255,245,160,0.55) 0%, transparent 52%),
  radial-gradient(ellipse at 82% 88%, rgba(140,88,10,0.38)  0%, transparent 52%),
  linear-gradient(175deg, #eecb5c 0%, #d4a03a 38%, #bf8e28 72%, #aa7a18 100%)
`;

// ── Ornate crosshatch strip (the border pattern between the gold lines) ────
const ORNATE_STRIP: React.CSSProperties = {
  backgroundImage: `
    repeating-linear-gradient( 45deg, rgba(200,145,58,0.60) 0, rgba(200,145,58,0.60) 1.5px, transparent 0, transparent 50%),
    repeating-linear-gradient(-45deg, rgba(200,145,58,0.60) 0, rgba(200,145,58,0.60) 1.5px, transparent 0, transparent 50%)
  `,
  backgroundSize:  "6px 6px",
  backgroundColor: "#16040200",
};

// ── GrudgeDivider ──────────────────────────────────────────────────────────
function GrudgeDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0", flexShrink: 0 }}>
      <div style={{ flex: 1, height: 1, background: C.parchRule }} />
      <span style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 9, color: C.parchRule,
        letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        ⊲⊳ {label} ⊲⊳
      </span>
      <div style={{ flex: 1, height: 1, background: C.parchRule }} />
    </div>
  );
}

// ── SpellEntry (styled like a Grudge entry) ────────────────────────────────
function SpellEntry({ entry, index }: { entry: CommandEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const rc = RANK_C[entry.difficulty];

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      padding: "10px 16px 8px",
      overflow: "hidden", minHeight: 0,
      position: "relative",
    }}>
      {/* ── Title row (badge · title · rank badge) ── */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 8, marginBottom: 5, flexShrink: 0,
      }}>
        {/* Left number badge */}
        <CircleBadge label={String(index + 1)} />

        {/* Title */}
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "'Cinzel', Georgia, serif",
          fontWeight: "700", fontSize: 11,
          color: C.parchText, letterSpacing: "0.1em", textTransform: "uppercase",
          lineHeight: 1.25,
        }}>
          <span style={{ color: C.parchRule, fontWeight: 400, fontSize: 10 }}>⊲⊲⊲⊲⊲ </span>
          The {entry.name} Spell
          <span style={{ color: C.parchRule, fontWeight: 400, fontSize: 10 }}> ⊳⊳⊳⊳⊳</span>
        </div>

        {/* Right rank badge (I / II / III) */}
        <CircleBadge label={
          entry.difficulty === "beginner" ? "I" : entry.difficulty === "intermediate" ? "II" : "III"
        } />
      </div>

      {/* ── Description ── */}
      <p style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 9, color: C.parchText,
        textTransform: "uppercase", lineHeight: 1.5,
        margin: "0 0 4px", flexShrink: 0,
        textAlign: "justify",
        // clamp to 3 lines
        overflow: "hidden",
        maxHeight: "4.5em",
      }}>
        {entry.longDescription}
      </p>

      {/* ── Objectives section ── */}
      <GrudgeDivider label="Objectives" />
      <div style={{
        fontFamily: "Georgia, serif",
        fontSize: 9, color: C.parchText, textTransform: "uppercase",
        lineHeight: 1.45, flexShrink: 0,
        marginBottom: 2,
      }}>
        <code style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 10, color: C.sepDark,
          background: "rgba(90,42,8,0.10)",
          border: "1px solid rgba(90,42,8,0.2)",
          borderRadius: 2, padding: "1px 6px",
          display: "inline-block",
        }}>
          $ {entry.usage}
        </code>
      </div>

      {/* ── Reward section ── */}
      <GrudgeDivider label="Reward" />
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 9, color: C.parchText, textTransform: "uppercase",
        flexShrink: 0,
      }}>
        <span style={{
          padding: "1px 7px", borderRadius: 2,
          background: rc.bg, color: rc.text,
          border: `1px solid ${rc.border}`,
          letterSpacing: "0.08em", fontSize: 9,
        }}>
          {RANK[entry.difficulty]}
        </span>
        <span style={{ color: C.parchRule }}>·</span>
        <span style={{ color: C.parchText, fontSize: 9 }}>
          {entry.category.replace(/-/g, " ").toUpperCase()}
        </span>
      </div>

      {/* ── Expand / Collapse toggle ── */}
      {entry.examples.length > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
          style={{
            alignSelf: "flex-end", marginTop: "auto", paddingTop: 3,
            fontFamily: "'Cinzel', Georgia, serif", fontSize: 8,
            color: C.parchRule, background: "none", border: "none",
            cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em",
          }}
        >
          {expanded ? "▲ Conceal" : "▼ Reveal More"}
        </button>
      )}

      {/* ── Expanded examples ── */}
      {expanded && (
        <div style={{
          marginTop: 4,
          background: "rgba(90,42,8,0.09)",
          border: "1px solid rgba(90,42,8,0.22)",
          borderRadius: 2, padding: "4px 8px", flexShrink: 0,
        }}>
          {entry.examples.slice(0, 2).map((ex) => (
            <div key={ex} style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 9, color: C.parchText, lineHeight: 1.55,
            }}>
              $ {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CircleBadge({ label }: { label: string }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
      background: `radial-gradient(circle at 38% 32%, #2c1008, #0e0200)`,
      border: `1.5px solid ${C.gold}`,
      boxShadow: `0 1px 4px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,220,120,0.12)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cinzel', Georgia, serif",
      fontWeight: "700", fontSize: 9, color: C.gold,
    }}>
      {label}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
function Page({
  spells, startIndex, side, style: extraStyle = {},
}: {
  spells: CommandEntry[];
  startIndex: number;
  side: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      flex: 1,
      background: PARCH_BG,
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
      boxShadow: side === "left"
        ? "inset -14px 0 28px rgba(0,0,0,0.22)"
        : "inset  14px 0 28px rgba(0,0,0,0.22)",
      ...extraStyle,
    }}>
      {/* Ruled lines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent 0, transparent 22px,
          rgba(90,56,8,0.07) 22px, rgba(90,56,8,0.07) 23px
        )`,
      }} />

      {spells.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cinzel', Georgia, serif", fontSize: 11,
          color: "rgba(26,8,0,0.28)", textTransform: "uppercase", letterSpacing: "0.12em",
        }}>
          — No spells inscribed —
        </div>
      ) : (
        <>
          <SpellEntry entry={spells[0]} index={startIndex} />
          {spells[1] && (
            <>
              {/* Thick horizontal separator between entries (matches the image) */}
              <div style={{
                height: 5, flexShrink: 0,
                background: `linear-gradient(to right, ${C.leatherDeep}, ${C.sepMid} 20%, #7a3a10 50%, ${C.sepMid} 80%, ${C.leatherDeep})`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.45), 0 -1px 3px rgba(0,0,0,0.25)",
              }} />
              <SpellEntry entry={spells[1]} index={startIndex + 1} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── FlipPage (animation layer — only parchment colors updated) ─────────────
function FlipPage({
  direction, frontSpells, frontStartIndex,
}: {
  direction: "next" | "prev";
  frontSpells: CommandEntry[];
  frontStartIndex: number;
}) {
  const isNext = direction === "next";

  const wrapStyle: React.CSSProperties = {
    position: "absolute", top: 0, bottom: 0,
    [isNext ? "right" : "left"]: 26,
    width: "calc(50% - 28px)",
    transformOrigin: isNext ? "left center" : "right center",
    transformStyle: "preserve-3d",
    animation: `${isNext ? "bookFlipNext" : "bookFlipPrev"} ${FLIP_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
    zIndex: 20, pointerEvents: "none",
    filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.65))",
  };

  const faceBase: React.CSSProperties = {
    position: "absolute", inset: 0,
    backfaceVisibility: "hidden", overflow: "hidden",
  };

  const frontFold = isNext
    ? "linear-gradient(to left,  transparent 50%, rgba(0,0,0,0.10) 80%, rgba(0,0,0,0.30) 100%)"
    : "linear-gradient(to right, transparent 50%, rgba(0,0,0,0.10) 80%, rgba(0,0,0,0.30) 100%)";

  const backFold = isNext
    ? "linear-gradient(to right, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.10) 30%, transparent 60%)"
    : "linear-gradient(to left,  rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.10) 30%, transparent 60%)";

  return (
    <div style={wrapStyle}>
      {/* Front face: the page being flipped away */}
      <div style={{
        ...faceBase,
        background: `${frontFold}, ${PARCH_BG}`,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `repeating-linear-gradient(0deg,transparent 0,transparent 22px,rgba(90,56,8,0.07) 22px,rgba(90,56,8,0.07) 23px)`,
        }} />
        {frontSpells[0] && <SpellEntry entry={frontSpells[0]} index={frontStartIndex} />}
        {frontSpells[1] && (
          <>
            <div style={{ height: 5, flexShrink: 0, background: `linear-gradient(to right, ${C.leatherDeep}, ${C.sepMid} 20%, #7a3a10 50%, ${C.sepMid} 80%, ${C.leatherDeep})` }} />
            <SpellEntry entry={frontSpells[1]} index={frontStartIndex + 1} />
          </>
        )}
      </div>

      {/* Back face: underside of the page (darker aged parchment) */}
      <div style={{
        ...faceBase,
        transform: "rotateY(180deg)",
        background: `${backFold}, linear-gradient(175deg, #c8a030 0%, #b08020 50%, #9a6a10 100%)`,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg,transparent 0,transparent 22px,rgba(90,56,8,0.10) 22px,rgba(90,56,8,0.10) 23px)`,
        }} />
      </div>
    </div>
  );
}

// ── LandingShadow ──────────────────────────────────────────────────────────
function LandingShadow({ direction }: { direction: "next" | "prev" }) {
  const isNext = direction === "next";
  return (
    <div style={{
      position: "absolute", top: 0, bottom: 0,
      [isNext ? "left" : "right"]: 26,
      width: "calc(50% - 28px)",
      background: isNext
        ? "linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.10) 45%, transparent 80%)"
        : "linear-gradient(to left,  rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.10) 45%, transparent 80%)",
      animation: `pageShadowFadeIn ${FLIP_MS}ms ease-in-out forwards`,
      pointerEvents: "none", zIndex: 15,
    }} />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
interface BookOfSecretsProps { onClose: () => void; }

export function BookOfSecrets({ onClose }: BookOfSecretsProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [flipping, setFlipping]           = useState<"next" | "prev" | null>(null);
  const [diffFilter, setDiffFilter]       = useState<DifficultyLevel | "all">("all");

  const flipFrontRef    = useRef<CommandEntry[]>([]);
  const flipFrontIdxRef = useRef(0);

  const spells = useMemo(
    () => diffFilter === "all" ? commandLibrary : commandLibrary.filter((c) => c.difficulty === diffFilter),
    [diffFilter],
  );

  const totalSpreads = Math.max(1, Math.ceil(spells.length / PER_SPREAD));
  const safeSpread   = Math.min(currentSpread, totalSpreads - 1);
  const pageStart    = safeSpread * PER_SPREAD;
  const leftSpells   = spells.slice(pageStart,     pageStart + 2);
  const rightSpells  = spells.slice(pageStart + 2, pageStart + 4);
  const canPrev      = safeSpread > 0;
  const canNext      = safeSpread < totalSpreads - 1;

  function navigate(dir: "next" | "prev") {
    if (flipping) return;
    const next = dir === "next"
      ? Math.min(totalSpreads - 1, safeSpread + 1)
      : Math.max(0, safeSpread - 1);
    if (next === safeSpread) return;

    if (dir === "next") {
      flipFrontRef.current    = rightSpells;
      flipFrontIdxRef.current = pageStart + 2;
    } else {
      flipFrontRef.current    = leftSpells;
      flipFrontIdxRef.current = pageStart;
    }

    setFlipping(dir);
    setTimeout(() => setCurrentSpread(next), FLIP_MS * 0.48);
    setTimeout(() => setFlipping(null), FLIP_MS + 40);
  }

  const navBtn = (dir: "prev" | "next") => {
    const enabled = dir === "prev" ? (canPrev && !flipping) : (canNext && !flipping);
    return {
      fontFamily: "'Cinzel', Georgia, serif", fontSize: 11,
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
      padding: "4px 22px", borderRadius: 2,
      cursor: enabled ? "pointer" : "not-allowed",
      border: `1px solid ${enabled ? C.goldDark : "#3a1804"}`,
      background: enabled ? "rgba(200,145,58,0.13)" : "transparent",
      color: enabled ? C.gold : "#4a2010",
      transition: "all 0.15s",
    };
  };

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 12,
        }}
      >
        {/* ── Book wrapper ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(1120px, 98vw)", height: "min(800px, 95vh)",
            display: "flex", flexDirection: "column",
            position: "relative",
          }}
        >
          {/* ════════════════════════════════════════════════════
              OUTER LEATHER COVER
              Layer order (outermost → innermost):
                dark outer frame (box-shadow rings)
                gold trim line
                ornate crosshatch strip
                gold trim line
                content area (bg #160604)
          ════════════════════════════════════════════════════ */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: C.leatherMid,
            // The triple ring creates the ornate frame illusion
            border: `2px solid ${C.gold}`,
            boxShadow: `
              0 0 0  2px ${C.gold},
              0 0 0 16px ${C.leatherDeep},
              0 0 0 17px ${C.gold},
              0 0 70px rgba(0,0,0,0.97),
              inset 0 0 40px rgba(0,0,0,0.5)
            `,
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
          }}>

            {/* Ornate crosshatch strip rendered as an absolute overlay
                It fills the full frame, but the content stack sits on top (z:2) */}
            <div style={{
              position: "absolute", inset: 4, zIndex: 0,
              ...ORNATE_STRIP,
              borderRadius: 2,
            }} />
            {/* Inner dark mask — reveals only the border band of the crosshatch */}
            <div style={{
              position: "absolute", inset: 15, zIndex: 1,
              background: C.leatherDeep,
              borderRadius: 1,
            }} />
            {/* Gold inner accent line on top of the mask */}
            <div style={{
              position: "absolute", inset: 14, zIndex: 1,
              border: `1px solid ${C.goldDark}`,
              borderRadius: 2,
              pointerEvents: "none",
            }} />

            {/* ── TITLE BAR ── z:2 so it sits above the crosshatch */}
            <div style={{
              position: "relative", zIndex: 2, flexShrink: 0,
              background: `linear-gradient(180deg, #2c1008 0%, #1c0806 100%)`,
              borderBottom: `3px solid ${C.gold}`,
              padding: "0 80px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              {/* Decorative top rule */}
              <div style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0 3px",
              }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.gold} 80%)` }} />
                <span style={{ color: C.gold, fontSize: 14, letterSpacing: 4 }}>✦ ─ ✦ ─ ✦</span>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.gold} 80%)` }} />
              </div>

              <span style={{
                fontFamily: "'Cinzel', Georgia, serif", fontWeight: "700", fontSize: 24,
                color: "#f0e0b0", letterSpacing: "0.3em", textTransform: "uppercase",
                textShadow: `0 2px 8px rgba(0,0,0,0.95), 0 0 40px rgba(200,145,58,0.45)`,
                lineHeight: 1,
              }}>
                The Book of Secrets
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0 8px" }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.goldDark} 80%)` }} />
                <span style={{
                  fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
                  color: C.goldDark, letterSpacing: "0.35em", textTransform: "uppercase",
                }}>
                  Arcane Compendium of Terminal Sorcery
                </span>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.goldDark} 80%)` }} />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  position: "absolute", top: 10, right: 16,
                  fontFamily: "'Cinzel', Georgia, serif", fontSize: 10,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "3px 12px", borderRadius: 2, cursor: "pointer",
                  border: `1px solid ${C.goldDark}`,
                  background: "rgba(200,145,58,0.12)",
                  color: C.gold,
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* ── RANK FILTER BAR ── */}
            <div style={{
              position: "relative", zIndex: 2, flexShrink: 0,
              background: `linear-gradient(180deg, #1c0806 0%, #140604 100%)`,
              borderBottom: `2px solid ${C.goldDark}`,
              padding: "5px 20px",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <span style={{
                fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
                color: C.goldDark, letterSpacing: "0.14em", textTransform: "uppercase",
                marginRight: 4,
              }}>
                Rank:
              </span>
              {DIFF_OPTIONS.map((d) => {
                const active = diffFilter === d;
                const labels: Record<typeof d, string> = {
                  all: "All Ranks", beginner: "Apprentice", intermediate: "Journeyman", expert: "Archmage",
                };
                const cols: Record<typeof d, { a: string; b: string }> = {
                  all:          { a: C.gold,    b: C.goldDark },
                  beginner:     { a: "#3a8a48", b: "#1a5028"  },
                  intermediate: { a: "#9a7020", b: "#5a4010"  },
                  expert:       { a: "#9a2020", b: "#5a0808"  },
                };
                const cm = cols[d];
                return (
                  <button
                    key={d}
                    onClick={() => { setDiffFilter(d); setCurrentSpread(0); setFlipping(null); }}
                    style={{
                      fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      padding: "2px 12px", borderRadius: 2, cursor: "pointer",
                      border: `1px solid ${cm.b}`,
                      background: active ? cm.a : "transparent",
                      color: active ? "#f0e0b0" : cm.a,
                      transition: "all 0.15s",
                    }}
                  >
                    {labels[d]}
                  </button>
                );
              })}
              <span style={{
                marginLeft: "auto",
                fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
                color: C.goldDark, letterSpacing: "0.04em",
              }}>
                {spells.length} Spells Recorded
              </span>
            </div>

            {/* ── OPEN PAGES (perspective container for 3-D flip) ── */}
            <div style={{
              flex: 1, display: "flex", minHeight: 0,
              position: "relative", zIndex: 2,
              background: C.leatherDeep,
              perspective: "1400px", perspectiveOrigin: "50% 50%",
            }}>
              {/* Page-stack edge left — simulates page thickness */}
              <div style={{
                width: 7, flexShrink: 0,
                background: `repeating-linear-gradient(0deg,
                  #d4a03a 0, #d4a03a 1px,
                  #b88028 1px, #b88028 2px
                )`,
                boxShadow: "inset -2px 0 4px rgba(0,0,0,0.4)",
              }} />

              {/* Left page */}
              <div style={{ flex: 1, overflow: "hidden", zIndex: 1 }}>
                <Page spells={leftSpells} startIndex={pageStart} side="left" />
              </div>

              {/* Spine */}
              <div style={{
                width: 26, flexShrink: 0, zIndex: 5,
                background: `linear-gradient(to right,
                  #080100, #1c0804 28%, #2c1008 50%, #1c0804 72%, #080100)`,
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.95), -4px 0 10px rgba(0,0,0,0.8), 4px 0 10px rgba(0,0,0,0.8)",
                position: "relative",
              }}>
                {/* Stitching marks along the spine */}
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} style={{
                    position: "absolute", top: `${5 + i * 5.9}%`,
                    left: "50%", transform: "translateX(-50%)",
                    width: 10, height: 1,
                    background: "rgba(200,145,58,0.38)", borderRadius: 1,
                  }} />
                ))}
              </div>

              {/* Right page */}
              <div style={{ flex: 1, overflow: "hidden", zIndex: 1 }}>
                <Page spells={rightSpells} startIndex={pageStart + 2} side="right" />
              </div>

              {/* Page-stack edge right */}
              <div style={{
                width: 7, flexShrink: 0,
                background: `repeating-linear-gradient(0deg,
                  #d4a03a 0, #d4a03a 1px,
                  #b88028 1px, #b88028 2px
                )`,
                boxShadow: "inset 2px 0 4px rgba(0,0,0,0.4)",
              }} />

              {/* ── Animated flip overlay ── */}
              {flipping && (
                <>
                  <LandingShadow direction={flipping} />
                  <FlipPage
                    direction={flipping}
                    frontSpells={flipFrontRef.current}
                    frontStartIndex={flipFrontIdxRef.current}
                  />
                </>
              )}
            </div>

            {/* ── FOOTER NAVIGATION (matches "1/10" bar in screenshot) ── */}
            <div style={{
              position: "relative", zIndex: 2, flexShrink: 0,
              background: `linear-gradient(180deg, #1c0806 0%, #100402 100%)`,
              borderTop: `3px solid ${C.gold}`,
              padding: "7px 24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 20,
            }}>
              <button disabled={!canPrev || !!flipping} onClick={() => navigate("prev")} style={navBtn("prev")}>
                ◄ Prev Page
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 1, background: C.goldDark }} />
                <span style={{
                  fontFamily: "'Cinzel', Georgia, serif", fontWeight: "600", fontSize: 15,
                  color: C.gold, letterSpacing: "0.12em",
                }}>
                  {safeSpread + 1} / {totalSpreads}
                </span>
                <div style={{ width: 36, height: 1, background: C.goldDark }} />
              </div>

              <button disabled={!canNext || !!flipping} onClick={() => navigate("next")} style={navBtn("next")}>
                Next Page ►
              </button>
            </div>

          </div>{/* end leather cover */}
        </div>{/* end book wrapper */}
      </div>{/* end backdrop */}
    </>
  );
}
