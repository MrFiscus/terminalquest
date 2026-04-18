import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { GameState, TerminalLine } from "@/game/types";

interface TerminalProps {
  state: GameState;
  onSubmit: (raw: string) => void;
}

const lineClass: Record<TerminalLine["kind"], string> = {
  input: "text-zinc-400",
  output: "text-zinc-100",
  error: "text-red-400",
  dm: "text-violet-300 italic",
  system: "text-zinc-500",
  victory: "text-emerald-400 font-semibold",
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

  // Auto-focus on every keystroke anywhere
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
      className="relative flex h-full flex-col bg-zinc-950"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
        </div>
        <span className="text-[11px] text-zinc-500 font-mono-clean">user@dungeon — bash</span>
        <span className="text-[11px] text-zinc-600 font-mono-clean">tty1</span>
      </div>

      {/* History */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-4 py-3 font-mono-clean"
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
      <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-2 font-mono-clean">
        <span className="text-zinc-400">
          user@dungeon:<span className="text-emerald-400">{state.cwd}</span>$
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
            className="w-full bg-transparent text-zinc-100 outline-none caret-transparent disabled:opacity-60"
            aria-label="Terminal input"
          />
          <span
            className="cursor-block pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{ left: `${input.length}ch` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
