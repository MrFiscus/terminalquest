import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  commandLibrary,
  type CommandEntry,
  type DifficultyLevel,
} from "@/game/commandLibrary";

const DIFFICULTY_ORDER: DifficultyLevel[] = ["beginner", "intermediate", "expert"];

const difficultyColor: Record<DifficultyLevel, string> = {
  beginner:     "text-[#4ade80]",
  intermediate: "text-[#facc15]",
  expert:       "text-[#f87171]",
};

const difficultyBadge: Record<DifficultyLevel, string> = {
  beginner:     "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30",
  intermediate: "bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/30",
  expert:       "bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30",
};

function CommandCard({ entry }: { entry: CommandEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="w-full text-left rounded border border-[hsl(var(--terminal-frame)/0.4)] bg-[hsl(0_0%_7%)] hover:bg-[hsl(0_0%_10%)] transition-colors px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--terminal-frame))]"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-[#60a5fa]">{entry.name}</span>
          {entry.aliases?.length ? (
            <span className="font-mono text-[10px] text-[#9ca3af]">
              ({entry.aliases.join(", ")})
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", difficultyBadge[entry.difficulty])}>
            {entry.difficulty}
          </span>
          <span className="text-[#9ca3af] text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      <p className="mt-0.5 text-[12px] text-[#d1d5db]">{entry.description}</p>

      {/* Expanded detail */}
      {open && (
        <div
          className="mt-2 border-t border-[hsl(var(--terminal-frame)/0.3)] pt-2 space-y-2 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">{entry.longDescription}</p>

          {/* Usage */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">Usage</span>
            <pre className="mt-0.5 rounded bg-[hsl(0_0%_4%)] px-2 py-1 font-mono text-[11px] text-[#4ade80]">
              {entry.usage}
            </pre>
          </div>

          {/* Examples */}
          {entry.examples.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">Examples</span>
              <div className="mt-0.5 rounded bg-[hsl(0_0%_4%)] px-2 py-1 space-y-0.5">
                {entry.examples.map((ex) => (
                  <pre key={ex} className="font-mono text-[11px] text-[#f3f4f6]">
                    $ {ex}
                  </pre>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {entry.flags && entry.flags.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">Common Flags</span>
              <div className="mt-0.5 space-y-0.5">
                {entry.flags.map((f) => (
                  <div key={f.flag} className="flex gap-2 text-[11px]">
                    <code className="shrink-0 w-24 font-mono text-[#facc15]">{f.flag}</code>
                    <span className="text-[#9ca3af]">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* See also */}
          {entry.seeAlso && entry.seeAlso.length > 0 && (
            <p className="text-[10px] text-[#6b7280]">
              See also:{" "}
              <span className="font-mono text-[#60a5fa]">{entry.seeAlso.join(", ")}</span>
            </p>
          )}
        </div>
      )}
    </button>
  );
}

export function CommandLibraryPanel() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DifficultyLevel | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return commandLibrary.filter((c) => {
      if (filter !== "all" && c.difficulty !== filter) return false;
      if (!q) return true;
      return (
        c.name.includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.includes(q) ||
        c.aliases?.some((a) => a.includes(q))
      );
    });
  }, [search, filter]);

  const grouped = useMemo(() => {
    const map: Record<DifficultyLevel, CommandEntry[]> = {
      beginner: [],
      intermediate: [],
      expert: [],
    };
    for (const entry of filtered) map[entry.difficulty].push(entry);
    return map;
  }, [filtered]);

  const total = commandLibrary.length;
  const shown = filtered.length;

  return (
    <div className="flex h-full flex-col scriptorium-bg scriptorium-frame iron-rivets font-mono-clean">
      {/* Title bar — mirrors Terminal style */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(var(--terminal-frame))] bg-[hsl(0_0%_6%)]">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_0%_18%)] shadow-[inset_0_0_2px_hsl(0_0%_0%/0.9)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_0%_18%)] shadow-[inset_0_0_2px_hsl(0_0%_0%/0.9)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_0%_18%)] shadow-[inset_0_0_2px_hsl(0_0%_0%/0.9)]" />
        </div>
        <span className="text-[11px] text-[hsl(var(--terminal-text)/0.7)]">Command Library</span>
        <span className="text-[11px] text-[#6b7280]">{shown}/{total}</span>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-2 border-b border-[hsl(var(--terminal-frame)/0.5)] bg-[hsl(0_0%_5%)] px-3 py-2">
        <input
          type="text"
          placeholder="Search commands…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-[hsl(var(--terminal-frame)/0.5)] bg-[hsl(0_0%_8%)] px-2 py-1 font-mono text-[12px] text-[#f3f4f6] placeholder-[#4b5563] outline-none focus:border-[#60a5fa]"
          spellCheck={false}
        />
        <div className="flex gap-1">
          {(["all", ...DIFFICULTY_ORDER] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilter(d)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
                filter === d
                  ? d === "all"
                    ? "bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/40"
                    : difficultyBadge[d as DifficultyLevel]
                  : "bg-transparent text-[#6b7280] border border-[#374151] hover:border-[#6b7280]",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Command list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scriptorium-scroll">
        {DIFFICULTY_ORDER.map((level) => {
          const entries = grouped[level];
          if (!entries.length) return null;
          return (
            <section key={level}>
              <div className={cn("mb-1.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider", difficultyColor[level])}>
                <span>{level}</span>
                <span className="text-[#4b5563] font-normal normal-case tracking-normal">
                  — {entries.length} command{entries.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <CommandCard key={entry.name} entry={entry} />
                ))}
              </div>
            </section>
          );
        })}

        {shown === 0 && (
          <p className="mt-8 text-center text-[12px] text-[#4b5563] italic">
            No commands match "{search}"
          </p>
        )}
      </div>
    </div>
  );
}
