import { useState, useMemo } from "react";
import { commandLibrary, type CommandEntry, type DifficultyLevel } from "@/game/commandLibrary";
import bookFrame from "@/assets/book-frame.png";

// ── Constants ──────────────────────────────────────────────────────────────
const PER_SPREAD = 4;
const FADE_MS    = 800;

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

  // Rank colours — aged parchment style with subtle tints
  apprentice:  { text: "#e8d89a", bg: "rgba(20,8,4,0.85)", border: "#5a7a38" },
  journeyman:  { text: "#e8d89a", bg: "rgba(20,8,4,0.85)", border: "#7a5018" },
  archmage:    { text: "#e8d89a", bg: "rgba(20,8,4,0.85)", border: "#7a1818" },
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
    <div className="mx-[17px] px-[9px]" style={{
      flex: 1, display: "flex", flexDirection: "column",
      padding: "12px 26px 10px",
      overflow: "hidden", minHeight: 0,
      position: "relative",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        gap: 8, marginBottom: 6, flexShrink: 0,
      }}>
        <CircleBadge label={String(index + 1)} />
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
          fontWeight: "700", fontSize: 16,
          color: C.parchText, letterSpacing: "0.05em",
          lineHeight: 1.2,
        }}>
          <span style={{ color: C.parchRule, fontWeight: 400, fontSize: 11 }}>⊲⊲ </span>
          The {entry.name} Spell
          <span style={{ color: C.parchRule, fontWeight: 400, fontSize: 11 }}> ⊳⊳</span>
        </div>
        <CircleBadge label={
          entry.difficulty === "beginner" ? "I" : entry.difficulty === "intermediate" ? "II" : "III"
        } />
      </div>

      <p style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 11, color: C.parchInk,
        lineHeight: 1.45,
        margin: "0 0 4px", flexShrink: 0,
        textAlign: "justify",
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
      }}>
        {entry.longDescription}
      </p>

      <GrudgeDivider label="Objectives" />
      <div style={{
        fontFamily: "Georgia, serif",
        fontSize: 10, color: C.parchInk,
        lineHeight: 1.45, flexShrink: 0,
        marginBottom: 2,
        overflow: "hidden",
      }}>
        <code style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 10, color: C.sepDark,
          background: "rgba(90,42,8,0.10)",
          border: "1px solid rgba(90,42,8,0.2)",
          borderRadius: 2, padding: "1px 6px",
          display: "inline-block",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          $ {entry.usage}
        </code>
      </div>

      <GrudgeDivider label="Reward" />
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 10, color: C.parchInk, textTransform: "uppercase",
        flexShrink: 0, flexWrap: "wrap",
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
        <span style={{ color: C.parchInk, fontSize: 10 }}>
          {entry.category.replace(/-/g, " ").toUpperCase()}
        </span>
      </div>

      {entry.examples.length > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
          style={{
            alignSelf: "flex-end", marginTop: "auto", paddingTop: 3,
            fontFamily: "'Cinzel', Georgia, serif", fontSize: 9,
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
          overflow: "hidden",
        }}>
          {entry.examples.slice(0, 2).map((ex) => (
            <div key={ex} style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10, color: C.parchInk, lineHeight: 1.55,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
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
    <div className="pl-[15px]" style={{
      flex: 1,
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
      ...extraStyle,
    }}>

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

    // Phase 1: fade out current
    setFading(true);
    // Phase 2: after fade-out completes, swap content (still invisible)
    setTimeout(() => {
      setCurrentSpread(next);
      // Phase 3: next frame, fade back in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFading(false));
      });
    }, FADE_MS);
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

  // The frame image's parchment area — tightened so text stays well inside
  // the decorative gold border drawn on each page of the artwork.
  const PAGE_INSET_X      = "19%";
  const PAGE_INSET_TOP    = "13%";
  const PAGE_INSET_BOTTOM = "18%";

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
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(1240px, 98vw)",
            maxHeight: "98vh",
            display: "flex", flexDirection: "column",
            alignItems: "center",
            gap: 14,
            position: "relative",
          }}
        >
          {/* ── Close button (modal top-right) ── */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 0, right: 0, zIndex: 40,
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

          {/* ── Title (above, detached from book) ── */}
          <div style={{
            textAlign: "center",
            fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
            fontSize: 36, color: "#f0d68a",
            letterSpacing: "0.25em", textTransform: "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 30px rgba(200,145,58,0.5)",
            lineHeight: 1,
          }}>
            The Book of Secrets
          </div>

          {/* ── Filter bar (under title, detached from book) ── */}
          <div style={{
            display: "flex", gap: 8, alignItems: "center", justifyContent: "center",
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
                  onClick={() => { setDiffFilter(d); setCurrentSpread(0); setFading(false); }}
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif", fontSize: 10,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    padding: "4px 14px", borderRadius: 3, cursor: "pointer",
                    border: `1px solid ${cm.b}`,
                    background: active ? cm.a : "rgba(20,8,4,0.75)",
                    color: active ? "#f0e0b0" : cm.a,
                    transition: "all 0.15s",
                  }}
                >
                  {labels[d]}
                </button>
              );
            })}
          </div>

          {/* ── The Book ── */}
          <div style={{
            width: "100%",
            aspectRatio: "1920 / 1080",
            maxHeight: "calc(98vh - 180px)",
            position: "relative",
            backgroundImage: `url(${bookFrame})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.85))",
          }}>
            {/* Open pages overlay (positioned over the parchment area) */}
            <div style={{
              position: "absolute",
              top: PAGE_INSET_TOP,
              bottom: PAGE_INSET_BOTTOM,
              left: PAGE_INSET_X,
              right: PAGE_INSET_X,
              display: "flex",
            }}>
              <div
                style={{
                  flex: 1, display: "flex", minHeight: 0,
                  opacity: fading ? 0 : 1,
                  transition: `opacity ${FADE_MS}ms ease-in-out`,
                }}
              >
                {/* Left page */}
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  <Page spells={leftSpells} startIndex={pageStart} side="left" />
                </div>

                {/* Center gutter */}
                <div className="text-center mx-0 pr-0 pl-0 mr-px ml-[47px]" style={{ width: 24, flexShrink: 0 }} />

                {/* Right page */}
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  <Page spells={rightSpells} startIndex={pageStart + 2} side="right" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer navigation (under book, detached) ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
          }}>
            <button disabled={!canPrev || fading} onClick={() => navigate("prev")} style={navBtn("prev")}>
              ◄ Prev Page
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "5px 16px", borderRadius: 3,
              background: "rgba(20,8,4,0.85)", border: `1px solid ${C.goldDark}`,
            }}>
              <span style={{
                fontFamily: "'Cinzel', Georgia, serif", fontWeight: "600", fontSize: 14,
                color: C.goldBright, letterSpacing: "0.12em",
              }}>
                {safeSpread + 1} / {totalSpreads}
              </span>
            </div>
            <button disabled={!canNext || fading} onClick={() => navigate("next")} style={navBtn("next")}>
              Next Page ►
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
