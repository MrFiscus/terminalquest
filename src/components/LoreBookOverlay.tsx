import { useEffect, useMemo } from "react";

/**
 * LoreBookOverlay
 * Full-screen, high-fidelity open-book overlay shown when the player
 * `cat`s a lore file. Centered over the map grid, dark textured field behind,
 * leather-bound metal cover with brass corners, aged parchment pages,
 * left page = narrative + numbered choices, right page = ink sketch + numeral.
 */

interface LoreBookOverlayProps {
  title: string;
  body: string;
  onClose: () => void;
}

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  // Aged leather + brass binding
  leather:     "#3a2a18",
  leatherDeep: "#1a1208",
  leatherHigh: "#5e4226",
  brass:       "#c79a3a",
  brassHigh:   "#f5d57a",
  brassDark:   "#6b4a14",
  brassRivet:  "#2a1a08",
  // Parchment
  parchHigh:   "#f5e6c0",
  parchMid:    "#e6d2a0",
  parchLow:    "#b8966a",
  parchEdge:   "#8a6a3a",
  ink:         "#2a1a08",
  inkSoft:     "#5a3a18",
  rule:        "#7a5828",
  // Green hotword (Silverstep-Lake style)
  hotword:     "#3d8a2e",
  hotwordDark: "#1f5418",
};

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&family=UnifrakturCook:wght@700&display=swap');
@keyframes loreBookFadeIn {
  0%   { opacity: 0; transform: translateY(8px) scale(0.985); }
  100% { opacity: 1; transform: translateY(0)   scale(1); }
}
@keyframes loreBgFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

// ── Parchment background — aged cream with stains ──────────────────────────
const PARCH_BG = `
  radial-gradient(ellipse at 18% 22%, rgba(184,150,104,0.28) 0%, transparent 8%),
  radial-gradient(ellipse at 72% 18%, rgba(184,150,104,0.22) 0%, transparent 6%),
  radial-gradient(ellipse at 38% 70%, rgba(184,150,104,0.24) 0%, transparent 7%),
  radial-gradient(ellipse at 84% 78%, rgba(138,108,58,0.30)  0%, transparent 8%),
  radial-gradient(ellipse at 50% 40%, rgba(245,230,192,0.55) 0%, transparent 55%),
  radial-gradient(ellipse at 12% 90%, rgba(110,80,40,0.35)   0%, transparent 50%),
  linear-gradient(170deg, #f0dcb0 0%, #e6d2a0 38%, #d0b078 72%, #b8966a 100%)
`;

// ── Helpers ────────────────────────────────────────────────────────────────
function splitParagraphs(body: string): string[] {
  const blocks = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (blocks.length) return blocks;
  return body.split("\n").map((l) => l.trim()).filter(Boolean);
}

function extractChoices(paragraphs: string[]): { narrative: string[]; choices: string[] } {
  const choices: string[] = [];
  const narrative: string[] = [];
  for (const p of paragraphs) {
    // capture lines like "1. Did they look around..." possibly inline
    const lines = p.split(/(?=\s\d+\.\s)|\n/);
    for (const raw of lines) {
      const s = raw.trim();
      const m = s.match(/^(\d+)\.\s+(.*)$/);
      if (m) choices.push(m[2]);
      else if (s) narrative.push(s);
    }
  }
  return { narrative, choices };
}

// Highlight 2+ capitalised proper nouns (e.g. "Silverstep Lake") in green.
function renderInline(text: string, keyPrefix: string) {
  const re = /([A-Z][a-z]+(?:[ -][A-Z][a-z]+)+)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span
        key={`${keyPrefix}-${i++}`}
        style={{
          color: C.hotword,
          fontWeight: 600,
          textShadow: `0 0 1px rgba(31,84,24,0.4)`,
          borderBottom: `1px dotted ${C.hotwordDark}`,
        }}
      >
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num, s = "";
  for (const [v, r] of map) {
    while (n >= v) { s += r; n -= v; }
  }
  return s || "I";
}

// ── Brass corner bracket ───────────────────────────────────────────────────
function BrassCorner({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const isTop = corner.startsWith("t");
  const isLeft = corner.endsWith("l");
  const rotate = corner === "tl" ? 0 : corner === "tr" ? 90 : corner === "bl" ? 270 : 180;
  return (
    <div
      style={{
        position: "absolute",
        [isTop ? "top" : "bottom"]: -10,
        [isLeft ? "left" : "right"]: -10,
        width: 64, height: 64,
        zIndex: 30, pointerEvents: "none",
        transform: `rotate(${rotate}deg)`,
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.7))",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, width: 64, height: 18,
        background: `linear-gradient(180deg, ${C.brassHigh} 0%, ${C.brass} 50%, ${C.brassDark} 100%)`,
        borderRadius: "4px 4px 0 0",
        border: `1px solid ${C.brassDark}`,
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, width: 18, height: 64,
        background: `linear-gradient(90deg, ${C.brassHigh} 0%, ${C.brass} 50%, ${C.brassDark} 100%)`,
        borderRadius: "4px 0 0 4px",
        border: `1px solid ${C.brassDark}`,
      }} />
      {/* filigree curl */}
      <div style={{
        position: "absolute", top: 14, left: 14, width: 22, height: 22,
        border: `2px solid ${C.brassDark}`,
        borderTop: "none", borderLeft: "none",
        borderRadius: "0 0 14px 0",
        opacity: 0.85,
      }} />
      {/* rivets */}
      {[[6, 30], [30, 6], [6, 6]].map(([t, l], i) => (
        <div key={i} style={{
          position: "absolute", top: t, left: l,
          width: 6, height: 6, borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${C.brassHigh}, ${C.brassRivet} 75%)`,
          boxShadow: "inset 0 0 1px rgba(0,0,0,0.9)",
        }} />
      ))}
    </div>
  );
}

// ── Hasp on left edge ──────────────────────────────────────────────────────
function LeftHasp() {
  return (
    <div
      style={{
        position: "absolute",
        left: -22, top: "50%",
        transform: "translateY(-50%)",
        width: 36, height: 84,
        zIndex: 32, pointerEvents: "none",
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.7))",
      }}
    >
      {/* strap */}
      <div style={{
        position: "absolute", top: 0, left: 14, width: 22, height: 84,
        background: `linear-gradient(90deg, ${C.brassDark} 0%, ${C.brass} 35%, ${C.brassHigh} 50%, ${C.brass} 65%, ${C.brassDark} 100%)`,
        border: `1px solid ${C.brassRivet}`,
        borderRadius: 3,
      }} />
      {/* lock plate */}
      <div style={{
        position: "absolute", top: 22, left: 0, width: 36, height: 40,
        background: `radial-gradient(circle at 30% 25%, ${C.brassHigh}, ${C.brass} 45%, ${C.brassDark} 100%)`,
        border: `2px solid ${C.brassRivet}`,
        borderRadius: 6,
        boxShadow: "inset 0 0 6px rgba(0,0,0,0.5)",
      }} />
      {/* keyhole */}
      <div style={{
        position: "absolute", top: 34, left: 16, width: 4, height: 10,
        background: C.brassRivet, borderRadius: 2,
      }} />
      <div style={{
        position: "absolute", top: 32, left: 14, width: 8, height: 8,
        background: C.brassRivet, borderRadius: "50%",
      }} />
    </div>
  );
}

// ── Decorative ink sketch (CSS-only placeholder) ───────────────────────────
function InkSketch() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse at 50% 95%, rgba(60,40,18,0.55) 0%, transparent 55%),
          radial-gradient(ellipse at 30% 70%, rgba(60,40,18,0.35) 0%, transparent 35%),
          radial-gradient(ellipse at 70% 65%, rgba(60,40,18,0.30) 0%, transparent 30%),
          radial-gradient(ellipse at 50% 40%, rgba(80,50,20,0.18) 0%, transparent 55%),
          repeating-linear-gradient(8deg, rgba(60,40,18,0.06) 0 1px, transparent 1px 5px),
          repeating-linear-gradient(-12deg, rgba(60,40,18,0.05) 0 1px, transparent 1px 7px)
        `,
        filter: "contrast(1.05)",
      }}
    >
      {/* Silhouetted figures */}
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet"
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.85 }}>
        <g fill={C.inkSoft} stroke={C.ink} strokeWidth="0.6">
          <ellipse cx="100" cy="190" rx="80" ry="6" opacity="0.4" />
          <path d="M70 188 q-4 -28 4 -52 q-6 -10 0 -22 q4 -8 12 -8 q8 0 12 8 q6 12 0 22 q8 24 4 52 z" />
          <circle cx="86" cy="100" r="7" />
          <path d="M110 188 q-3 -32 6 -58 q-5 -8 0 -18 q3 -7 10 -7 q7 0 10 7 q5 10 0 18 q9 26 6 58 z" />
          <circle cx="126" cy="98" r="6" />
          <path d="M40 190 q5 -45 25 -70 q5 -10 0 -20 q5 -6 12 -6" stroke={C.ink} fill="none" strokeWidth="0.8" opacity="0.6" />
        </g>
        <g stroke={C.inkSoft} strokeWidth="0.5" fill="none" opacity="0.55">
          <path d="M10 30 q40 20 90 10 t90 -5" />
          <path d="M0 60 q50 25 100 12 t100 -8" />
          <path d="M20 130 q40 -10 80 0 t90 -5" />
        </g>
      </svg>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function LoreBookOverlay({ title, body, onClose }: LoreBookOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { narrative, choices } = useMemo(() => {
    const paragraphs = splitParagraphs(body);
    return extractChoices(paragraphs);
  }, [body]);

  const pageNumeral = useMemo(() => {
    // deterministic numeral derived from title length, just for flavour
    const n = 80 + (title.length % 30);
    return toRoman(n);
  }, [title]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Dark textured backdrop */}
      <div
        onClick={onClose}
        role="presentation"
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          animation: "loreBgFadeIn 500ms ease both",
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(40,28,16,0.55) 0%, rgba(8,6,4,0.95) 75%),
            repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 6px),
            #1a1612
          `,
        }}
      >
        {/* Centered open book */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`Lore: ${title}`}
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(92vw, 1100px)",
            height: "min(82vh, 680px)",
            animation: "loreBookFadeIn 500ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
          }}
        >
          {/* Outer leather cover */}
          <div
            style={{
              position: "absolute", inset: 0,
              padding: "22px 28px 30px",
              borderRadius: 14,
              background: `
                radial-gradient(ellipse at 30% 20%, ${C.leatherHigh} 0%, transparent 40%),
                repeating-linear-gradient(120deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 5px),
                repeating-linear-gradient(40deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 4px),
                linear-gradient(180deg, ${C.leather} 0%, ${C.leatherDeep} 100%)
              `,
              border: `2px solid ${C.brassDark}`,
              boxShadow: `
                0 25px 60px rgba(0,0,0,0.85),
                0 8px 18px rgba(0,0,0,0.6),
                inset 0 0 0 1px rgba(255,200,120,0.08),
                inset 0 0 60px rgba(0,0,0,0.5)
              `,
            }}
          >
            <BrassCorner corner="tl" />
            <BrassCorner corner="tr" />
            <BrassCorner corner="bl" />
            <BrassCorner corner="br" />
            <LeftHasp />

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close book"
              style={{
                position: "absolute",
                top: -16, right: -16,
                width: 38, height: 38,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${C.brassHigh}, ${C.brass} 45%, ${C.brassDark} 100%)`,
                border: `2px solid ${C.brassRivet}`,
                color: C.leatherDeep,
                fontFamily: "'UnifrakturCook', 'IM Fell English SC', serif",
                fontWeight: 700,
                fontSize: 20,
                lineHeight: "32px",
                cursor: "pointer",
                zIndex: 40,
                boxShadow: "0 4px 8px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,220,150,0.5)",
              }}
            >
              ✕
            </button>

            {/* Pages container */}
            <div
              style={{
                position: "relative",
                width: "100%", height: "100%",
                display: "flex",
                borderRadius: 6,
                overflow: "hidden",
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.6)",
              }}
            >
              {/* LEFT PAGE */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  background: PARCH_BG,
                  padding: "34px 38px 28px 44px",
                  overflowY: "auto",
                  boxShadow: "inset -18px 0 32px rgba(0,0,0,0.28)",
                  clipPath:
                    "polygon(0% 1%, 2% 0%, 98% 0.5%, 100% 2%, 99.5% 98%, 98% 100%, 2% 99.5%, 0% 98%)",
                }}
              >
                {/* faint ruling */}
                <div aria-hidden style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: `repeating-linear-gradient(0deg, transparent 0 26px, rgba(90,56,8,0.06) 26px 27px)`,
                }} />

                <h2 style={{
                  fontFamily: "'UnifrakturCook', 'IM Fell English SC', serif",
                  fontSize: 30,
                  color: C.ink,
                  margin: "0 0 14px",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 0 rgba(255,240,200,0.4)",
                }}>
                  {title}
                </h2>

                {narrative.map((p, i) => (
                  <p key={i} style={{
                    fontFamily: "'IM Fell English', 'IM Fell English SC', Georgia, serif",
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: C.ink,
                    textAlign: "justify",
                    textIndent: i === 0 ? 28 : 18,
                    margin: "0 0 10px",
                  }}>
                    {renderInline(p, `n${i}`)}
                  </p>
                ))}

                {/* divider */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  margin: "16px auto 14px", width: "65%",
                }}>
                  <div style={{ flex: 1, height: 1, background: C.rule, opacity: 0.6 }} />
                  <span style={{ color: C.rule, fontSize: 14 }}>✦</span>
                  <div style={{ flex: 1, height: 1, background: C.rule, opacity: 0.6 }} />
                </div>

                {choices.length > 0 && (
                  <ol style={{
                    listStyle: "none", padding: 0, margin: 0,
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    {choices.map((choice, i) => (
                      <li
                        key={i}
                        tabIndex={0}
                        style={{
                          fontFamily: "'IM Fell English SC', Georgia, serif",
                          fontSize: 14,
                          color: C.ink,
                          padding: "4px 8px",
                          borderRadius: 3,
                          cursor: "pointer",
                          transition: "background 160ms, color 160ms, transform 160ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(61,138,46,0.14)";
                          e.currentTarget.style.color = C.hotwordDark;
                          e.currentTarget.style.transform = "translateX(3px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = C.ink;
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <span style={{
                          fontFamily: "'UnifrakturCook', serif",
                          fontSize: 16, marginRight: 8, color: C.inkSoft,
                        }}>
                          {i + 1}.
                        </span>
                        {renderInline(choice, `c${i}`)}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* SPINAL GUTTER */}
              <div
                aria-hidden
                style={{
                  width: 26, flexShrink: 0,
                  background: `
                    linear-gradient(90deg,
                      rgba(0,0,0,0.55) 0%,
                      rgba(0,0,0,0.25) 25%,
                      rgba(0,0,0,0.10) 50%,
                      rgba(0,0,0,0.25) 75%,
                      rgba(0,0,0,0.55) 100%),
                    linear-gradient(180deg, ${C.leatherDeep}, ${C.leather}, ${C.leatherDeep})
                  `,
                  boxShadow: "inset 0 0 12px rgba(0,0,0,0.7)",
                }}
              />

              {/* RIGHT PAGE */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  background: PARCH_BG,
                  padding: "34px 44px 28px 38px",
                  boxShadow: "inset 18px 0 32px rgba(0,0,0,0.28)",
                  clipPath:
                    "polygon(0% 2%, 2% 0%, 98% 1%, 100% 2%, 99.5% 98%, 98% 100%, 2% 99.5%, 0% 98%)",
                  display: "flex", flexDirection: "column",
                }}
              >
                <div aria-hidden style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: `repeating-linear-gradient(0deg, transparent 0 26px, rgba(90,56,8,0.05) 26px 27px)`,
                }} />

                {/* Sketch frame */}
                <div style={{
                  flex: 1, position: "relative",
                  margin: "8px 4px 18px",
                  border: `2px solid ${C.parchEdge}`,
                  outline: `1px solid ${C.parchLow}`,
                  outlineOffset: 4,
                  boxShadow: `
                    inset 0 0 0 6px rgba(245,230,192,0.5),
                    inset 0 0 28px rgba(60,40,18,0.35),
                    0 2px 4px rgba(0,0,0,0.2)
                  `,
                  background: `linear-gradient(180deg, ${C.parchHigh}, ${C.parchMid})`,
                  overflow: "hidden",
                }}>
                  {/* corner flourishes */}
                  {(["tl","tr","bl","br"] as const).map((k) => {
                    const t = k.startsWith("t");
                    const l = k.endsWith("l");
                    return (
                      <span key={k} aria-hidden style={{
                        position: "absolute",
                        [t ? "top" : "bottom"]: 4,
                        [l ? "left" : "right"]: 4,
                        width: 18, height: 18,
                        borderTop:    t ? `2px solid ${C.inkSoft}` : "none",
                        borderBottom: !t ? `2px solid ${C.inkSoft}` : "none",
                        borderLeft:    l ? `2px solid ${C.inkSoft}` : "none",
                        borderRight: !l ? `2px solid ${C.inkSoft}` : "none",
                        opacity: 0.7,
                      }} />
                    );
                  })}
                  <InkSketch />
                </div>

                {/* Roman numeral */}
                <div style={{
                  alignSelf: "flex-end",
                  fontFamily: "'UnifrakturCook', 'IM Fell English SC', serif",
                  fontSize: 22,
                  color: C.inkSoft,
                  letterSpacing: "0.1em",
                  textShadow: "0 1px 0 rgba(255,240,200,0.4)",
                }}>
                  {pageNumeral}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
