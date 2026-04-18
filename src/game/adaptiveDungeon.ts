import type { LinuxCommand } from "./types";

const commands: LinuxCommand[] = [
  "ls",
  "cd",
  "mkdir",
  "pwd",
  "cat",
  "mv",
  "rm",
  "find",
  "file",
  "clear",
  "echo",
  "touch",
  "cp",
  "grep",
  "help",
  "hint",
  "man",
];
const commandSet = new Set(commands);

export type CommandStats = Record<LinuxCommand, { uses: number; mistakes: number }>;

export function createCommandStats(): CommandStats {
  return Object.fromEntries(commands.map((cmd) => [cmd, { uses: 0, mistakes: 0 }])) as CommandStats;
}

export function commandFromInput(input: string): LinuxCommand | null {
  const base = input.trim().split(/\s+/)[0]?.toLowerCase();
  return commandSet.has(base as LinuxCommand) ? base as LinuxCommand : null;
}

export function recordCommandAttempt(stats: CommandStats, input: string, failed: boolean): CommandStats {
  const cmd = commandFromInput(input);
  if (!cmd) return stats;
  return {
    ...stats,
    [cmd]: {
      uses: stats[cmd].uses + 1,
      mistakes: stats[cmd].mistakes + (failed ? 1 : 0),
    },
  };
}

export function rememberMistake(recentMistakes: string[], input: string): string[] {
  const cleaned = input.trim().replace(/\s+/g, " ").slice(0, 42);
  return cleaned ? [cleaned, ...recentMistakes.filter((entry) => entry !== cleaned)].slice(0, 5) : recentMistakes;
}

export function getWeakCommands(stats: CommandStats, limit = 4): LinuxCommand[] {
  return commands
    .filter((cmd) => stats[cmd].mistakes > 0)
    .sort((a, b) => {
      const scoreA = stats[a].mistakes * 3 - stats[a].uses;
      const scoreB = stats[b].mistakes * 3 - stats[b].uses;
      return scoreB - scoreA || stats[b].mistakes - stats[a].mistakes;
    })
    .slice(0, limit);
}

export function adaptationMessage(weakCommands: LinuxCommand[]): string | null {
  const main = weakCommands[0];
  if (!main) return null;
  const messages: Record<LinuxCommand, string> = {
    ls: "The shadows deepen... you must learn to reveal what hides nearby.",
    cd: "The corridors split... you must learn to traverse paths.",
    mkdir: "The stone softens... you must learn to carve new paths.",
    mv: "The relics stir... you must learn to carry what matters.",
    rm: "The dungeon clutters... you must learn what to remove.",
    find: "The maze widens... you must learn to track hidden names.",
    file: "The scrolls blur... you must learn what each relic truly is.",
    cat: "The runes whisper... you must learn to read what you find.",
    pwd: "The floor turns... you must learn where you stand.",
    clear: "The terminal fog thickens... clear the view when the path feels crowded.",
    echo: "The walls listen... echo words to learn how the shell speaks.",
    touch: "Blank scrolls await... touch creates a new empty file.",
    cp: "The relics reflect... copy what you need without moving it.",
    grep: "The ink sharpens... search within scrolls for the words that matter.",
    help: "The old manuals stir... ask for help when the command list fades.",
    hint: "The Dungeon Master leans closer... seek a hint when the trail grows cold.",
    man: "The manual stones awaken... read a command before casting it.",
  };
  return messages[main];
}
