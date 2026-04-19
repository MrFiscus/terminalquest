import { type CSSProperties } from "react";
import type { LevelSessionSnapshot } from "@/game/progressStats";

/**
 * Offered on first mount when an unfinished level is present in storage.
 * Styled to match the stone-slab + ember-glow theme used on the Auth and
 * Landing pages (see Auth.tsx boxStyle) so it reads as part of the same
 * world, not a system dialog.
 */

interface ResumeDialogProps {
  session: LevelSessionSnapshot;
  onContinue: () => void;
  onNew: () => void;
}

const slabStyle: CSSProperties = {
  background: "linear-gradient(180deg, hsl(228 10% 16%), hsl(228 12% 10%))",
  border: "2px solid hsl(0 0% 3%)",
  borderRadius: "4px",
  boxShadow: [
    "0 0 8px hsl(33 100% 50% / 0.45)",
    "0 0 20px hsl(33 100% 45% / 0.22)",
    "0 0 36px hsl(33 100% 40% / 0.12)",
    "inset 1px 1px 0 hsl(0 0% 100% / 0.08)",
    "inset -1px -1px 0 hsl(0 0% 0% / 0.85)",
    "inset 0 0 22px hsl(0 0% 0% / 0.55)",
    "0 6px 18px hsl(0 0% 0% / 0.65)",
  ].join(", "),
};

const labelStyle: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: "9px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "hsl(38 80% 58%)",
  textShadow: "0 0 8px hsl(33 100% 45% / 0.35)",
};

const valueStyle: CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  fontSize: "13px",
  color: "hsl(42 45% 82%)",
};

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "moments ago";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function ResumeDialog({ session, onContinue, onNew }: ResumeDialogProps) {
  const tracker = session.tracker;
  const commandCount = tracker.commands.length;
  const roomsVisited = tracker.visitedRooms.length;
  const difficulty = session.activeDifficulty || tracker.difficulty || "dungeon";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, hsl(228 18% 6% / 0.82) 40%, hsl(0 0% 0% / 0.95) 100%)",
        fontFamily: "'VT323', 'Courier New', monospace",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-dialog-title"
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onContinue(); }}
        className="relative flex flex-col gap-4"
        style={{ width: "420px", maxWidth: "92vw" }}
      >
        {/* Title slab */}
        <div style={{ ...slabStyle, padding: "18px 22px 14px" }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              color: "hsl(0 0% 28%)",
              fontWeight: 700,
              marginBottom: "6px",
              textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85), 1px 1px 0 hsl(0 0% 100%/0.22)",
            }}
          >
            Terminal Quest
          </p>
          <h1
            id="resume-dialog-title"
            style={{
              fontFamily: "'Cinzel', 'Pirata One', serif",
              fontSize: "clamp(20px, 3.4vw, 26px)",
              fontWeight: 900,
              letterSpacing: "0.05em",
              lineHeight: 1.1,
              margin: 0,
              color: "hsl(38 80% 60%)",
              textShadow: [
                "-1px -1px 0 hsl(0 0% 0%/0.9)",
                "1px 1px 0 hsl(0 0% 100%/0.12)",
                "0 0 8px hsl(30 100% 50%/0.7)",
                "0 0 20px hsl(30 100% 45%/0.45)",
                "0 0 36px hsl(30 100% 40%/0.25)",
              ].join(", "),
            }}
          >
            Return to your quest?
          </h1>
          <div
            style={{
              marginTop: "10px",
              height: "1px",
              width: "64px",
              background: "linear-gradient(90deg, hsl(33 100% 45% / 0.6), transparent)",
            }}
          />
        </div>

        {/* Terminal-style status line */}
        <div
          style={{
            ...slabStyle,
            padding: "10px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "hsl(140 55% 52%)", fontWeight: "bold" }}>adventurer</span>
          <span style={{ color: "#f3f4f6" }}>@dungeon</span>
          <span style={{ color: "hsl(0 0% 40%)" }}>:~$ </span>
          <span style={{ color: "hsl(38 100% 55%)", textShadow: "0 0 8px hsl(38 100% 50% / 0.5)" }}>
            last session detected - saved {formatAgo(session.savedAt)}
          </span>
          <span style={{ color: "hsl(38 100% 55%)", boxShadow: "0 0 8px hsl(38 100% 55%/0.8)" }}>|</span>
        </div>

        {/* Session details */}
        <div style={{ ...slabStyle, padding: "14px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }}>
            <div>
              <div style={labelStyle}>Chamber</div>
              <div style={{ ...valueStyle, marginTop: 4, wordBreak: "break-word" }}>
                {session.label || "unknown"}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Difficulty</div>
              <div style={{ ...valueStyle, marginTop: 4, textTransform: "capitalize" }}>
                {difficulty}
              </div>
            </div>
            <div>
              <div style={labelStyle}>Commands cast</div>
              <div style={{ ...valueStyle, marginTop: 4 }}>{commandCount}</div>
            </div>
            <div>
              <div style={labelStyle}>Rooms explored</div>
              <div style={{ ...valueStyle, marginTop: 4 }}>{roomsVisited}</div>
            </div>
          </div>
        </div>

        {/* Continue button */}
        <div style={{ ...slabStyle, padding: "14px 16px" }}>
          <button
            type="submit"
            className="stone-tablet-btn w-full py-2 tracking-widest"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "13px",
              letterSpacing: "0.22em",
            }}
          >
            [ CONTINUE LAST QUEST ]
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 4px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }} />
          <span
            style={{
              color: "hsl(0 0% 28%)",
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              letterSpacing: "0.2em",
              fontWeight: 700,
              textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85), 1px 1px 0 hsl(0 0% 100%/0.22)",
            }}
          >
            OR
          </span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }} />
        </div>

        {/* Start new button */}
        <div style={{ ...slabStyle, padding: "14px 16px" }}>
          <button
            type="button"
            onClick={onNew}
            style={{
              width: "100%",
              background: "hsl(228 14% 7%)",
              border: "1px solid hsl(0 0% 6%)",
              borderRadius: "3px",
              color: "hsl(42 35% 68%)",
              fontFamily: "'Cinzel', serif",
              fontSize: "12px",
              letterSpacing: "0.2em",
              padding: "9px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "inset 0 0 24px hsl(30 100%50%/0.22), 0 0 18px hsl(30 100%50%/0.32), 0 0 36px hsl(30 100%45%/0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(38 80% 60%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(42 35% 68%)";
            }}
          >
            Generate a new world
          </button>
          <p
            style={{
              marginTop: "10px",
              marginBottom: 0,
              fontFamily: "Georgia, serif",
              fontSize: "11px",
              fontStyle: "italic",
              color: "hsl(0 0% 45%)",
              textAlign: "center",
            }}
          >
            Starting a new world will discard the saved quest above.
          </p>
        </div>
      </form>
    </div>
  );
}
