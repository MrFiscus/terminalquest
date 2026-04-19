import type { LinuxCommand } from "./types";

export const RUNS_STORAGE_KEY = "terminalquest_runs";
export const PLAYER_STORAGE_KEY = "terminalquest_player";
export const ACTIVE_RUN_STORAGE_KEY = "terminalquest_active_run";
export const FAMILIARITY_STORAGE_KEY = "terminalquest_familiarity";
export const ONBOARDED_STORAGE_KEY = "terminalquest_onboarded";
export const LEVEL_SESSION_STORAGE_KEY = "terminalquest_level_session";
const PROFILE_SCOPE_STORAGE_KEY = "terminalquest_profile_scope";

export const PROFILE_COMMANDS = ["ls", "cd", "mv", "cat", "find", "mkdir", "rm", "pwd", "file"] as const;
export type ProfileCommand = typeof PROFILE_COMMANDS[number];

export interface RunRecord {
  id: string;
  difficulty: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  totalCommands: number;
  commands: string[];
  commandCounts: Record<string, number>;
  mistakes: string[];
  roomsVisited: number;
  lockedDoorUnlocked: boolean;
  lockedDoorsUnlocked: number;
  keysFound: number;
  targetFile: string;
}

export interface ActiveRunRecord {
  difficulty: string;
  startedAt: number;
  updatedAt: number;
  totalCommands: number;
  commands: string[];
  commandCounts: Record<string, number>;
  mistakes: string[];
  roomsVisited: number;
  lockedDoorsUnlocked: number;
  keysFound: number;
  targetFile: string;
}

export interface ProgressSummary {
  runs: RunRecord[];
  activeRun: ActiveRunRecord | null;
  playerName: string;
  totalLevels: number;
  bestTimeByDifficulty: Record<string, number | null>;
  totalCommands: number;
  favoriteCommand: string;
  totalKeysFound: number;
  totalLockedDoorsUnlocked: number;
  currentWinStreak: number;
  bestWinStreak: number;
  levelsToday: number;
  commandTotals: Record<string, number>;
  commandMistakes: Record<string, number>;
}

const emptyCounts = () => Object.fromEntries(PROFILE_COMMANDS.map((cmd) => [cmd, 0])) as Record<string, number>;

function storage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function scopedKey(base: string) {
  const scope = storage()?.getItem(PROFILE_SCOPE_STORAGE_KEY);
  return scope ? `${base}:${scope}` : base;
}

function readJson<T>(keyName: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(keyName);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function userScope(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function setProgressProfileUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null,
) {
  const store = storage();
  if (!store) return;
  if (!user) {
    store.removeItem(PROFILE_SCOPE_STORAGE_KEY);
    return;
  }

  const scope = userScope(user.id);
  const nextRunsKey = `${RUNS_STORAGE_KEY}:${scope}`;
  const nextPlayerKey = `${PLAYER_STORAGE_KEY}:${scope}`;
  const guestRuns = store.getItem(RUNS_STORAGE_KEY);
  const guestName = store.getItem(PLAYER_STORAGE_KEY);

  store.setItem(PROFILE_SCOPE_STORAGE_KEY, scope);

  if (!store.getItem(nextRunsKey) && guestRuns) {
    store.setItem(nextRunsKey, guestRuns);
  }

  const guestActiveRun = store.getItem(ACTIVE_RUN_STORAGE_KEY);
  const nextActiveRunKey = `${ACTIVE_RUN_STORAGE_KEY}:${scope}`;

  if (guestActiveRun && !store.getItem(nextActiveRunKey)) {
    store.setItem(nextActiveRunKey, guestActiveRun);
  }

  if (!store.getItem(nextPlayerKey)) {
    const metaName =
      typeof user.user_metadata?.username === "string" ? user.user_metadata.username :
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name :
      typeof user.user_metadata?.name === "string" ? user.user_metadata.name :
      null;
    const fallbackName = guestName || user.email?.split("@")[0] || "Adventurer";
    store.setItem(nextPlayerKey, (metaName || fallbackName).trim().slice(0, 28) || "Adventurer");
  }
}

export function readRuns(): RunRecord[] {
  const parsed = readJson<unknown>(scopedKey(RUNS_STORAGE_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((run): run is RunRecord => Boolean(run && typeof run === "object" && typeof run.completedAt === "number"))
    .slice(-20);
}

export function saveRuns(runs: RunRecord[]) {
  storage()?.setItem(scopedKey(RUNS_STORAGE_KEY), JSON.stringify(runs.slice(-20)));
}

export function appendRun(run: RunRecord) {
  const runs = [...readRuns(), run].slice(-20);
  saveRuns(runs);
  return runs;
}

export function readActiveRun(): ActiveRunRecord | null {
  const parsed = readJson<unknown>(scopedKey(ACTIVE_RUN_STORAGE_KEY), null);
  if (!parsed || typeof parsed !== "object") return null;
  const run = parsed as Partial<ActiveRunRecord>;
  if (typeof run.startedAt !== "number") return null;
  return {
    difficulty: typeof run.difficulty === "string" ? run.difficulty : "default",
    startedAt: run.startedAt,
    updatedAt: typeof run.updatedAt === "number" ? run.updatedAt : run.startedAt,
    totalCommands: typeof run.totalCommands === "number" ? run.totalCommands : Array.isArray(run.commands) ? run.commands.length : 0,
    commands: Array.isArray(run.commands) ? run.commands.filter((cmd): cmd is string => typeof cmd === "string") : [],
    commandCounts: run.commandCounts && typeof run.commandCounts === "object" ? run.commandCounts as Record<string, number> : {},
    mistakes: Array.isArray(run.mistakes) ? run.mistakes.filter((cmd): cmd is string => typeof cmd === "string") : [],
    roomsVisited: typeof run.roomsVisited === "number" ? run.roomsVisited : 1,
    lockedDoorsUnlocked: typeof run.lockedDoorsUnlocked === "number" ? run.lockedDoorsUnlocked : 0,
    keysFound: typeof run.keysFound === "number" ? run.keysFound : 0,
    targetFile: typeof run.targetFile === "string" ? run.targetFile : "relic.txt",
  };
}

export function saveActiveRun(run: ActiveRunRecord | null) {
  const store = storage();
  if (!store) return;
  const keyName = scopedKey(ACTIVE_RUN_STORAGE_KEY);
  if (!run) store.removeItem(keyName);
  else store.setItem(keyName, JSON.stringify(run));
}

export function clearActiveRun() {
  saveActiveRun(null);
}

export function readPlayerName() {
  return storage()?.getItem(scopedKey(PLAYER_STORAGE_KEY)) || "Adventurer";
}

export function savePlayerName(name: string) {
  const cleaned = name.trim().slice(0, 28) || "Adventurer";
  storage()?.setItem(scopedKey(PLAYER_STORAGE_KEY), cleaned);
  return cleaned;
}

/**
 * Persisted Linux-familiarity slider value (0–100). Returns null if the
 * current user has never confirmed the slider. Scoped per-user via the
 * same mechanism the other storage helpers use, so multiple accounts on
 * one machine don't overwrite each other's progression.
 */
export function readFamiliarity(): number | null {
  const raw = storage()?.getItem(scopedKey(FAMILIARITY_STORAGE_KEY));
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveFamiliarity(value: number) {
  storage()?.setItem(scopedKey(FAMILIARITY_STORAGE_KEY), String(Math.round(value)));
}

export function clearFamiliarity() {
  storage()?.removeItem(scopedKey(FAMILIARITY_STORAGE_KEY));
}

/**
 * First-time onboarding flag. True once the user has confirmed the
 * difficulty slider at least once. Drives whether the slider is shown
 * on `/play` entry (first-time users) or skipped in favor of the
 * adaptive loop (returning users).
 */
export function readOnboarded(): boolean {
  return storage()?.getItem(scopedKey(ONBOARDED_STORAGE_KEY)) === "1";
}

export function setOnboarded(flag: boolean) {
  const s = storage();
  if (!s) return;
  if (flag) s.setItem(scopedKey(ONBOARDED_STORAGE_KEY), "1");
  else s.removeItem(scopedKey(ONBOARDED_STORAGE_KEY));
}

// ---------------------------------------------------------------------
// Level session — full "resume last level" snapshot
// ---------------------------------------------------------------------
// Kept as `unknown` in the signature so we don't couple this module to
// the GameState shape (which would cycle through types.ts → game imports
// back here). The hook that owns state casts it at the boundary.

export interface LevelSessionSnapshot {
  /** Wall-clock when this snapshot was written. Used only for the UI. */
  savedAt: number;
  /** Difficulty label the player selected for this run (easy/medium/hard). */
  activeDifficulty: string | null;
  /** Linux-familiarity slider value (0-100) the run started with. */
  linuxFamiliarity: number | null;
  /** A short human-readable summary of where the player is (room name / cwd). */
  label: string;
  /** Scrubbed GameState snapshot (transient UI like popups/animations stripped). */
  state: unknown;
  /** RunTracker snapshot — Set converted to string[] for JSON. */
  tracker: {
    difficulty: string;
    startedAt: number;
    commands: string[];
    mistakes: string[];
    visitedRooms: string[];
    keysFound: number;
    lockedDoorsUnlocked: number;
    completed: boolean;
  };
}

export function readLevelSession(): LevelSessionSnapshot | null {
  const raw = storage()?.getItem(scopedKey(LEVEL_SESSION_STORAGE_KEY));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LevelSessionSnapshot>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.savedAt !== "number") return null;
    return parsed as LevelSessionSnapshot;
  } catch {
    return null;
  }
}

export function saveLevelSession(session: LevelSessionSnapshot) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(scopedKey(LEVEL_SESSION_STORAGE_KEY), JSON.stringify(session));
  } catch {
    // If localStorage is full or the state exceeds quota, fail silently —
    // the run still continues in memory.
  }
}

export function clearLevelSession() {
  storage()?.removeItem(scopedKey(LEVEL_SESSION_STORAGE_KEY));
}

export function baseCommand(raw: string) {
  return raw.trim().split(/\s+/)[0]?.toLowerCase() || "";
}

export function masteryLabel(uses: number) {
  if (uses >= 30) return "Master";
  if (uses >= 15) return "Journeyman";
  if (uses >= 5) return "Apprentice";
  return "Beginner";
}

export function masteryBar(uses: number) {
  const filled = Math.max(0, Math.min(10, Math.ceil((uses / 30) * 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

export function formatDuration(ms: number | null | undefined) {
  if (!ms || ms <= 0) return "n/a";
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

export function summarizeProgress(runs = readRuns(), playerName = readPlayerName(), activeRun = readActiveRun()): ProgressSummary {
  const commandTotals = emptyCounts();
  const commandMistakes = emptyCounts();
  const bestTimeByDifficulty: Record<string, number | null> = {
    easy: null,
    medium: null,
    hard: null,
    default: null,
  };
  let totalCommands = 0;
  let totalKeysFound = 0;
  let totalLockedDoorsUnlocked = 0;

  for (const run of runs) {
    totalCommands += run.totalCommands;
    totalKeysFound += run.keysFound ?? 0;
    totalLockedDoorsUnlocked += run.lockedDoorsUnlocked ?? (run.lockedDoorUnlocked ? 1 : 0);
    const difficulty = (run.difficulty || "default").toLowerCase();
    bestTimeByDifficulty[difficulty] =
      bestTimeByDifficulty[difficulty] === null
        ? run.durationMs
        : Math.min(bestTimeByDifficulty[difficulty] ?? run.durationMs, run.durationMs);
    for (const [cmd, count] of Object.entries(run.commandCounts ?? {})) {
      commandTotals[cmd] = (commandTotals[cmd] ?? 0) + count;
    }
    for (const mistake of run.mistakes ?? []) {
      const cmd = baseCommand(mistake);
      if (cmd) commandMistakes[cmd] = (commandMistakes[cmd] ?? 0) + 1;
    }
  }

  if (activeRun) {
    totalCommands += activeRun.totalCommands;
    totalKeysFound += activeRun.keysFound ?? 0;
    totalLockedDoorsUnlocked += activeRun.lockedDoorsUnlocked ?? 0;
    for (const [cmd, count] of Object.entries(activeRun.commandCounts ?? {})) {
      commandTotals[cmd] = (commandTotals[cmd] ?? 0) + count;
    }
    for (const mistake of activeRun.mistakes ?? []) {
      const cmd = baseCommand(mistake);
      if (cmd) commandMistakes[cmd] = (commandMistakes[cmd] ?? 0) + 1;
    }
  }

  const favoriteCommand =
    Object.entries(commandTotals).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(commandTotals).sort((a, b) => b[1] - a[1])[0][0]
      : "ls";

  const today = new Date().toDateString();
  const levelsToday = runs.filter((run) => new Date(run.completedAt).toDateString() === today).length;

  return {
    runs,
    activeRun,
    playerName,
    totalLevels: runs.length,
    bestTimeByDifficulty,
    totalCommands,
    favoriteCommand,
    totalKeysFound,
    totalLockedDoorsUnlocked,
    currentWinStreak: runs.length,
    bestWinStreak: runs.length,
    levelsToday,
    commandTotals,
    commandMistakes,
  };
}

export function weakSpotLines(summary: ProgressSummary) {
  const lines: string[] = [];
  for (const cmd of PROFILE_COMMANDS) {
    const uses = summary.commandTotals[cmd] ?? 0;
    const mistakes = summary.commandMistakes[cmd] ?? 0;
    if (uses === 0) lines.push(`You have never used ${cmd} - try it when the dungeon asks for it.`);
    else if (mistakes >= 3) lines.push(`You mistyped ${cmd} ${mistakes} times - check the command pattern before casting.`);
    if (lines.length >= 4) break;
  }
  return lines.length ? lines : ["No major weak spots yet. Keep experimenting with different commands."];
}

export function personalizedTips(summary: ProgressSummary) {
  const tips: string[] = [];
  if ((summary.commandTotals.find ?? 0) < 5) tips.push("Tip: use find to locate items faster.");
  if ((summary.commandTotals.pwd ?? 0) < 3) tips.push("Tip: use pwd to check where you are when lost.");
  if ((summary.commandTotals.cat ?? 0) < 3) tips.push("Tip: use cat on files to find hidden clues.");
  if ((summary.commandTotals.mv ?? 0) < 5) tips.push("Tip: remember mv <file> ~/inventory when you find the target.");
  return tips.length ? tips.slice(0, 2) : ["Tip: keep mixing navigation, inspection, and movement commands."];
}

export function efficiencyInsight(runs: RunRecord[]) {
  if (runs.length < 2) return "Complete another level to reveal your learning curve.";
  const previous = runs[runs.length - 2].totalCommands;
  const latest = runs[runs.length - 1].totalCommands;
  if (latest < previous) {
    const percent = Math.round(((previous - latest) / Math.max(previous, 1)) * 100);
    return `You used ${percent}% fewer commands this run - you are getting more efficient!`;
  }
  if (latest === previous) return "Try using find instead of exploring every room.";
  return "This run took more commands. Use pwd and find when the maze starts to sprawl.";
}

export function buildWhoamiLines(summary = summarizeProgress()) {
  const last = summary.runs.at(-1);
  const masteryCommands: ProfileCommand[] = ["ls", "cd", "mv", "find"];
  const tip = personalizedTips(summary)[0] ?? "Tip: use find to locate items faster.";
  const rows = [
    "┌─────────────────────────────┐",
    `│  ${summary.playerName.padEnd(27).slice(0, 27)}│`,
    `│  Levels completed: ${String(summary.totalLevels).padEnd(8)}│`,
    `│  Win streak: ${String(summary.currentWinStreak).padEnd(15)}│`,
    `│  Favorite command: ${summary.favoriteCommand.padEnd(8).slice(0, 8)}│`,
    "├─────────────────────────────┤",
    "│  MASTERY                    │",
    ...masteryCommands.map((cmd) => {
      const uses = summary.commandTotals[cmd] ?? 0;
      return `│  ${cmd.padEnd(5)} ${masteryBar(uses)} ${masteryLabel(uses).padEnd(10).slice(0, 10)}│`;
    }),
    "├─────────────────────────────┤",
    "│  LAST RUN                   │",
    `│  Difficulty: ${(last?.difficulty ?? "None").padEnd(14).slice(0, 14)}│`,
    `│  Time: ${formatDuration(last?.durationMs).padEnd(20).slice(0, 20)}│`,
    `│  Commands used: ${String(last?.totalCommands ?? 0).padEnd(8)}│`,
    `│  Mistakes: ${String(last?.mistakes.length ?? 0).padEnd(15)}│`,
    "├─────────────────────────────┤",
    `│  ${tip.slice(0, 27).padEnd(27)}│`,
    `│  ${(tip.length > 27 ? tip.slice(27, 54) : "").padEnd(27)}│`,
    "└─────────────────────────────┘",
  ];
  return rows;
}

export function countCommands(commands: string[]) {
  const counts: Record<string, number> = {};
  for (const raw of commands) {
    const cmd = baseCommand(raw);
    if (!cmd) continue;
    counts[cmd] = (counts[cmd] ?? 0) + 1;
  }
  return counts;
}

export function isProfileCommand(cmd: string): cmd is ProfileCommand {
  return (PROFILE_COMMANDS as readonly string[]).includes(cmd);
}

export function commandFromRaw(raw: string): LinuxCommand | null {
  const cmd = baseCommand(raw) as LinuxCommand;
  return cmd || null;
}
