import { Button } from "@/components/ui/button";
import type { VictoryReport } from "@/game/types";
import scrollImage from "@/assets/scroll.png";

interface VictoryOverlayProps {
  onReset: () => void;
  targetFile: string;
  completionMessage?: string | null;
  report?: VictoryReport | null;
  busy?: boolean;
  actionLabel?: string;
}

export function VictoryOverlay({
  onReset,
  targetFile,
  completionMessage,
  report,
  busy = false,
  actionLabel = "DESCEND AGAIN",
}: VictoryOverlayProps) {
  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-background/85 animate-fade-in">
      <div
        className="relative text-center text-[#3b1f0a]"
        style={{
          width: "min(860px, 94vw, calc(88vh * 2400 / 1792))",
          aspectRatio: "2400 / 1792",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundImage: `url(${scrollImage})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundColor: "transparent",
        }}
      >
        <div
          className="victory-scroll-content"
          style={{
            position: "absolute",
            left: "18%",
            right: "18%",
            top: "23%",
            bottom: "23%",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#8b6914 transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "18px 14px 28px",
          }}
        >
          <div className="font-pixel text-2xl text-[#8b6914] mb-3">VICTORY</div>
          <h2 className="font-pixel text-base text-[#8b6914] mb-3">YOU ESCAPED THE DUNGEON</h2>
          <p className="font-mono-pixel text-sm leading-relaxed text-[#3b1f0a] mb-5">
            The relic <span className="text-[#8b6914]">{targetFile}</span> rests safely in your inventory.{" "}
            {completionMessage ?? "The torches die. Daylight returns."}
          </p>
          {report && (
            <div className="mb-5 w-full max-w-[480px] text-left font-mono-pixel text-[11px] leading-relaxed text-[#3b1f0a]">
              <div className="mb-2 text-center font-pixel text-[11px] text-[#8b6914]">RUN REPORT</div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-1">
                <span>Time</span><strong>{report.time}</strong>
                <span>Commands</span><strong>{report.commandsUsed}</strong>
                <span>Mistakes</span><strong>{report.mistakesMade}</strong>
                <span>Strength</span><strong>{report.strongestCommand}</strong>
                <span>Weakness</span><strong>{report.weakestCommand}</strong>
              </div>
              <div className="mt-3 text-center text-[#8b6914]">Skill unlocked: {report.skillUnlocked}</div>
              <p className="mt-2 mb-0 text-center">{report.feedback}</p>
              <p className="mt-1 mb-0 text-center">Next lesson: {report.nextLesson}</p>
            </div>
          )}
          <Button
            onClick={onReset}
            disabled={busy}
            className="font-pixel text-[10px] tracking-widest"
          >
            {busy ? "SHAPING DUNGEON..." : actionLabel}
          </Button>
        </div>
        <div
          className="pointer-events-none absolute left-[18%] right-[18%] bottom-[16.5%] flex justify-center pb-1"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(235, 205, 130, 0.45) 58%, rgba(235, 205, 130, 0.68))",
          }}
        >
          <div className="rounded-sm bg-[#ead08a]/70 px-2 py-0.5 font-pixel text-[7px] uppercase tracking-widest text-[#8b6914] shadow-sm">
            Scroll for more
          </div>
        </div>
      </div>
    </div>
  );
}
