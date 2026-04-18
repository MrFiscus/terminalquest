import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { GameState, TerminalLine } from "@/game/types";

interface TerminalProps {
  state: GameState;
  onSubmit: (raw: string) => void;
}

const lineClass: Record<TerminalLine["kind"], string> = {
  input: "text-terminal-prompt",
  output: "text-terminal-text",
  error: "text-terminal-error",
  dm: "text-terminal-dm italic",
  system: "text-parchment/80",
  victory: "text-victory font-pixel text-xs",
};

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
      className="relative flex h-full flex-col bg-terminal-bg border-r-2 border-stone-dark"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-dark border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <div className="h-3 w-3 rounded-full bg-primary" />
          <div className="h-3 w-3 rounded-full bg-accent" />
        </div>
        <span className="font-pixel text-[10px] text-parchment/70">
          /bin/dungeon — bash
        </span>
        <span className="font-pixel text-[10px] text-muted-foreground">tty1</span>
      </div>

      {/* History */}
      <div
        ref={scrollRef}
        className="scanlines relative flex-1 overflow-y-auto px-4 py-3 font-mono-pixel"
      >
        {state.history.map((line) => (
          <div key={line.id} className={cn("whitespace-pre-wrap", lineClass[line.kind])}>
            {line.text}
          </div>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 border-t border-border bg-terminal-bg px-4 py-2 font-mono-pixel">
        <span className="text-terminal-prompt">
          user@dungeon:<span className="text-primary">{state.cwd}</span>$
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={state.animating || state.won}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-terminal-text outline-none caret-primary disabled:opacity-60"
          aria-label="Terminal input"
        />
        <span className="h-4 w-2 animate-pulse bg-primary" aria-hidden />
      </div>
    </div>
  );
}
