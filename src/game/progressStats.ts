import type { LinuxCommand } from "./types";

export const RUNS_STORAGE_KEY = "terminalquest_runs";
export const PLAYER_STORAGE_KEY = "terminalquest_player";

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

export interface ProgressSummary {
  runs: RunRecord[];
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

export function readRuns(): RunRecord[] {
  try {
    const raw = storage()?.getItem(RUNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((run): run is RunRecord => Boolean(run && typeof run === "object" && typeof run.completedAt === "number"))
      .slice(-20);
  } catch {
    return [];
  }
}

export function saveRuns(runs: RunRecord[]) {
  storage()?.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs.slice(-20)));
}

export function appendRun(run: RunRecord) {
  const runs = [...readRuns(), run].slice(-20);
  saveRuns(runs);
  return runs;
}

export function readPlayerName() {
  return storage()?.getItem(PLAYER_STORAGE_KEY) || "Adventurer";
}

export function savePlayerName(name: string) {
  const cleaned = name.trim().slice(0, 28) || "Adventurer";
  storage()?.setItem(PLAYER_STORAGE_KEY, cleaned);
  return cleaned;
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

export function summarizeProgress(runs = readRuns(), playerName = readPlayerName()): ProgressSummary {
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

  const favoriteCommand =
    Object.entries(commandTotals).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(commandTotals).sort((a, b) => b[1] - a[1])[0][0]
      : "ls";

  const today = new Date().toDateString();
  const levelsToday = runs.filter((run) => new Date(run.completedAt).toDateString() === today).length;

  return {
    runs,
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
