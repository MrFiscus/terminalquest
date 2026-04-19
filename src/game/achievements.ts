import {
  PLAYER_STORAGE_KEY,
  PROFILE_COMMANDS,
  type ProgressSummary,
} from "./progressStats";

/**
 * Achievements are short, motivating rewards the player earns by playing.
 * They are defined here as a single source of truth — ProfileModal, the
 * toast queue, and anything else that surfaces them all read from this
 * file.
 *
 * Each achievement ships with:
 *   - id        — stable string used for storage of "already notified"
 *   - name      — short display name
 *   - description — one-sentence goal ("Use find 20 times")
 *   - icon      — emoji that appears in the popup
 *   - rarity    — common / rare / epic / legendary (drives glow color)
 *   - reward    — short flavor text shown when unlocked
 *   - progress  — function (summary) -> { current, target, unlocked }
 *
 * `progress` is pure — it just reads the `ProgressSummary` the rest of
 * the app already computes. That keeps everything deterministic and lets
 * the profile screen render exact "5/9" progress bars.
 */

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface AchievementProgress {
  current: number;
  target: number;
  unlocked: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  reward: string;
  progress: (summary: ProgressSummary) => AchievementProgress;
}

// ---------- helpers ----------

const bounded = (current: number, target: number): AchievementProgress => ({
  current: Math.min(current, target),
  target,
  unlocked: current >= target,
});

const bestDurationMs = (summary: ProgressSummary): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const run of summary.runs) if (run.durationMs > 0 && run.durationMs < best) best = run.durationMs;
  return best === Number.POSITIVE_INFINITY ? 0 : best;
};

const bestMistakelessRun = (summary: ProgressSummary): boolean =>
  summary.runs.some((run) => (run.mistakes?.length ?? 0) === 0);

const leanestRunCommands = (summary: ProgressSummary): number => {
  let min = Number.POSITIVE_INFINITY;
  for (const run of summary.runs) if (run.totalCommands > 0 && run.totalCommands < min) min = run.totalCommands;
  return min === Number.POSITIVE_INFINITY ? 0 : min;
};

const commandUses = (summary: ProgressSummary, cmd: string) => summary.commandTotals[cmd] ?? 0;

const allCommandsUsedAtLeast = (summary: ProgressSummary, n: number) =>
  PROFILE_COMMANDS.filter((cmd) => commandUses(summary, cmd) >= n).length;

// ---------- catalog ----------

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Progression ----------------------------------------------------
  {
    id: "first-steps",
    name: "First Steps",
    description: "Complete your first level.",
    icon: "🗝️",
    rarity: "common",
    reward: "The dungeon remembers your name.",
    progress: (s) => bounded(s.totalLevels, 1),
  },
  {
    id: "hat-trick",
    name: "Hat Trick",
    description: "Complete 3 levels.",
    icon: "🎩",
    rarity: "common",
    reward: "Three relics reclaimed. The vault-keeper nods.",
    progress: (s) => bounded(s.totalLevels, 3),
  },
  {
    id: "veteran",
    name: "Veteran Adventurer",
    description: "Complete 10 levels.",
    icon: "⚔️",
    rarity: "rare",
    reward: "Ten dungeons bested. Your blade remembers every room.",
    progress: (s) => bounded(s.totalLevels, 10),
  },
  {
    id: "dungeon-legend",
    name: "Dungeon Legend",
    description: "Complete 25 levels.",
    icon: "👑",
    rarity: "legendary",
    reward: "Bards sing of you in every tavern.",
    progress: (s) => bounded(s.totalLevels, 25),
  },

  // --- Speed ----------------------------------------------------------
  {
    id: "speed-runner",
    name: "Speed Runner",
    description: "Finish a level in under 2 minutes.",
    icon: "🏃",
    rarity: "rare",
    reward: "The torches barely flickered before you were gone.",
    progress: (s) => {
      const best = bestDurationMs(s);
      return { current: best > 0 && best < 120_000 ? 1 : 0, target: 1, unlocked: best > 0 && best < 120_000 };
    },
  },
  {
    id: "lightning",
    name: "Lightning",
    description: "Finish a level in under 60 seconds.",
    icon: "⚡",
    rarity: "epic",
    reward: "A blur of keystrokes. The dungeon never stood a chance.",
    progress: (s) => {
      const best = bestDurationMs(s);
      return { current: best > 0 && best < 60_000 ? 1 : 0, target: 1, unlocked: best > 0 && best < 60_000 };
    },
  },

  // --- Efficiency -----------------------------------------------------
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Finish a level with fewer than 15 commands.",
    icon: "🎯",
    rarity: "epic",
    reward: "Not one keystroke wasted.",
    progress: (s) => {
      const lean = leanestRunCommands(s);
      return { current: lean > 0 && lean < 15 ? 1 : 0, target: 1, unlocked: lean > 0 && lean < 15 };
    },
  },
  {
    id: "flawless",
    name: "Flawless Victory",
    description: "Complete a level without any mistyped commands.",
    icon: "💎",
    rarity: "epic",
    reward: "The scribes could not fault a single stroke.",
    progress: (s) => ({
      current: bestMistakelessRun(s) ? 1 : 0,
      target: 1,
      unlocked: bestMistakelessRun(s),
    }),
  },

  // --- Exploration ----------------------------------------------------
  {
    id: "explorer",
    name: "Explorer",
    description: "Use `find` 5 times.",
    icon: "🔍",
    rarity: "common",
    reward: "No chamber stays hidden from you for long.",
    progress: (s) => bounded(commandUses(s, "find"), 5),
  },
  {
    id: "seeker",
    name: "Seeker",
    description: "Use `find` 20 times.",
    icon: "🧭",
    rarity: "rare",
    reward: "You see the paths others miss.",
    progress: (s) => bounded(commandUses(s, "find"), 20),
  },

  // --- Locks & Keys ---------------------------------------------------
  {
    id: "lockpicker",
    name: "Lockpicker",
    description: "Open 3 locked doors.",
    icon: "🗝",
    rarity: "common",
    reward: "The iron bows to patient hands.",
    progress: (s) => bounded(s.totalLockedDoorsUnlocked, 3),
  },
  {
    id: "master-lockpicker",
    name: "Master Lockpicker",
    description: "Open 10 locked doors.",
    icon: "🔓",
    rarity: "epic",
    reward: "No lock in the realm holds you now.",
    progress: (s) => bounded(s.totalLockedDoorsUnlocked, 10),
  },
  {
    id: "key-collector",
    name: "Key Collector",
    description: "Gather 5 keys across your runs.",
    icon: "🔑",
    rarity: "rare",
    reward: "A belt of old iron, heavy with promises.",
    progress: (s) => bounded(s.totalKeysFound, 5),
  },

  // --- Commands / Mastery --------------------------------------------
  {
    id: "linux-novice",
    name: "Linux Novice",
    description: "Use every core command at least once.",
    icon: "📜",
    rarity: "common",
    reward: "The shell remembers every word you've spoken.",
    progress: (s) => bounded(allCommandsUsedAtLeast(s, 1), PROFILE_COMMANDS.length),
  },
  {
    id: "linux-wizard",
    name: "Linux Wizard",
    description: "Use every core command at least 10 times.",
    icon: "🧙",
    rarity: "legendary",
    reward: "The terminal itself is your familiar.",
    progress: (s) => bounded(allCommandsUsedAtLeast(s, 10), PROFILE_COMMANDS.length),
  },
  {
    id: "ls-addict",
    name: "Observant",
    description: "Use `ls` 50 times.",
    icon: "👁",
    rarity: "rare",
    reward: "Nothing in the dark escapes you.",
    progress: (s) => bounded(commandUses(s, "ls"), 50),
  },
  {
    id: "cat-scholar",
    name: "Scholar",
    description: "Use `cat` 20 times to read scrolls and notes.",
    icon: "📖",
    rarity: "rare",
    reward: "Every scroll in the archive has your scent on it.",
    progress: (s) => bounded(commandUses(s, "cat"), 20),
  },

  // --- Daily / Streak -------------------------------------------------
  {
    id: "daily-adventurer",
    name: "Daily Adventurer",
    description: "Complete a level today.",
    icon: "🌅",
    rarity: "common",
    reward: "The sun finds you once more in the halls.",
    progress: (s) => bounded(s.levelsToday, 1),
  },
];

// ---------- lookup ----------

const INDEX = new Map(ACHIEVEMENTS.map((def) => [def.id, def]));

export function getAchievement(id: string): AchievementDef | undefined {
  return INDEX.get(id);
}

export function computeAchievementProgress(summary: ProgressSummary) {
  return ACHIEVEMENTS.map((def) => ({ def, state: def.progress(summary) }));
}

export function unlockedAchievementIds(summary: ProgressSummary): string[] {
  return ACHIEVEMENTS.filter((def) => def.progress(summary).unlocked).map((def) => def.id);
}

// ---------- notified-set storage (so we don't re-popup on reload) ----------

const NOTIFIED_KEY = "terminalquest_achievements_notified";
const PROFILE_SCOPE_KEY = "terminalquest_profile_scope";

function storage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function scoped(key: string) {
  const scope = storage()?.getItem(PROFILE_SCOPE_KEY);
  return scope ? `${key}:${scope}` : key;
}

export function readNotifiedAchievements(): Set<string> {
  try {
    const raw = storage()?.getItem(scoped(NOTIFIED_KEY));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

export function markAchievementNotified(id: string) {
  const set = readNotifiedAchievements();
  if (set.has(id)) return;
  set.add(id);
  storage()?.setItem(scoped(NOTIFIED_KEY), JSON.stringify(Array.from(set)));
}

/**
 * Compare the currently-unlocked set against what the player has already
 * seen pop up. Returns only the NEW ones, and marks them as notified so
 * reloads don't re-show them. Safe to call after every relevant state
 * change — it's cheap and idempotent per run.
 */
export function drainNewlyUnlocked(summary: ProgressSummary): AchievementDef[] {
  const unlocked = unlockedAchievementIds(summary);
  const notified = readNotifiedAchievements();
  const fresh: AchievementDef[] = [];
  for (const id of unlocked) {
    if (notified.has(id)) continue;
    const def = getAchievement(id);
    if (!def) continue;
    fresh.push(def);
    markAchievementNotified(id);
  }
  return fresh;
}

// (unused but kept for future: clear progress when player signs out)
export function clearNotifiedAchievements() {
  storage()?.removeItem(scoped(NOTIFIED_KEY));
}

// Keep PLAYER_STORAGE_KEY referenced so tree-shaking doesn't drop the
// dependency (and it documents the related storage).
void PLAYER_STORAGE_KEY;
