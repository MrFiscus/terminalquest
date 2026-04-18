import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { GameState, TerminalLine } from "@/game/types";

interface TerminalProps {
  state: GameState;
  onSubmit: (raw: string) => void;
}

// Colors map: ash white default, ember gold for prompt, soft accents elsewhere.
const lineClass: Record<TerminalLine["kind"], string> = {
  input: "text-[hsl(var(--terminal-prompt))]",
  output: "text-[hsl(var(--terminal-text))]",
  error: "text-[hsl(0_0%_63%)] italic",            // muted silver, italic
  dm: "text-[hsl(0_0%_63%)] italic",               // Dungeon Master = silver italic
  system: "text-[hsl(0_0%_63%)] italic",
  victory: "text-[hsl(140_60%_60%)] font-semibold",
};

function linePrefix(kind: TerminalLine["kind"]): string {
  if (kind === "output") return "✓ ";
  if (kind === "error") return "! ";
  return "";
}

export function Terminal({ state, onSubmit }: TerminalProps) {
  const [input, setInput] = useState("");
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.history.length]);

  useEffect(() => {
    if (!state.animating) inputRef.current?.focus();
  }, [state.animating]);

  useEffect(() => {
    const onKey = () => {
      if (state.animating || state.won) return;
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.animating, state.won]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = input;
      setInput("");
      setHistIndex(null);
      onSubmit(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const ch = state.commandHistory;
      if (!ch.length) return;
      const idx = histIndex === null ? ch.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(idx);
      setInput(ch[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const ch = state.commandHistory;
      if (histIndex === null) return;
      const idx = histIndex + 1;
      if (idx >= ch.length) {
        setHistIndex(null);
        setInput("");
      } else {
        setHistIndex(idx);
        setInput(ch[idx]);
      }
    }
  };

  return (
    <div
      className="relative flex h-full flex-col scriptorium-bg scriptorium-frame iron-rivets font-mono-clean"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(var(--terminal-frame))] bg-[hsl(0_0%_6%)]">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_0%_18%)] shadow-[inset_0_0_2px_hsl(0_0%_0%/0.9)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_0%_18%)] shadow-[inset_0_0_2px_hsl(0_0%_0%/0.9)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_0%_18%)] shadow-[inset_0_0_2px_hsl(0_0%_0%/0.9)]" />
        </div>
        <span className="text-[11px] text-[hsl(var(--terminal-text)/0.7)]">user@dungeon — bash</span>
        <span className="text-[11px] text-[hsl(0_0%_45%)]">tty1</span>
      </div>

      {/* History */}
      <div
        ref={scrollRef}
        className="scriptorium-scroll relative flex-1 overflow-y-auto px-4 py-3"
      >
        {state.history.map((line, idx) => {
          const isLast = idx === state.history.length - 1;
          return (
            <div
              key={line.id}
              className={cn(
                "whitespace-pre-wrap transition-opacity",
                lineClass[line.kind],
                isLast ? "opacity-100" : "opacity-55",
              )}
            >
              {linePrefix(line.kind)}
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Input row */}
      <div className="ember-glow flex items-center gap-2 border-t-2 scriptorium-divider bg-[hsl(0_0%_5%)] px-4 py-2">
        <span className="text-[hsl(var(--terminal-text)/0.85)]">
          user@dungeon:
          <span className="text-[hsl(var(--terminal-prompt))] ember-bloom">{state.cwd}</span>
          $
        </span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={state.animating || state.won}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent text-[hsl(var(--terminal-prompt))] outline-none caret-transparent disabled:opacity-60 ember-bloom"
            aria-label="Terminal input"
          />
          <span
            className="cursor-block ember-cursor pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{ left: `${input.length}ch` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
