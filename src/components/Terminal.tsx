import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { GameState, TerminalLine } from "@/game/types";
import { commandDefinitions } from "@/game/commandSystem/registry";

interface TerminalProps {
  state: GameState;
  onSubmit: (raw: string) => void;
}

// Dungeon palette — rune colors on dark stone:
//   input (user commands) = warm gold like torchlit inscriptions
//   output = parchment cream
//   errors = blood-red glow
//   DM / system = faded grey like weathered stone etchings
//   victory = bright emerald gleam
//   npc = mystic purple
const lineClass: Record<TerminalLine["kind"], string> = {
  input: "term-line-input",
  output: "term-line-output",
  error: "term-line-error",
  dm: "term-line-dm",
  system: "term-line-system",
  victory: "term-line-victory",
  npc: "term-line-npc",
};

// Detect ls-style entries and assign themed color conventions.
function lsTokenClass(text: string): string | null {
  const t = text.trim();
  if (!t || t === "(empty)") return null;
  if (/\/$/.test(t)) return "term-ls-dir";
  if (/\.(sh|bin|exe|run)$/i.test(t)) return "term-ls-exec";
  if (/\.(lnk|link)$/i.test(t)) return "term-ls-link";
  if (/^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/.test(t)) return "term-ls-file";
  return null;
}

const commandNames = commandDefinitions.flatMap((c) => [c.name, ...(c.aliases ?? [])]).sort();

function commonPrefix(strs: string[]): string {
  if (!strs.length) return "";
  let prefix = strs[0];
  for (const s of strs.slice(1)) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return "";
  }
  return prefix;
}

function getTabCompletion(input: string, state: GameState): string | null {
  const endsWithSpace = input.endsWith(" ");
  const tokens = input.trim().split(/\s+/).filter(Boolean);

  if (tokens.length <= 1 && !endsWithSpace) {
    const partial = tokens[0] ?? "";
    const matches = commandNames.filter((n) => n.startsWith(partial));
    if (!matches.length) return null;
    const completed = commonPrefix(matches);
    return completed.length > partial.length ? completed : null;
  }

  const partial = endsWithSpace ? "" : (tokens[tokens.length - 1] ?? "");
  const prefix = endsWithSpace ? input : input.slice(0, input.lastIndexOf(partial));

  const cmd = tokens[0]?.toLowerCase();
  const room = state.rooms[state.cwd];
  const candidates: string[] = [];

  if (room) {
    if (cmd !== "cd") candidates.push(...room.files.map((f) => f.name));
    candidates.push(...room.doors.map((d) => d.target + "/"));
  }

  const matches = candidates.filter((c) => c.startsWith(partial));
  if (!matches.length) return null;
  if (matches.length === 1) return prefix + matches[0];
  const completed = commonPrefix(matches);
  return completed.length > partial.length ? prefix + completed : null;
}

// ---------------------------------------------------------------------------
// PATH TRUNCATION & DISPLAY
// ---------------------------------------------------------------------------

function tildefy(cwd: string): string {
  if (cwd === "/home/user") return "~";
  if (cwd.startsWith("/home/user/")) return "~/" + cwd.slice("/home/user/".length);
  return cwd;
}

function truncatePath(display: string): string {
  const parts = display.split("/");
  if (parts.length <= 3) return display;
  const head = parts[0];
  const tail = parts.slice(-2);
  return `${head}/.../${tail.join("/")}`;
}

function isDeepOrRestricted(cwd: string): boolean {
  const depth = cwd.replace(/^\/home\/user\/?/, "").split("/").filter(Boolean).length;
  if (depth >= 3) return true;
  const restricted = /\b(vault|secret|prison|restricted|forbidden|tomb|crypt|oubliette|trap)\b/i;
  return restricted.test(cwd);
}

export function Terminal({ state, onSubmit }: TerminalProps) {
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
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
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (state.animating || state.won || state.activeMauQuiz) return;
      
      const target = document.activeElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "BUTTON" ||
        target?.tagName === "SELECT" ||
        target?.getAttribute("contenteditable") === "true"
      ) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const value = input;
        setInput("");
        setCursorPos(0);
        setHistIndex(null);
        inputRef.current?.focus();
        onSubmit(value);
        return;
      }
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input, onSubmit, state.activeMauQuiz, state.animating, state.won]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = input;
      setInput("");
      setCursorPos(0);
      setHistIndex(null);
      onSubmit(value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const ch = state.commandHistory;
      if (!ch.length) return;
      const idx = histIndex === null ? ch.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(idx);
      setInput(ch[idx]);
      setCursorPos(ch[idx].length);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const ch = state.commandHistory;
      if (histIndex === null) return;
      const idx = histIndex + 1;
      if (idx >= ch.length) {
        setHistIndex(null);
        setInput("");
        setCursorPos(0);
      } else {
        setHistIndex(idx);
        setInput(ch[idx]);
        setCursorPos(ch[idx].length);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const completed = getTabCompletion(input, state);
      if (completed !== null) {
        setInput(completed);
        setCursorPos(completed.length);
      }
    }
  };

  // Compute display path
  const tildePath = tildefy(state.cwd);
  const displayPath = truncatePath(tildePath);
  const deep = isDeepOrRestricted(state.cwd);

  const finalPath =
    displayPath.length > 20
      ? "…" + displayPath.slice(displayPath.length - 19)
      : displayPath;

  const twoLinePrompt = finalPath.length > 14;

  return (
    <div
      className="dungeon-terminal relative flex h-full flex-col"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Stone-texture scanline overlay */}
      <div className="dungeon-terminal-scanlines" aria-hidden />

      {/* Torchlight vignette */}
      <div className="dungeon-terminal-vignette" aria-hidden />

      {/* Title bar — iron plate with rune text */}
      <div className="dungeon-terminal-header">
        <span className="dungeon-terminal-header-text">
          ⚔ <span style={{ letterSpacing: '0.12em' }}>TERMINAL QUEST</span> ⚔
        </span>
        <span className="dungeon-terminal-header-sub">rune·shell</span>
      </div>

      {/* History & Active Prompt — scrolling rune inscriptions */}
      <div
        ref={scrollRef}
        className="dungeon-terminal-scroll relative flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1"
      >
        {state.history.map((line, idx) => {
          const isLast = idx === state.history.length - 1;
          const tokenColor = line.kind === "output" ? lsTokenClass(line.text) : null;
          return (
            <div
              key={line.id}
              className={cn(
                "whitespace-pre-wrap text-left transition-opacity duration-300",
                tokenColor ?? lineClass[line.kind],
                isLast ? "opacity-100" : "opacity-70",
              )}
            >
              {line.text}
            </div>
          );
        })}

        {/* Active Input Prompt */}
        <div className="mt-2">
          {twoLinePrompt ? (
            <>
              <div className="dungeon-prompt-line">
                <span className="dungeon-prompt-user">adventurer</span>
                <span className="dungeon-prompt-sep">⟩</span>
                <span className={cn("dungeon-prompt-path", deep && "dungeon-prompt-path-deep")}>
                  {finalPath}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="dungeon-prompt-sigil">❯</span>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setCursorPos(e.target.selectionStart ?? e.target.value.length);
                    }}
                    onSelect={(e) => setCursorPos(e.currentTarget.selectionStart ?? input.length)}
                    onKeyDown={handleKey}
                    disabled={state.animating || state.won}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    className="dungeon-terminal-input"
                    aria-label="Terminal input"
                  />
                  <span
                    className="dungeon-cursor pointer-events-none absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${cursorPos}ch` }}
                    aria-hidden
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="dungeon-prompt-line flex-shrink-0">
                <span className="dungeon-prompt-user">adventurer</span>
                <span className="dungeon-prompt-sep">⟩</span>
                <span className={cn("dungeon-prompt-path", deep && "dungeon-prompt-path-deep")}>
                  {finalPath}
                </span>
                <span className="dungeon-prompt-sigil ml-1">❯</span>
              </span>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setCursorPos(e.target.selectionStart ?? e.target.value.length);
                  }}
                  onSelect={(e) => setCursorPos(e.currentTarget.selectionStart ?? input.length)}
                  onKeyDown={handleKey}
                  disabled={state.animating || state.won}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  className="dungeon-terminal-input"
                  aria-label="Terminal input"
                />
                <span
                  className="dungeon-cursor pointer-events-none absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${cursorPos}ch` }}
                  aria-hidden
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
