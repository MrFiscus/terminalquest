import { type CSSProperties } from "react";
import type { LevelSessionSnapshot } from "@/game/progressStats";
import loginBg from "@/assets/background_login.png";
import lampSprite from "@/assets/lamp.png";

interface ResumeDialogProps {
  session: LevelSessionSnapshot;
  onContinue: () => void;
  onNew: () => void;
  onClose?: () => void;
}

const boxStyle: CSSProperties = {
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
  backdropFilter: "blur(3px)",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  background: "hsl(228 14% 7%)",
  border: "1px solid hsl(0 0% 6%)",
  borderRadius: "3px",
  color: "hsl(42 45% 82%)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "14px",
  padding: "10px 12px",
  boxShadow: "inset 0 2px 6px hsl(0 0% 0% / 0.6)",
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

export function ResumeDialog({ session, onContinue, onNew, onClose }: ResumeDialogProps) {
  const tracker = session.tracker;
  const commandCount = tracker.commands.length;
  const roomsVisited = tracker.visitedRooms.length;
  const difficulty = session.activeDifficulty || tracker.difficulty || "dungeon";

  return (
    <div
      className="fixed inset-0 flex items-center"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "'VT323', 'Courier New', monospace",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-dialog-title"
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 38%, hsl(0 0% 0% / 0.75) 100%)" }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "hsl(230 18% 5% / 0.45)" }}
      />

      <div className="pointer-events-none fixed bottom-[8%] right-[-67%] z-[2] hidden md:block auth-lamp-wrap" aria-hidden>
        <div className="auth-lamp-halo" />
        <div className="auth-lamp-glow" />
        <img src={lampSprite} alt="" className="auth-lamp-sprite" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
        className="relative z-10 flex flex-col gap-4"
        style={{
          width: "clamp(390px, 30vw, 460px)",
          maxHeight: "90vh",
          overflowY: "auto",
          marginLeft: "0%",
          padding: "18px",
          borderRadius: "10px",
          backgroundColor: "hsl(226 12% 8% / 0.42)",
          backgroundImage: [
            "radial-gradient(120% 90% at 86% 8%, hsl(34 92% 50% / 0.14), transparent 54%)",
            "radial-gradient(120% 130% at 18% 100%, hsl(214 42% 30% / 0.16), transparent 62%)",
            "linear-gradient(180deg, hsl(226 12% 15% / 0.5), hsl(224 16% 7% / 0.62))",
            "repeating-linear-gradient(45deg, hsl(0 0% 100% / 0.02) 0 2px, transparent 2px 7px)",
          ].join(", "),
          border: "1px solid hsl(34 30% 58% / 0.22)",
          backdropFilter: "blur(12px) saturate(115%)",
          boxShadow: [
            "0 18px 42px hsl(0 0% 0% / 0.55)",
            "0 0 22px hsl(32 100% 45% / 0.15)",
            "inset 0 1px 0 hsl(0 0% 100% / 0.08)",
            "inset 0 -2px 16px hsl(0 0% 0% / 0.5)",
          ].join(", "),
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close return to your quest menu"
            className="absolute right-2 top-2 z-10"
            style={{
              width: 28,
              height: 28,
              borderRadius: "999px",
              border: "1px solid hsl(0 0% 6%)",
              background: "hsl(228 14% 8%)",
              color: "hsl(38 80% 62%)",
              fontFamily: "'Cinzel', serif",
              fontSize: "11px",
              cursor: "pointer",
              boxShadow: "0 0 10px hsl(33 100% 45% / 0.22), inset 0 0 12px hsl(0 0% 0% / 0.5)",
            }}
          >
            X
          </button>
        )}

        <div style={{ ...boxStyle, padding: "20px 22px 16px" }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              color: "hsl(0 0% 28%)",
              fontWeight: 700,
              marginBottom: "8px",
              textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85), 1px 1px 0 hsl(0 0% 100%/0.22)",
            }}
          >
            Terminal Quest
          </p>
          <h1
            id="resume-dialog-title"
            style={{
              fontFamily: "'Cinzel', 'Pirata One', serif",
              fontSize: "clamp(22px, 4vw, 30px)",
              fontWeight: 900,
              letterSpacing: "0.06em",
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
            Return to Your Quest
          </h1>
          <div
            style={{
              marginTop: "12px",
              height: "1px",
              width: "60px",
              background: "linear-gradient(90deg, hsl(33 100% 45% / 0.6), transparent)",
            }}
          />
        </div>

        <div
          style={{
            ...boxStyle,
            padding: "10px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "hsl(140 55% 52%)", fontWeight: "bold" }}>player</span>
          <span style={{ color: "#f3f4f6" }}>@dungeon</span>
          <span style={{ color: "hsl(0 0% 40%)" }}>:~$ </span>
          <span style={{ color: "hsl(38 100% 55%)", textShadow: "0 0 8px hsl(38 100% 50% / 0.5)" }}>
            restore-session --saved {formatAgo(session.savedAt)}
          </span>
          <span style={{ color: "hsl(38 100% 55%)", boxShadow: "0 0 8px hsl(38 100% 55%/0.8)" }}>▮</span>
        </div>

        <div>
          <label
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsl(38 80% 58%)",
              display: "block",
              marginBottom: "6px",
              textShadow: "0 0 8px hsl(33 100% 45% / 0.4)",
            }}
          >
            ✦ Current Chamber
          </label>
          <div style={fieldStyle}>{session.label || "Unknown chamber"}</div>
        </div>

        <div>
          <label
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsl(38 80% 58%)",
              display: "block",
              marginBottom: "6px",
              textShadow: "0 0 8px hsl(33 100% 45% / 0.4)",
            }}
          >
            ✦ Dungeon Details
          </label>
          <div
            style={{
              ...fieldStyle,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px 14px",
            }}
          >
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.14em" }}>Difficulty</div>
              <div style={{ marginTop: 2, textTransform: "capitalize" }}>{difficulty}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.14em" }}>Saved</div>
              <div style={{ marginTop: 2 }}>{formatAgo(session.savedAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.14em" }}>Commands Cast</div>
              <div style={{ marginTop: 2 }}>{commandCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.14em" }}>Rooms Explored</div>
              <div style={{ marginTop: 2 }}>{roomsVisited}</div>
            </div>
          </div>
        </div>

        <div style={{ ...boxStyle, padding: "14px 16px" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 4px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }} />
          <span style={{ color: "hsl(0 0% 28%)", fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.2em", fontWeight: 700, textShadow: "-1px -1px 0 hsl(0 0% 0%/0.85), 1px 1px 0 hsl(0 0% 100%/0.22)" }}>
            OR
          </span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }} />
        </div>

        <div style={{ ...boxStyle, padding: "14px 16px" }}>
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
              letterSpacing: "0.15em",
              padding: "8px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "inset 0 0 24px hsl(30 100%50%/0.25), 0 0 18px hsl(30 100%50%/0.35), 0 0 36px hsl(30 100%45%/0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(38 80% 60%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(42 35% 68%)";
            }}
          >
            Start a New World
          </button>
        </div>

      </form>
    </div>
  );
}
