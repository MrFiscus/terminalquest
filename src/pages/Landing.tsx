import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import slateTexture from "@/assets/slate-texture.jpg";
import tileWall from "@/assets/tile-wall.png";
import tileFloor from "@/assets/tile-floor.png";
import tileFloorAlt from "@/assets/tile-floor-alt.png";
import tileTorch from "@/assets/tile-torch.png";
import archwayDoor from "@/assets/archway-door.png";

const gif = (name: string) => new URL(`../../gifs/${name}`, import.meta.url).href;

// ── Looping command typewriter ────────────────────────────────────────────────
function useCommandLoop(text: string, speed = 60) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"type" | "pause" | "erase">("type");
  const ref = useRef(phase);
  ref.current = phase;
  const lenRef = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      lenRef.current = Math.min(lenRef.current + 1, text.length);
      setDisplayed(text.slice(0, lenRef.current));
      if (lenRef.current < text.length) timer = setTimeout(tick, speed);
      else { setPhase("pause"); timer = setTimeout(() => setPhase("erase"), 2200); }
    };
    const erase = () => {
      lenRef.current = Math.max(0, lenRef.current - 1);
      setDisplayed(text.slice(0, lenRef.current));
      if (lenRef.current > 0) timer = setTimeout(erase, 22);
      else { timer = setTimeout(() => { setPhase("type"); }, 500); }
    };

    if (phase === "type") timer = setTimeout(tick, speed);
    if (phase === "erase") timer = setTimeout(erase, 22);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return { displayed, submitted: phase === "pause" };
}

// ── Pixel dungeon map ─────────────────────────────────────────────────────────
// W=wall  .=floor  T=torch  P=player  C=chest(locked)  ' '=gap  ~=void
const MAP = [
  "WWWWWWWWWWWW",
  "W..T......TW",
  "W..........W",
  "W.P........W",
  "W..........W",
  "W.....C....W",
  "WWWWW  WWWW",
  "WWWWW~~WWWW",
  "WWWWWWWWWWW",
];

function PixelDungeon({ sz = 24 }: { sz?: number }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(12, ${sz}px)`,
      imageRendering: "pixelated",
    }}>
      {MAP.map((row, y) =>
        row.split("").map((ch, x) => {
          const key = `${y}-${x}`;
          const floorImg = (x + y) % 3 === 0 ? tileFloorAlt : tileFloor;
          const floor = { backgroundImage: `url(${floorImg})`, backgroundSize: "cover", imageRendering: "pixelated" as const };

          if (ch === "W") return <div key={key} style={{ width: sz, height: sz, backgroundImage: `url(${tileWall})`, backgroundSize: "cover", imageRendering: "pixelated" }} />;
          if (ch === "~") return <div key={key} style={{ width: sz, height: sz, background: "linear-gradient(160deg,hsl(215 60% 9%),hsl(210 65% 7%))", boxShadow: "inset 0 0 8px hsl(210 80% 20%/0.5)" }} />;
          if (ch === " ") return <div key={key} style={{ width: sz, height: sz, background: "#000" }} />;

          if (ch === "T") return (
            <div key={key} style={{ width: sz, height: sz, ...floor, position: "relative" }}>
              <img src={tileTorch} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", animation: "torch-flicker 1.6s infinite alternate ease-in-out" }} />
            </div>
          );
          if (ch === "P") return (
            <div key={key} style={{ width: sz, height: sz, ...floor, position: "relative" }}>
              <img src={gif("breathing-idle_south.gif")} alt="player" style={{ position: "absolute", width: "175%", height: "175%", top: "-37%", left: "-37%", imageRendering: "pixelated", zIndex: 2 }} />
            </div>
          );
          if (ch === "C") return (
            <div key={key} style={{ width: sz, height: sz, ...floor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.6, animation: "item-float 2.4s infinite alternate ease-in-out" }}>🔒</div>
          );
          return <div key={key} style={{ width: sz, height: sz, ...floor }} />;
        })
      )}
    </div>
  );
}

// ── Terminal demo ─────────────────────────────────────────────────────────────
const DEMO = [
  { k: "sys",  t: "Terminal Quest v1.0 — Linux Dungeon RPG" },
  { k: "sep",  t: "──────────────────────────────────────────" },
  { k: "in",   t: "user@dungeon:~/entrance$ ls" },
  { k: "dir",  t: "  crypt/    torchroom/    ruins/" },
  { k: "file", t: "  chest.lock    bridge_plans.txt    key.txt" },
  { k: "in",   t: "user@dungeon:~/entrance$ cat bridge_plans.txt" },
  { k: "out",  t: "  Blueprint: Rope Bridge" },
  { k: "out",  t: "  Status: MISSING — lumber required" },
  { k: "dm",   t: "  ✦ Hint: try  cd crypt  to search for materials" },
];

type DemoLine = { k: string; t: string };

const CANNED: Record<string, DemoLine[]> = {
  ls: [
    { k: "dir",  t: "  crypt/    torchroom/    ruins/" },
    { k: "file", t: "  chest.lock    bridge_plans.txt    key.txt" },
  ],
  help: [
    { k: "out", t: "  Available: ls, cd, cat, help, clear" },
    { k: "dm",  t: "  ✦ The Dungeon Master nods approvingly." },
  ],
  cd: [
    { k: "sys", t: "  You step into the crypt. Torches flicker." },
    { k: "dm",  t: "  ✦ Hint: try  ls  to see what awaits." },
  ],
  cat: [
    { k: "out", t: "  Blueprint: Rope Bridge — lumber required." },
  ],
  clear: [],
  __unknown: [
    { k: "out", t: "  command not found — try `help`" },
  ],
};

function TerminalDemo() {
  const [n, setN] = useState(0);
  const [extra, setExtra] = useState<DemoLine[]>([]);
  const [input, setInput] = useState("");
  const [loopKey, setLoopKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (n >= DEMO.length) {
      // If user hasn't typed anything yet, auto-loop the canned demo
      if (extra.length > 0) return;
      const t = setTimeout(() => { setN(0); setLoopKey(k => k + 1); }, 6000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN(c => c + 1), DEMO[n].k === "in" ? 700 : 170);
    return () => clearTimeout(t);
  }, [n, loopKey, extra.length]);

  const col = (k: string) => k === "sys" ? "hsl(140 55% 52%)" : k === "in" ? "hsl(38 100% 55%)" : k === "dir" ? "#60a5fa" : k === "dm" ? "#9ca3af" : k === "sep" ? "hsl(0 0% 22%)" : "#c9cdd4";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const cmd = input.trim().toLowerCase().split(/\s+/)[0];
    const echo: DemoLine = { k: "in", t: `user@dungeon:~/entrance$ ${input}` };
    if (cmd === "clear") { setExtra([]); setInput(""); return; }
    const resp = CANNED[cmd] ?? CANNED.__unknown;
    setExtra(prev => [...prev, echo, ...resp]);
    setInput("");
  };

  const ready = n >= DEMO.length;

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="scriptorium-bg scriptorium-scroll"
      style={{ height: "100%", fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 11, lineHeight: 1.7, padding: "12px 14px", overflowY: "auto", position: "relative", cursor: "text" }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, background: "repeating-linear-gradient(to bottom,transparent 0,transparent 2px,hsl(0 0% 0%/0.13) 3px)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11, background: "radial-gradient(ellipse at 50% 50%,transparent 40%,hsl(0 0% 0%/0.6) 100%)" }} />
      {DEMO.slice(0, n).map((line, i) => (
        <div key={`d-${loopKey}-${i}`} style={{ color: col(line.k), fontStyle: line.k === "dm" ? "italic" : "normal", fontWeight: line.k === "dir" ? "bold" : "normal", whiteSpace: "pre", position: "relative", zIndex: 1 }}>
          {line.t}
        </div>
      ))}
      {extra.map((line, i) => (
        <div key={`e-${i}`} style={{ color: col(line.k), fontStyle: line.k === "dm" ? "italic" : "normal", fontWeight: line.k === "dir" ? "bold" : "normal", whiteSpace: "pre", position: "relative", zIndex: 1 }}>
          {line.t}
        </div>
      ))}
      {ready && (
        <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 4, position: "relative", zIndex: 1 }}>
          <span style={{ color: "#4ade80", fontWeight: "bold" }}>user@dungeon</span>
          <span style={{ color: "#f3f4f6" }}>:</span>
          <span style={{ color: "#60a5fa", fontWeight: "bold" }}>~/entrance</span>
          <span style={{ color: "#f3f4f6" }}>$&nbsp;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="try: ls, cd crypt, help"
            spellCheck={false}
            autoComplete="off"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "hsl(38 100% 55%)", fontFamily: "inherit", fontSize: 11, padding: 0, caretColor: "hsl(38 100% 55%)" }}
          />
        </form>
      )}
    </div>
  );
}

// ── Monitor frame ─────────────────────────────────────────────────────────────
function MonitorFrame({ title, accent = "hsl(38 100% 50%)", children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="scriptorium-frame" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "hsl(0 0% 5%)", borderBottom: `1px solid ${accent.replace(")", "/0.3)")}`, padding: "5px 10px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["hsl(0 70% 45%)", "hsl(45 90% 48%)", "hsl(130 50% 40%)"].map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, border: "1px solid hsl(0 0% 0%/0.6)", boxShadow: `0 0 4px ${c}` }} />
          ))}
        </div>
        <span style={{ flex: 1, textAlign: "center", fontFamily: "'Press Start 2P',monospace", fontSize: 7, color: accent, letterSpacing: "0.12em" }}>{title}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// ── Shared section wrapper ────────────────────────────────────────────────────
function StoneSection({ children, tint = "transparent", style = {} }: {
  children: React.ReactNode;
  tint?: string;
  style?: React.CSSProperties;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal" style={{ position: "relative", ...style }}>
      <div style={{ position: "absolute", inset: 0, background: tint, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </section>
  );
}

// ── Engraved section divider ──────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,hsl(0 0% 100%/0.1),transparent)" }} />
      <h2 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "clamp(13px,1.8vw,20px)", letterSpacing: "0.3em", margin: 0, color: "hsl(0 0% 18%)", textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85),-1px -1px 2px hsl(0 0% 0%/0.6),1px 1px 0 hsl(0 0% 100%/0.22),1px 2px 2px hsl(0 0% 100%/0.12)", whiteSpace: "nowrap" }}>
        {children}
      </h2>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,hsl(0 0% 100%/0.1),transparent)" }} />
    </div>
  );
}

// ── Floppy disk button ────────────────────────────────────────────────────────
function FloppyButton({ label }: { label: string }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button type="button" onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      className="lp-floppy-tilt"
      style={{ position: "relative", width: 68, height: 70, cursor: "pointer", border: "none", background: "none", padding: 0 }}
    >
      {/* Body */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "4px 4px 6px 6px",
        backgroundImage: `url(${slateTexture})`, backgroundSize: "200px 200px",
        border: "2px solid hsl(0 0% 2%)",
        boxShadow: pressed
          ? "inset 0 3px 8px hsl(0 0% 0%/0.9),0 0 8px hsl(38 100% 50%/0.25)"
          : "inset 1px 1px 0 hsl(0 0% 100%/0.14),inset -1px -1px 0 hsl(0 0% 0%/0.85),0 4px 10px hsl(0 0% 0%/0.8),0 0 12px hsl(38 100% 45%/0.15)",
        transform: pressed ? "translateY(2px)" : "none",
        transition: "box-shadow 80ms,transform 80ms",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "8px 6px 6px", gap: 4,
        overflow: "hidden",
      }}>
        {/* Darkener */}
        <div style={{ position: "absolute", inset: 0, background: "hsl(0 0% 0%/0.7)", borderRadius: "3px 3px 5px 5px", pointerEvents: "none" }} />
        {/* Label strip */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: 26, background: "hsl(42 55% 82%)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 hsl(0 0% 100%/0.5),inset 0 -1px 0 hsl(0 0% 0%/0.2)" }}>
          <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: 6, color: "hsl(230 25% 20%)", letterSpacing: "0.04em", lineHeight: 1.2, textAlign: "center" }}>{label}</span>
        </div>
        {/* Notch */}
        <div style={{ position: "relative", zIndex: 1, width: 12, height: 9, background: "hsl(0 0% 6%)", borderRadius: "0 0 2px 2px", alignSelf: "flex-end", marginRight: 2, boxShadow: "inset 0 2px 4px hsl(0 0% 0%/0.9)" }} />
        {/* Shutter */}
        <div style={{ position: "relative", zIndex: 1, width: "82%", height: 17, background: "linear-gradient(180deg,hsl(0 0% 58%),hsl(0 0% 44%))", borderRadius: "1px 1px 3px 3px", boxShadow: "inset 0 1px 0 hsl(0 0% 75%),inset 0 -1px 0 hsl(0 0% 28%)" }}>
          <div style={{ position: "absolute", left: "20%", right: "20%", top: "28%", bottom: "28%", background: "hsl(0 0% 8%)", borderRadius: 1 }} />
        </div>
      </div>
    </button>
  );
}

// ── Robot avatar (pixel art) ──────────────────────────────────────────────────
const ROBOT_PIXELS = [
  "........",
  "..BBBB..",
  ".BCCCCB.",
  ".BCGGCB.",
  ".BMMMMB.",
  ".BBBBBB.",
  "..BRRB..",
  "........",
];
const ROBOT_COLORS: Record<string, string> = {
  ".": "transparent", B: "hsl(210 18% 30%)", C: "hsl(210 18% 20%)",
  G: "hsl(195 90% 58%)", M: "hsl(140 60% 48%)", R: "hsl(230 25% 40%)",
};

function RobotAvatar() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8,8px)", gridTemplateRows: "repeat(8,8px)", imageRendering: "pixelated" }}>
      {ROBOT_PIXELS.map((row, y) => row.split("").map((px, x) => (
        <div key={`${y}-${x}`} style={{
          width: 8, height: 8,
          background: ROBOT_COLORS[px] ?? "transparent",
          boxShadow: px === "G" ? "0 0 4px hsl(195 90% 58%/0.8)" : px === "M" ? "0 0 3px hsl(140 60% 48%/0.6)" : undefined,
        }} />
      )))}
    </div>
  );
}

// ── Hero tagline rotator ──────────────────────────────────────────────────────
const TAGLINES = [
  "LEARN LINUX. SLAY DRAGONS.",
  "YOUR TERMINAL IS YOUR SWORD.",
  "AI DUNGEON MASTER INCLUDED.",
  "EVERY COMMAND IS A SPELL.",
];

// ── Animated count-up ─────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 1400) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / durationMs);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, durationMs]);
  return { ref, val };
}

// ── Stat ribbon ───────────────────────────────────────────────────────────────
function StatRibbon() {
  const a = useCountUp(47);
  const b = useCountUp(12);
  return (
    <StoneSection tint="hsl(0 0%0%/0.32)">
      <div style={{ position: "relative", padding: "18px 24px", borderTop: "1px solid hsl(0 0%100%/0.05)", borderBottom: "1px solid hsl(0 0%100%/0.05)", background: "linear-gradient(180deg, hsl(0 0%0%/0.35), hsl(0 0%0%/0.5))" }}>
        <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 80% at 50% 50%, hsl(33 100%50%/0.08) 0%, transparent 70%)" }} />
        <div className="lp-eng" style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "clamp(14px, 4vw, 48px)", fontSize: "clamp(10px, 1.3vw, 13px)", letterSpacing: "0.22em", color: "hsl(0 0% 30%)", fontWeight: 700 }}>
          <span><span ref={a.ref} style={{ color: "hsl(38 80% 58%)", textShadow: "0 0 8px hsl(33 100% 45% / 0.4)" }}>⚔ {a.val}</span> COMMANDS</span>
          <span style={{ color: "hsl(0 0% 18%)" }}>·</span>
          <span><span ref={b.ref} style={{ color: "hsl(140 55% 50%)", textShadow: "0 0 8px hsl(140 55% 35% / 0.4)" }}>🗝 {b.val}</span> DUNGEONS</span>
          <span style={{ color: "hsl(0 0% 18%)" }}>·</span>
          <span style={{ color: "hsl(280 50% 60%)", textShadow: "0 0 8px hsl(280 50% 40% / 0.4)" }}>🤖 AI MENTOR</span>
          <span style={{ color: "hsl(0 0% 18%)" }}>·</span>
          <span style={{ color: "hsl(38 80% 58%)" }}>🆓 FREE TO PLAY</span>
        </div>
      </div>
    </StoneSection>
  );
}

// ── Featured commands carousel ────────────────────────────────────────────────
const FEATURED_CMDS: { cmd: string; flavor: string }[] = [
  { cmd: "ls",    flavor: "survey the chamber for items and doorways" },
  { cmd: "cd",    flavor: "step through a portal into another room" },
  { cmd: "cat",   flavor: "read aloud from any ancient scroll" },
  { cmd: "grep",  flavor: "divine the secret runes hidden in any file" },
  { cmd: "mkdir", flavor: "conjure a new chamber from raw stone" },
  { cmd: "chmod", flavor: "rewrite the laws that bind an artifact" },
  { cmd: "find",  flavor: "send forth a familiar to seek what is lost" },
  { cmd: "rm",    flavor: "banish a cursed object back to the void" },
];
function CommandsCarousel() {
  return (
    <StoneSection tint="radial-gradient(ellipse at 50% 0%,hsl(33 60%18%/0.15) 0%,transparent 60%),hsl(0 0%0%/0.22)">
      <div style={{ position: "relative", padding: "48px 0 56px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 50% at 50% 50%,hsl(38 100%50%/0.08) 0%,transparent 60%)" }} />
        {Array.from({ length: 6 }).map((_, i) => {
          const left = 8 + (i * 17) % 84;
          return (
            <span key={i} className="lp-ember" style={{
              left: `${left}%`, bottom: `${10 + (i * 9) % 35}%`,
              animationDuration: `${7 + (i % 3) * 1.2}s`,
              animationDelay: `${(i * 1.1) % 6}s`,
              ["--ember-drift" as never]: `${(i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 4)}px`,
            }} />
          );
        })}
        <div style={{ padding: "0 32px" }}>
          <SectionTitle>✦ SPELLS YOU WILL LEARN ✦</SectionTitle>
        </div>
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", gap: 18, padding: "8px 32px 16px",
          overflowX: "auto", scrollSnapType: "x mandatory",
        }}>
          {FEATURED_CMDS.map((c, i) => (
            <div
              key={c.cmd}
              className="lp-tablet"
              style={{
                flex: "0 0 auto", width: 200, minHeight: 130,
                scrollSnapAlign: "start",
                background: "linear-gradient(180deg, hsl(228 10% 22%), hsl(228 12% 14%))",
                backgroundImage: `url(${slateTexture})`,
                backgroundSize: "300px 300px",
                backgroundBlendMode: "multiply",
                border: "2px solid hsl(0 0% 3%)",
                borderRadius: 4,
                boxShadow:
                  "inset 1px 1px 0 hsl(0 0%100%/0.1), inset -1px -1px 0 hsl(0 0%0%/0.85)," +
                  "inset 0 0 24px hsl(0 0%0%/0.55)," +
                  "0 6px 18px hsl(0 0%0%/0.6), 0 0 14px hsl(33 100%45%/0.08)",
                padding: "16px 16px 14px",
                display: "flex", flexDirection: "column", gap: 8,
                position: "relative", overflow: "hidden",
                animationDelay: `${(i % 4) * 0.6}s`,
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "hsl(0 0%0%/0.5)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: "hsl(38 90% 60%)", textShadow: "0 0 10px hsl(33 100% 45% / 0.55), 0 1px 0 hsl(0 0% 0% / 0.9)", letterSpacing: "0.04em" }}>
                $ {c.cmd}
              </div>
              <div style={{ position: "relative", zIndex: 1, height: 1, background: "linear-gradient(90deg, transparent, hsl(33 60% 30% / 0.5), transparent)" }} />
              <div style={{ position: "relative", zIndex: 1, fontFamily: "'Cinzel', serif", fontSize: 11, lineHeight: 1.5, color: "hsl(42 30% 65%)", fontStyle: "italic" }}>
                {c.flavor}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StoneSection>
  );
}

// ── Testimonial scroll ────────────────────────────────────────────────────────
const QUOTES = [
  { t: "I learned more sysadmin in 2 hours than in my whole CS class.", a: "apprentice_dev" },
  { t: "Finally, a way to grind grep without crying.", a: "tux_warlock" },
  { t: "My terminal phobia is officially cured.", a: "rookie_root" },
  { t: "The Dungeon Master roasted my typo. 10/10.", a: "shellshock42" },
];
function TestimonialScroll() {
  return (
    <StoneSection tint="radial-gradient(ellipse at 50% 50%,hsl(42 30%20%/0.10) 0%,transparent 65%),hsl(0 0%0%/0.24)">
      <div style={{ position: "relative", padding: "56px 32px 60px", maxWidth: 720, margin: "0 auto" }}>
        <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 50%,hsl(42 60%30%/0.10) 0%,transparent 60%)" }} />
        <SectionTitle>✦ VOICES FROM THE CRYPT ✦</SectionTitle>
        <div className="scriptorium-bg scriptorium-frame iron-rivets" style={{ position: "relative", padding: "32px 36px", minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, hsl(0 0% 0% / 0.13) 3px)" }} />
          <div style={{ position: "relative", width: "100%", height: 80 }}>
            {QUOTES.map((q, i) => (
              <div
                key={i}
                className="lp-quote"
                style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                  textAlign: "center", opacity: 0,
                  animationDelay: `${i * 7}s`,
                  animationDuration: `${QUOTES.length * 7}s`,
                }}
              >
                <div style={{ fontFamily: "'VT323', monospace", fontSize: 22, lineHeight: 1.4, color: "hsl(42 35% 75%)", fontStyle: "italic", textShadow: "0 1px 0 hsl(0 0% 0% / 0.85)" }}>
                  "{q.t}"
                </div>
                <div className="lp-eng" style={{ fontSize: 10, letterSpacing: "0.22em", color: "hsl(38 60% 50%)", fontWeight: 600 }}>
                  — {q.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StoneSection>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  const cmdFull = "user@dungeon:~/entrance$ cd crypt";
  const { displayed, submitted } = useCommandLoop(cmdFull, 62);
  const cmdTyped = displayed.replace("user@dungeon:~/entrance$ ", "");

  const [walking, setWalking] = useState(false);
  useEffect(() => {
    if (submitted) { const t = setTimeout(() => setWalking(true), 350); return () => clearTimeout(t); }
    setWalking(false);
  }, [submitted]);

  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", backgroundColor: "hsl(230 18% 5%)", backgroundImage: `radial-gradient(ellipse at 50% 30%, hsl(230 14% 14%) 0%, hsl(230 18% 7%) 55%, hsl(230 22% 3%) 100%), url(${slateTexture})`, backgroundRepeat: "no-repeat, no-repeat", backgroundSize: "100% 100%, cover", backgroundPosition: "center, center", backgroundAttachment: "fixed, fixed", backgroundBlendMode: "multiply, normal" }}>
      {/* Global vignette + grain overlay (fixed — no seams) */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse at center, transparent 38%, hsl(0 0% 0% / 0.85) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.35, mixBlendMode: "overlay", backgroundImage: "radial-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1.4px), radial-gradient(hsl(0 0% 0% / 0.4) 1px, transparent 1.4px)", backgroundSize: "5px 5px, 7px 7px", backgroundPosition: "0 0, 2px 3px" }} />
      <style>{`
        .lp-eng {
          font-family: 'Cinzel','MedievalSharp',serif; font-weight:700; color:hsl(0 0% 18%);
          text-shadow:-1px -1px 0 hsl(0 0%0%/0.85),-1px -1px 2px hsl(0 0%0%/0.6),1px 1px 0 hsl(0 0%100%/0.22),1px 2px 2px hsl(0 0%100%/0.12);
          transition:color 300ms,text-shadow 300ms;
        }
        .lp-eng-glow {
          font-family:'Cinzel','MedievalSharp',serif; font-weight:700;
          color:hsl(38 80% 60%);
          text-shadow:-1px -1px 0 hsl(0 0%0%/0.9),1px 1px 0 hsl(0 0%100%/0.12),0 0 8px hsl(30 100%50%/0.7),0 0 20px hsl(30 100%45%/0.45),0 0 36px hsl(30 100%40%/0.25);
        }
        .lp-stone-btn {
          font-family:'Cinzel',serif; font-weight:700; letter-spacing:0.16em; cursor:pointer;
          background-color:hsl(0 0%8%);
          background-image:linear-gradient(180deg,hsl(0 0%100%/0.06),transparent 40%),linear-gradient(0deg,hsl(0 0%0%/0.6),transparent 50%);
          border:2px solid hsl(0 0%4%); border-radius:4px; text-decoration:none; display:inline-block;
          box-shadow:inset 1px 1px 0 hsl(0 0%100%/0.12),inset -1px -1px 0 hsl(0 0%0%/0.85),inset 0 2px 6px hsl(0 0%0%/0.6),0 2px 0 hsl(0 0%0%/0.7),0 6px 14px hsl(0 0%0%/0.65);
          transition:box-shadow 250ms,transform 120ms;
        }
        .lp-stone-btn:hover {
          box-shadow:inset 1px 1px 0 hsl(0 0%100%/0.12),inset -1px -1px 0 hsl(0 0%0%/0.85),inset 0 0 24px hsl(30 100%50%/0.4),0 0 18px hsl(30 100%50%/0.5),0 0 36px hsl(30 100%45%/0.3);
        }
        .lp-stone-btn:active { transform:translateY(2px); }
      `}</style>

      {/* ══ 1. HERO ═══════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", overflow: "hidden", zIndex: 1 }}>
        <div className="lp-breathe" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 45%,hsl(33 60% 22%/0.28) 0%,transparent 60%)", mixBlendMode: "screen", pointerEvents: "none" }} />
        <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 10%,hsl(30 100%50%/0.18) 0%,transparent 44%)", animationDelay: "1.2s" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 50%,transparent 55%,hsl(0 0%0%/0.35) 100%)" }} />

        {/* Ember particles */}
        {Array.from({ length: 8 }).map((_, i) => {
          const left = 8 + (i * 11) % 88;
          const dur = 6 + (i % 4) * 1.2;
          const delay = (i * 0.9) % 7;
          const drift = (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 4);
          const bottom = 10 + (i * 7) % 30;
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

        {/* Nav */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", background: "hsl(0 0%0%/0.38)", borderBottom: "1px solid hsl(0 0%0%/0.5)", backdropFilter: "blur(2px)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["hsl(0 70%45%)", "hsl(45 90%55%)", "hsl(140 50%45%)"].map((c, i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, border: "1px solid hsl(0 0%0%/0.6)", display: "inline-block" }} />
            ))}
          </div>
          <span className="lp-eng" style={{ fontSize: 13, letterSpacing: "0.2em" }}>Terminal Quest</span>
          <span className="lp-eng" style={{ marginLeft: "auto", fontSize: 10, letterSpacing: "0.25em", color: "hsl(0 0%25%)", fontWeight: 600 }}>Chamber of Origin</span>
        </div>

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 32px 70px", textAlign: "center" }}>
          <h1 className="lp-eng lp-hero-in" style={{ fontSize: "clamp(44px,7.5vw,100px)", lineHeight: 1.05, margin: 0, animationDelay: "0ms" }}>
            TERMINAL QUEST
          </h1>
          <p className="lp-eng lp-hero-in" style={{ fontSize: "clamp(12px,1.8vw,18px)", letterSpacing: "0.32em", marginTop: 22, color: "hsl(0 0%26%)", fontWeight: 600, animationDelay: "220ms" }}>
            ☩ DON'T JUST PLAY THE GAME. WRITE THE REALITY. ☩
          </p>

          {/* Tagline rotator */}
          <div className="lp-hero-in" style={{ height: 28, marginTop: 18, position: "relative", width: "100%", maxWidth: 560, animationDelay: "420ms" }}>
            {TAGLINES.map((t, i) => (
              <span
                key={i}
                className="lp-tagline lp-eng"
                style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(11px,1.4vw,15px)", letterSpacing: "0.2em",
                  color: "hsl(38 70% 52%)", fontWeight: 600,
                  textShadow: "0 0 10px hsl(33 100% 45% / 0.35), 0 1px 0 hsl(0 0% 0% / 0.8)",
                  animationDelay: `${i * 4}s`,
                  animationDuration: `${TAGLINES.length * 4}s`,
                  opacity: 0,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Hero CTA */}
          <Link
            to="/play"
            className="lp-stone-btn lp-stone-btn-sweep lp-hero-in"
            style={{ marginTop: 32, padding: "16px 40px", fontSize: "clamp(11px,1.5vw,15px)", animationDelay: "640ms" }}
          >
            <span className="lp-eng-glow">▶&nbsp;&nbsp;ENTER THE DUNGEON</span>
          </Link>

          {/* Scroll cue */}
          <div className="lp-scroll-cue lp-eng" style={{ marginTop: 56, fontSize: 9, letterSpacing: "0.3em", color: "hsl(0 0% 26%)", fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span>SCROLL TO PEEK INSIDE</span>
            <span style={{ fontSize: 14, lineHeight: 1 }}>▼</span>
          </div>
        </div>
      </section>

      {/* ══ STAT RIBBON ══════════════════════════════════════════════════════ */}
      <StatRibbon />

      {/* ══ FEATURED COMMANDS ════════════════════════════════════════════════ */}
      <CommandsCarousel />

      {/* ══ 2. DUAL MONITORS ══════════════════════════════════════════════════ */}
      <StoneSection tint="hsl(0 0%0%/0.28)">
        <div style={{ position: "relative", padding: "54px 32px 58px", maxWidth: 1100, margin: "0 auto" }}>
          {/* Ambient breathing glows */}
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 55% at 30% 40%,hsl(38 100%50%/0.10) 0%,transparent 60%)" }} />
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 55% at 70% 60%,hsl(140 60%40%/0.08) 0%,transparent 60%)", animationDelay: "1.6s" }} />
          {/* Embers */}
          {Array.from({ length: 5 }).map((_, i) => {
            const left = 12 + (i * 19) % 80;
            const dur = 7 + (i % 3) * 1.3;
            const delay = (i * 1.4) % 6;
            const drift = (i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 4);
            return (
              <span key={i} className="lp-ember" style={{
                left: `${left}%`, bottom: `${15 + (i * 9) % 40}%`,
                animationDuration: `${dur}s`, animationDelay: `${delay}s`,
                ["--ember-drift" as never]: `${drift}px`,
              }} />
            );
          })}

          <SectionTitle>✦ TWO WORLDS · ONE KEYBOARD ✦</SectionTitle>

          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 4px 1fr", height: 288 }}>
            <MonitorFrame title="TERMINAL  /  DUNGEON-01" accent="hsl(38 100% 50%)">
              <TerminalDemo />
            </MonitorFrame>

            {/* Pillar divider — exact game class */}
            <div className="pillar-divider" />

            <MonitorFrame title="DUNGEON  /  ENTRANCE" accent="hsl(140 60% 45%)">
              <div style={{ height: "100%", background: "hsl(230 18%5%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 35%,hsl(33 80%22%/0.18) 0%,transparent 60%)" }} />
                <PixelDungeon sz={23} />
                <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "hsl(0 60%12%/0.9)", border: "1px solid hsl(0 65%35%/0.55)", borderRadius: 2, padding: "2px 8px", fontFamily: "'Press Start 2P',monospace", fontSize: 6, color: "hsl(0 75%65%)", whiteSpace: "nowrap" }}>
                  ⚠ BRIDGE MISSING
                </div>
              </div>
            </MonitorFrame>
          </div>

          {/* Monitor stands */}
          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 4px 1fr" }}>
            {[0, 2].map(i => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 56, height: 12, background: "hsl(220 12%7%)", borderRadius: "0 0 3px 3px" }} />
                <div style={{ width: 90, height: 7, background: "hsl(220 12%5%)", borderRadius: "0 0 4px 4px" }} />
              </div>
            ))}
            <div />
          </div>
        </div>
      </StoneSection>

      {/* ══ 3. HOW WE PLAY ════════════════════════════════════════════════════ */}
      <StoneSection tint="radial-gradient(ellipse at 50% 0%,hsl(33 60%18%/0.22) 0%,transparent 60%),hsl(0 0%0%/0.22)">
        <div style={{ position: "relative", padding: "54px 32px 62px", maxWidth: 880, margin: "0 auto" }}>
          {/* Ambient breathing glows */}
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 25% 50%,hsl(33 100%50%/0.12) 0%,transparent 60%)" }} />
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 80% 50%,hsl(33 80%45%/0.10) 0%,transparent 60%)", animationDelay: "2s" }} />
          {/* Embers */}
          {Array.from({ length: 5 }).map((_, i) => {
            const left = 8 + (i * 21) % 84;
            const dur = 7 + (i % 3) * 1.2;
            const delay = (i * 1.3) % 6;
            const drift = (i % 2 === 0 ? -1 : 1) * (5 + (i % 3) * 4);
            return (
              <span key={i} className="lp-ember" style={{
                left: `${left}%`, bottom: `${10 + (i * 11) % 35}%`,
                animationDuration: `${dur}s`, animationDelay: `${delay}s`,
                ["--ember-drift" as never]: `${drift}px`,
              }} />
            );
          })}
          <SectionTitle>✦ HOW WE PLAY ✦</SectionTitle>

          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 36, alignItems: "center" }}>
            {/* Left: command input + floppy */}
            <div style={{ flex: 1 }}>
              <div className="lp-eng" style={{ fontSize: 10, letterSpacing: "0.22em", color: "hsl(0 0%28%)", fontWeight: 600, marginBottom: 10 }}>YOUR COMMAND</div>

              {/* Terminal input box */}
              <div className="scriptorium-bg scriptorium-frame iron-rivets" style={{ padding: "10px 14px", minHeight: 46, display: "flex", alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, background: "repeating-linear-gradient(to bottom,transparent 0,transparent 2px,hsl(0 0%0%/0.12) 3px)" }} />
                <span style={{ position: "relative", zIndex: 2 }}>
                  <span style={{ color: "#4ade80", fontWeight: "bold" }}>user@dungeon</span>
                  <span style={{ color: "#f3f4f6" }}>:</span>
                  <span style={{ color: "#60a5fa", fontWeight: "bold" }}>~/entrance</span>
                  <span style={{ color: "#f3f4f6" }}>$ </span>
                  <span style={{ color: "hsl(38 100% 55%)" }}>{cmdTyped}</span>
                </span>
                <span style={{ display: "inline-block", width: 7, height: 14, background: "hsl(38 100%55%)", animation: "cursor-blink 1s step-end infinite", boxShadow: "0 0 8px hsl(38 100%55%/0.8)", marginLeft: 1, position: "relative", zIndex: 2 }} />
              </div>

              {/* Floppy + label */}
              <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <FloppyButton label="SUBMIT" />
                <div className="lp-eng" style={{ fontSize: 10, color: "hsl(0 0%28%)", fontWeight: 600, lineHeight: 1.6 }}>
                  INSERT THE FLOPPY<br />TO EXECUTE…
                </div>
              </div>
            </div>

            {/* Right: game world mini preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, width: 190 }}>
              <div className="lp-eng" style={{ fontSize: 10, letterSpacing: "0.22em", color: "hsl(0 0%28%)", fontWeight: 600 }}>GAME WORLD</div>
              <div className="scriptorium-frame" style={{ width: 182, height: 82, position: "relative", overflow: "hidden", background: "hsl(230 18%5%)" }}>
                {/* Floor */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: i * 18, top: 34, width: 18, height: 48, backgroundImage: `url(${i % 3 === 0 ? tileFloorAlt : tileFloor})`, backgroundSize: "cover", imageRendering: "pixelated" }} />
                ))}
                {/* Wall */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: i * 18, top: 0, width: 18, height: 34, backgroundImage: `url(${tileWall})`, backgroundSize: "cover", imageRendering: "pixelated" }} />
                ))}
                {/* Archway */}
                <img src={archwayDoor} alt="" style={{ position: "absolute", right: 2, top: 8, height: 66, imageRendering: "pixelated" }} />
                {/* Player */}
                <img src={walking ? gif("running-4-frames_south-west.gif") : gif("breathing-idle_south.gif")} alt="player" style={{ position: "absolute", width: 40, height: 40, bottom: 14, left: walking ? "55%" : "10%", imageRendering: "pixelated", zIndex: 4, transition: walking ? "left 1.8s linear" : undefined }} />
              </div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, letterSpacing: "0.08em", color: submitted ? "hsl(140 50%45%)" : "hsl(0 0%32%)", transition: "color 300ms", textShadow: submitted ? "0 0 8px hsl(140 55%35%/0.5)" : "none" }}>
                {submitted ? "ENTERING CRYPT..." : "AWAITING COMMAND..."}
              </div>
            </div>
          </div>
        </div>
      </StoneSection>

      {/* ══ 4. AI MENTOR ══════════════════════════════════════════════════════ */}
      <StoneSection tint="radial-gradient(ellipse at 50% 100%,hsl(280 30%12%/0.14) 0%,transparent 55%),hsl(0 0%0%/0.2)">
        <div style={{ position: "relative", padding: "54px 32px 62px", maxWidth: 780, margin: "0 auto" }}>
          {/* Ambient breathing glows — purple mentor aura */}
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 55% at 50% 50%,hsl(280 50%35%/0.16) 0%,transparent 60%)" }} />
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 45% at 20% 30%,hsl(280 60%40%/0.10) 0%,transparent 60%)", animationDelay: "1.8s" }} />
          {/* Embers — violet tinted via filter */}
          {Array.from({ length: 5 }).map((_, i) => {
            const left = 10 + (i * 18) % 82;
            const dur = 7.5 + (i % 3) * 1.1;
            const delay = (i * 1.5) % 6;
            const drift = (i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 4);
            return (
              <span key={i} className="lp-ember" style={{
                left: `${left}%`, bottom: `${12 + (i * 9) % 38}%`,
                background: "hsl(280 80% 65%)",
                boxShadow: "0 0 6px hsl(280 80% 60% / 0.9), 0 0 12px hsl(280 80% 55% / 0.5)",
                animationDuration: `${dur}s`, animationDelay: `${delay}s`,
                ["--ember-drift" as never]: `${drift}px`,
              }} />
            );
          })}
          <SectionTitle>✦ YOUR AI MENTOR ✦</SectionTitle>

          {/* Mentor card — styled like the in-game WizardPopup + ScrollPopup */}
          <div style={{ position: "relative", border: "2px solid hsl(0 0%0%/0.7)", borderRadius: 4, overflow: "hidden", boxShadow: "inset 0 2px 0 hsl(0 0%100%/0.08),inset 0 -2px 0 hsl(0 0%0%/0.6),0 8px 28px hsl(0 0%0%/0.55),0 0 30px hsl(280 40%30%/0.08)" }}>
            <div style={{ position: "absolute", inset: 0, background: "hsl(0 0%0%/0.42)", pointerEvents: "none" }} />

            {/* Title bar */}
            <div style={{ position: "relative", zIndex: 2, background: "hsl(0 0%0%/0.55)", borderBottom: "1px solid hsl(280 30%20%/0.45)", padding: "7px 14px", display: "flex", alignItems: "center", gap: 10, backdropFilter: "blur(2px)" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["hsl(0 70%45%)", "hsl(45 90%48%)", "hsl(130 50%40%)"].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: "1px solid hsl(0 0%0%/0.6)", boxShadow: `0 0 4px ${c}` }} />
                ))}
              </div>
              <span className="lp-eng" style={{ flex: 1, textAlign: "center", fontSize: 11, letterSpacing: "0.2em" }}>
                DUNGEON MASTER — AI TUTOR v2.1
              </span>
            </div>

            {/* Body */}
            <div style={{ position: "relative", zIndex: 2, padding: "20px 22px", display: "flex", gap: 18, alignItems: "flex-start" }}>
              {/* Robot portrait */}
              <div style={{ flexShrink: 0, background: "hsl(210 16%10%)", border: "2px solid hsl(280 30%22%/0.55)", borderRadius: 3, padding: 6, boxShadow: "0 0 14px hsl(280 40%30%/0.22),inset 0 0 10px hsl(0 0%0%/0.6)" }}>
                <RobotAvatar />
              </div>

              {/* Speech bubble */}
              <div style={{ flex: 1, background: "hsl(230 18%5%/0.7)", border: "1px solid hsl(0 0%100%/0.07)", borderRadius: 3, padding: "12px 16px", boxShadow: "inset 0 2px 8px hsl(0 0%0%/0.5)", position: "relative" }}>
                <div style={{ position: "absolute", left: -7, top: 14, width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: "7px solid hsl(0 0%100%/0.07)" }} />
                <div className="lp-eng" style={{ fontSize: 9, letterSpacing: "0.15em", marginBottom: 8, color: "hsl(280 50%55%)" }}>AI MENTOR:</div>
                <div style={{ fontFamily: "'VT323',monospace", fontSize: 18, color: "hsl(42 35%72%)", lineHeight: 1.5 }}>
                  "Looks like that door is locked. Try using the{" "}
                  <span style={{ color: "hsl(38 100%58%)", textShadow: "0 0 8px hsl(38 100%50%/0.5)" }}>ls</span>{" "}
                  command to see if there's a key nearby… or maybe just{" "}
                  <span style={{ color: "hsl(140 65%52%)", textShadow: "0 0 8px hsl(140 65%45%/0.5)" }}>mkdir bridge</span>{" "}
                  to go around?"
                </div>
              </div>
            </div>

            {/* Adaptive difficulty indicator — distinct from the start page's interactive slider */}
            <div style={{ position: "relative", zIndex: 2, padding: "14px 22px 18px", borderTop: "1px solid hsl(0 0%100%/0.06)", display: "flex", alignItems: "center", gap: 16 }}>
              <span className="lp-eng" style={{ fontSize: 9, letterSpacing: "0.2em", color: "hsl(0 0%28%)", fontWeight: 600, whiteSpace: "nowrap" }}>LEARNING LEVEL</span>
              {/* Progress pips */}
              <div style={{ flex: 1, display: "flex", gap: 4 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 8, borderRadius: 2,
                    background: i < 5 ? `hsl(${30 + i * 8} 100% ${44 + i * 3}%)` : "hsl(0 0%14%)",
                    boxShadow: i < 5 ? `0 0 6px hsl(${30 + i * 8} 100%50%/0.55)` : "none",
                    border: "1px solid hsl(0 0%0%/0.6)",
                  }} />
                ))}
              </div>
              <span className="lp-eng" style={{ fontSize: 9, letterSpacing: "0.15em", color: "hsl(38 80%55%)", fontWeight: 700, whiteSpace: "nowrap" }}>ADEPT</span>
            </div>
          </div>
        </div>
      </StoneSection>

      {/* ══ TESTIMONIAL SCROLL ═══════════════════════════════════════════════ */}
      <TestimonialScroll />

      {/* ══ 5. CTA ════════════════════════════════════════════════════════════ */}
      <StoneSection tint="radial-gradient(ellipse 70% 55% at 50% 42%,hsl(33 60%20%/0.18) 0%,transparent 55%)">
        <div style={{ position: "relative", padding: "64px 32px 76px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          {/* Ambient breathing glows */}
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 50%,hsl(30 100%50%/0.22) 0%,transparent 50%)" }} />
          <div className="lp-breathe" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 60%,hsl(33 80%40%/0.14) 0%,transparent 60%)", animationDelay: "1.5s" }} />
          {/* Embers — denser around the CTA */}
          {Array.from({ length: 10 }).map((_, i) => {
            const left = 6 + (i * 11) % 88;
            const dur = 6 + (i % 4) * 1.2;
            const delay = (i * 0.7) % 7;
            const drift = (i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 5);
            return (
              <span key={i} className="lp-ember" style={{
                left: `${left}%`, bottom: `${10 + (i * 7) % 50}%`,
                animationDuration: `${dur}s`, animationDelay: `${delay}s`,
                ["--ember-drift" as never]: `${drift}px`,
              }} />
            );
          })}
          <Link to="/play" className="lp-stone-btn lp-stone-btn-sweep" style={{ padding: "20px 56px", fontSize: "clamp(13px,2vw,20px)", position: "relative", zIndex: 1 }}>
            <span className="lp-eng-glow">⚔&nbsp;&nbsp;ENTER THE DUNGEON&nbsp;&nbsp;⚔</span>
          </Link>
          <p className="lp-eng" style={{ fontSize: 10, letterSpacing: "0.26em", color: "hsl(0 0%22%)", margin: 0, fontWeight: 600, position: "relative", zIndex: 1 }}>
            NO EXPERIENCE REQUIRED — JUST A KEYBOARD
          </p>
        </div>
      </StoneSection>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <StoneSection tint="hsl(0 0%0%/0.38)" style={{ borderTop: "1px solid hsl(0 0%100%/0.06)" }}>
        <div style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="lp-eng" style={{ fontSize: 9, letterSpacing: "0.28em", color: "hsl(0 0%20%)", fontWeight: 600 }}>
            TERMINAL QUEST — LEARN LINUX. CONQUER THE DUNGEON.
          </span>
        </div>
      </StoneSection>
    </div>
  );
}
