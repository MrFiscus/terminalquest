import { useState, useMemo, useRef } from "react";
import { commandLibrary, type CommandEntry, type DifficultyLevel } from "@/game/commandLibrary";
import bookFrame from "@/assets/book-frame.png";

// ── Constants ──────────────────────────────────────────────────────────────
const PER_SPREAD = 4;
const FADE_MS    = 280;

// ── Palette (oxblood/brown leather relic tome — matches the frame image) ──
const C = {
  // Parchment — warm aged vellum (tinted to match the photo)
  parchText:   "#2a1a08",
  parchRule:   "#7a5a2a",
  parchInk:    "#3a2410",

  // Gold accents
  gold:        "#b8893a",
  goldBright:  "#d8a848",
  goldDark:    "#6a4818",

  // Entry separators — oxblood/brown
  sepDark:     "#2a1408",
  sepMid:      "#5a2a10",

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
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Pirata+One&display=swap');

@keyframes pageFadeOut {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-6px) scale(0.99); }
}
@keyframes pageFadeIn {
  0%   { opacity: 0; transform: translateY(6px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
`;

// ── Parchment background — transparent so the book frame shows through, but
//    with subtle aging blotches to unify text overlays with the photo paper
const PARCH_BG = `
  radial-gradient(ellipse at 18% 22%, rgba(120,80,30,0.10) 0%, transparent 35%),
  radial-gradient(ellipse at 82% 78%, rgba(120,80,30,0.12) 0%, transparent 40%),
  radial-gradient(ellipse at 50% 50%, rgba(255,240,200,0.06) 0%, transparent 60%)
`;

// ── GrudgeDivider ──────────────────────────────────────────────────────────
function GrudgeDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0", flexShrink: 0 }}>
      <div style={{ flex: 1, height: 1, background: C.parchRule, opacity: 0.5 }} />
      <span style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 9, color: C.parchRule,
        letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        ⊲⊳ {label} ⊲⊳
      </span>
      <div style={{ flex: 1, height: 1, background: C.parchRule, opacity: 0.5 }} />
    </div>
  );
}

// ── SpellEntry ─────────────────────────────────────────────────────────────
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
      <div style={{
        display: "flex", alignItems: "center",
        gap: 8, marginBottom: 5, flexShrink: 0,
      }}>
        <CircleBadge label={String(index + 1)} />
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
          fontWeight: "700", fontSize: 14,
          color: C.parchText, letterSpacing: "0.06em",
          lineHeight: 1.2,
        }}>
          <span style={{ color: C.parchRule, fontWeight: 400, fontSize: 10 }}>⊲⊲ </span>
          The {entry.name} Spell
          <span style={{ color: C.parchRule, fontWeight: 400, fontSize: 10 }}> ⊳⊳</span>
        </div>
        <CircleBadge label={
          entry.difficulty === "beginner" ? "I" : entry.difficulty === "intermediate" ? "II" : "III"
        } />
      </div>

      <p style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 9, color: C.parchInk,
        textTransform: "uppercase", lineHeight: 1.5,
        margin: "0 0 4px", flexShrink: 0,
        textAlign: "justify",
        overflow: "hidden",
        maxHeight: "4.5em",
      }}>
        {entry.longDescription}
      </p>

      <GrudgeDivider label="Objectives" />
      <div style={{
        fontFamily: "Georgia, serif",
        fontSize: 9, color: C.parchInk, textTransform: "uppercase",
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

      <GrudgeDivider label="Reward" />
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 9, color: C.parchInk, textTransform: "uppercase",
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
        <span style={{ color: C.parchInk, fontSize: 9 }}>
          {entry.category.replace(/-/g, " ").toUpperCase()}
        </span>
      </div>

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
              fontSize: 9, color: C.parchInk, lineHeight: 1.55,
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
      background: `radial-gradient(circle at 38% 32%, #3a1808, #160600)`,
      border: `1.5px solid ${C.gold}`,
      boxShadow: `0 1px 4px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,220,120,0.12)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cinzel', Georgia, serif",
      fontWeight: "700", fontSize: 9, color: C.goldBright,
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
        ? "inset -14px 0 28px rgba(40,20,5,0.18)"
        : "inset  14px 0 28px rgba(40,20,5,0.18)",
      ...extraStyle,
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent 0, transparent 22px,
          rgba(90,56,8,0.05) 22px, rgba(90,56,8,0.05) 23px
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
              <div style={{
                height: 2, flexShrink: 0, margin: "0 14px",
                background: `linear-gradient(to right, transparent, ${C.sepMid} 20%, ${C.gold} 50%, ${C.sepMid} 80%, transparent)`,
                opacity: 0.55,
              }} />
              <SpellEntry entry={spells[1]} index={startIndex + 1} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
interface BookOfSecretsProps { onClose: () => void; }

export function BookOfSecrets({ onClose }: BookOfSecretsProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [fading, setFading]               = useState(false);
  const [diffFilter, setDiffFilter]       = useState<DifficultyLevel | "all">("all");

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
    if (fading) return;
    const next = dir === "next"
      ? Math.min(totalSpreads - 1, safeSpread + 1)
      : Math.max(0, safeSpread - 1);
    if (next === safeSpread) return;

    setFading(true);
    setTimeout(() => setCurrentSpread(next), FADE_MS);
    setTimeout(() => setFading(false), FADE_MS + 20);
  }

  const navBtn = (dir: "prev" | "next") => {
    const enabled = dir === "prev" ? (canPrev && !fading) : (canNext && !fading);
    return {
      fontFamily: "'Cinzel', Georgia, serif", fontSize: 11,
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
      padding: "5px 22px", borderRadius: 3,
      cursor: enabled ? "pointer" : "not-allowed",
      border: `1px solid ${enabled ? C.goldDark : "#3a1804"}`,
      background: enabled ? "rgba(40,20,8,0.55)" : "rgba(40,20,8,0.25)",
      color: enabled ? C.goldBright : "#5a3a20",
      transition: "all 0.15s",
    };
  };

  // The frame image's parchment area occupies roughly the inner ~78% width
  // and ~82% height (centered) of the full image. We position the live
  // content over that area.
  const PAGE_INSET_X = "11%";  // left/right inset to land on parchment
  const PAGE_INSET_TOP = "9%";
  const PAGE_INSET_BOTTOM = "13%";

  return (
    <>
      <style>{KEYFRAMES}</style>

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
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(1280px, 98vw)",
            aspectRatio: "1920 / 1080",
            maxHeight: "96vh",
            position: "relative",
            backgroundImage: `url(${bookFrame})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.85))",
          }}
        >
          {/* ── Title floating above the book ── */}
          <div style={{
            position: "absolute", top: "-2px", left: 0, right: 0,
            textAlign: "center",
            fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
            fontSize: 28, color: "#f0d68a",
            letterSpacing: "0.25em", textTransform: "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 30px rgba(200,145,58,0.5)",
            pointerEvents: "none",
            zIndex: 5,
          }}>
            ✦ The Book of Secrets ✦
          </div>

          {/* ── Close button (top-right, outside parchment) ── */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 8, right: 8, zIndex: 40,
              fontFamily: "'Cinzel', Georgia, serif", fontSize: 10,
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "4px 12px", borderRadius: 3, cursor: "pointer",
              border: `1px solid ${C.goldDark}`,
              background: "rgba(20,8,4,0.85)",
              color: C.goldBright,
            }}
          >
            ✕ Close
          </button>

          {/* ── Filter bar (sits on top of the book's top binding strip) ── */}
          <div style={{
            position: "absolute",
            top: "3.5%", left: PAGE_INSET_X, right: PAGE_INSET_X,
            zIndex: 10,
            display: "flex", gap: 6, alignItems: "center", justifyContent: "center",
            flexWrap: "wrap",
          }}>
            {DIFF_OPTIONS.map((d) => {
              const active = diffFilter === d;
              const labels: Record<typeof d, string> = {
                all: "All Ranks", beginner: "Apprentice", intermediate: "Journeyman", expert: "Archmage",
              };
              const cols: Record<typeof d, { a: string; b: string }> = {
                all:          { a: C.gold,    b: C.goldDark },
                beginner:     { a: "#5aa868", b: "#2a6038"  },
                intermediate: { a: "#c89030", b: "#7a5018"  },
                expert:       { a: "#c83838", b: "#7a1818"  },
              };
              const cm = cols[d];
              return (
                <button
                  key={d}
                  onClick={() => { setDiffFilter(d); setCurrentSpread(0); setFlipping(null); }}
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    padding: "3px 12px", borderRadius: 2, cursor: "pointer",
                    border: `1px solid ${cm.b}`,
                    background: active ? cm.a : "rgba(20,8,4,0.6)",
                    color: active ? "#f0e0b0" : cm.a,
                    transition: "all 0.15s",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  {labels[d]}
                </button>
              );
            })}
            <span style={{
              fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
              color: C.goldBright, letterSpacing: "0.05em",
              padding: "3px 10px", borderRadius: 2,
              background: "rgba(20,8,4,0.6)",
              border: `1px solid ${C.goldDark}`,
              backdropFilter: "blur(2px)",
            }}>
              {spells.length} Spells
            </span>
          </div>

          {/* ── Open pages overlay (positioned over the parchment area of the image) ── */}
          <div style={{
            position: "absolute",
            top: PAGE_INSET_TOP,
            bottom: PAGE_INSET_BOTTOM,
            left: PAGE_INSET_X,
            right: PAGE_INSET_X,
            display: "flex",
            perspective: "1400px",
            perspectiveOrigin: "50% 50%",
          }}>
            {/* Left page */}
            <div style={{ flex: 1, overflow: "hidden", zIndex: 1, position: "relative" }}>
              <Page spells={leftSpells} startIndex={pageStart} side="left" />
            </div>

            {/* Center gutter (transparent — shows the book's spine shadow through) */}
            <div style={{ width: 18, flexShrink: 0, zIndex: 5, position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.45) 100%)",
                pointerEvents: "none",
              }} />
            </div>

            {/* Right page */}
            <div style={{ flex: 1, overflow: "hidden", zIndex: 1, position: "relative" }}>
              <Page spells={rightSpells} startIndex={pageStart + 2} side="right" />
            </div>

            {/* Animated flip overlay */}
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

          {/* ── Footer navigation (over the bottom binding) ── */}
          <div style={{
            position: "absolute",
            bottom: "3%", left: 0, right: 0,
            zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
          }}>
            <button disabled={!canPrev || !!flipping} onClick={() => navigate("prev")} style={navBtn("prev")}>
              ◄ Prev Page
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "4px 14px", borderRadius: 3,
              background: "rgba(20,8,4,0.7)", border: `1px solid ${C.goldDark}`,
              backdropFilter: "blur(2px)",
            }}>
              <span style={{
                fontFamily: "'Cinzel', Georgia, serif", fontWeight: "600", fontSize: 14,
                color: C.goldBright, letterSpacing: "0.12em",
              }}>
                {safeSpread + 1} / {totalSpreads}
              </span>
            </div>
            <button disabled={!canNext || !!flipping} onClick={() => navigate("next")} style={navBtn("next")}>
              Next Page ►
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
