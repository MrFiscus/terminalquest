import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DifficultySettings } from "@/components/DifficultySettings";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  CalendarDays,
  DoorOpen,
  Flame,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  PROFILE_COMMANDS,
  efficiencyInsight,
  formatDuration,
  masteryLabel,
  personalizedTips,
  readActiveRun,
  readPlayerName,
  readRuns,
  savePlayerName,
  summarizeProgress,
  weakSpotLines,
  type ProfileCommand,
} from "@/game/progressStats";
import { askProfileSummary } from "@/game/aiDungeonMasterService";
import { computeAchievementProgress } from "@/game/achievements";
import profileBg from "@/assets/profile-bg.png";

const C = {
  ink: "#3b1f0a",
  gold: "#c9a84c",
  goldDark: "#6a4818",
  goldBright: "#f0d68a",
  card: "rgba(255, 248, 220, 0.6)",
  sep: "rgba(139, 105, 20, 0.45)",
  dim: "rgba(59, 31, 10, 0.66)",
  dark: "rgba(20, 8, 4, 0.82)",
  chartInk: "#1f1308",
  chartInkDim: "rgba(31, 19, 8, 0.35)",
};

const PROFILE_AI_SUMMARY_KEY = "terminalquest_ai_profile_summary";

type ProfileTab = "account" | "stats" | "mastery" | "achievements" | "progress" | "difficulty";

interface ProfileModalProps {
  onClose: () => void;
}

interface SpellCardProps {
  index: number;
  title: string;
  children: React.ReactNode;
  locked?: boolean;
}

const TAB_LABELS: Record<ProfileTab, string> = {
  account: "Account",
  stats: "Stats",
  mastery: "Mastery",
  achievements: "Achievements",
  progress: "Progress",
  difficulty: "Difficulty",
};

const COMMAND_COPY: Record<ProfileCommand, { title: string; description: string; example: string; tip: string }> = {
  ls: {
    title: "The ls Spell",
    description: "Reveals files and doors in the current chamber.",
    example: "ls",
    tip: "Use it every time you enter a new room.",
  },
  cd: {
    title: "The cd Spell",
    description: "Carries you through doors and back through old passages.",
    example: "cd hallway",
    tip: "Use cd .. when you need to retreat one room.",
  },
  mv: {
    title: "The mv Spell",
    description: "Moves a file into your inventory to claim it.",
    example: "mv relic.txt ~/inventory",
    tip: "The relic only counts when moved into ~/inventory.",
  },
  cat: {
    title: "The cat Spell",
    description: "Reads scrolls, notes, and clues hidden in files.",
    example: "cat note.txt",
    tip: "Clues often reveal where keys or relics are hidden.",
  },
  find: {
    title: "The find Spell",
    description: "Searches across the dungeon for matching names.",
    example: "find relic",
    tip: "Use it when wandering starts costing too many commands.",
  },
  mkdir: {
    title: "The mkdir Spell",
    description: "Creates a new directory in the current room.",
    example: "mkdir stash",
    tip: "A creation spell for practicing filesystem structure.",
  },
  rm: {
    title: "The rm Spell",
    description: "Removes files from a room with care.",
    example: "rm dust",
    tip: "Check with ls before removing anything important.",
  },
  pwd: {
    title: "The pwd Spell",
    description: "Shows your current path through the dungeon.",
    example: "pwd",
    tip: "Use it when the maze starts folding in your head.",
  },
  file: {
    title: "The file Spell",
    description: "Identifies what kind of item a file is.",
    example: "file skeleton.key",
    tip: "Keys and scrolls often reveal their purpose here.",
  },
};

function splitInHalf<T>(items: T[]) {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)] as const;
}

function spellCardStyle(locked = false): React.CSSProperties {
  return {
    position: "relative",
    border: `1px solid ${locked ? "rgba(106,72,24,0.28)" : C.sep}`,
    background: locked ? "rgba(255, 248, 220, 0.28)" : C.card,
    padding: "18px 18px 16px",
    minHeight: 128,
    opacity: locked ? 0.52 : 1,
    color: C.ink,
    boxShadow: locked ? "none" : "inset 0 0 18px rgba(139,105,20,0.12)",
  };
}

function Badge({ index }: { index: number }) {
  return (
    <div style={{
      position: "absolute",
      top: -11,
      left: -10,
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: "rgba(20,8,4,0.92)",
      border: `1px solid ${C.gold}`,
      color: C.goldBright,
      display: "grid",
      placeItems: "center",
      fontFamily: "'Cinzel', Georgia, serif",
      fontSize: 12,
      fontWeight: 700,
    }}>
      {index}
    </div>
  );
}

function DecorativeTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      textAlign: "center",
      fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
      color: C.goldDark,
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: "0.04em",
      lineHeight: 1.1,
    }}>
      <span style={{ color: C.sep, fontSize: 11 }}>⊲⊲ </span>
      {children}
      <span style={{ color: C.sep, fontSize: 11 }}> ⊳⊳</span>
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      height: 1,
      margin: "12px 0",
      background: `linear-gradient(to right, transparent, ${C.sep} 20%, ${C.gold} 50%, ${C.sep} 80%, transparent)`,
    }} />
  );
}

function SpellCard({ index, title, children, locked }: SpellCardProps) {
  return (
    <article style={spellCardStyle(locked)}>
      <Badge index={index} />
      {locked && <Lock size={16} style={{ position: "absolute", top: 14, right: 14, color: C.goldDark }} />}
      <DecorativeTitle>{title}</DecorativeTitle>
      <Divider />
      {children}
    </article>
  );
}

function StatCard({ index, label, value }: { index: number; label: string; value: string | number }) {
  return (
    <SpellCard index={index} title={label}>
      <p style={{
        margin: 0,
        textAlign: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 26,
        fontWeight: 700,
        color: C.ink,
      }}>
        {value}
      </p>
    </SpellCard>
  );
}

/**
 * Richer stat tile used in the Stats tab. Shows an icon medallion next
 * to the label + value, with an optional small caption underneath. Reads
 * like a heraldic crest rather than a flat data row.
 */
function StatTile({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <article
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        border: `1px solid ${C.sep}`,
        background: "linear-gradient(180deg, rgba(255, 248, 220, 0.72), rgba(244, 228, 188, 0.62))",
        boxShadow: "inset 0 0 18px rgba(139,105,20,0.10), 0 1px 0 rgba(255,255,255,0.35)",
        borderRadius: 4,
      }}
    >
      <div
        aria-hidden
        style={{
          flex: "0 0 44px",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, hsl(228 14% 16%), hsl(228 14% 6%))",
          border: `1.5px solid ${C.gold}`,
          color: C.goldBright,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 0 10px rgba(200,145,58,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.goldDark,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
            fontSize: 26,
            fontWeight: 700,
            color: C.ink,
            lineHeight: 1.05,
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
        {caption && (
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 11,
              fontStyle: "italic",
              color: C.dim,
              marginTop: 4,
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </article>
  );
}

function PageColumn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: "1 0 0",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: "6px 12px",
    }}>
      {children}
    </div>
  );
}

function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: 0,
      background: "transparent",
      padding: 12,
      minHeight: 240,
    }}>
      <h3 style={{
        margin: "0 0 10px",
        color: C.chartInk,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Themed chart frame for the Progress tab. Wraps a recharts component
 * with a stone-tablet style, a Cinzel uppercase title, and an optional
 * italic subtitle. Renders an empty-state if `empty` is true (e.g. no
 * runs played yet) so the page never shows a blank chart with an axis
 * for nothing.
 */
function ChartFrame({
  title,
  subtitle,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        position: "relative",
        border: `1px solid ${C.sep}`,
        background: "linear-gradient(180deg, rgba(255, 248, 220, 0.72), rgba(244, 228, 188, 0.55))",
        padding: "14px 16px 12px",
        borderRadius: 4,
        boxShadow: "inset 0 0 22px rgba(139,105,20,0.10), 0 1px 0 rgba(255,255,255,0.35)",
        minHeight: 240,
      }}
    >
      <h3
        style={{
          margin: "0 0 2px",
          color: C.chartInk,
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          style={{
            margin: "0 0 10px",
            fontFamily: "Georgia, serif",
            fontSize: 11,
            fontStyle: "italic",
            color: C.dim,
          }}
        >
          {subtitle}
        </p>
      )}
      {empty ? (
        <div
          style={{
            height: 190,
            display: "grid",
            placeItems: "center",
            color: C.dim,
            fontFamily: "Georgia, serif",
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          {emptyText ?? "Complete a quest to fill this chart."}
        </div>
      ) : (
        children
      )}
    </article>
  );
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const [profileData, setProfileData] = useState(() => ({ runs: readRuns(), activeRun: readActiveRun() }));
  const { runs, activeRun } = profileData;
  const [name, setName] = useState(() => readPlayerName());
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const [user, setUser] = useState<User | null>(null);
  const [editingUsername, setEditingUsername] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  // The username is shown as a static heading by default. The pencil
  // toggle in the account view flips this to true to reveal the input
  // field — prevents accidental edits and gives the page a cleaner read.
  const [usernameEditMode, setUsernameEditMode] = useState(false);
  const [aiProfileSummary, setAiProfileSummary] = useState<string>("");

  const saveUsername = async () => {
    const trimmed = editingUsername.trim();
    if (!trimmed) return;
    setUsernameSaving(true);
    savePlayerName(trimmed);
    setName(trimmed);
    if (user) await supabase.auth.updateUser({ data: { username: trimmed } });
    setUsernameSaving(false);
    setUsernameSaved(true);
    setUsernameEditMode(false);
    setTimeout(() => setUsernameSaved(false), 2000);
  };
  const [revealed, setRevealed] = useState<Set<ProfileCommand>>(() => new Set());
  const summary = useMemo(() => summarizeProgress(runs, name, activeRun), [runs, name, activeRun]);
  const lastRun = runs.at(-1);
  const latestRunStats = activeRun ?? lastRun;
  const weakCommands = useMemo(() => {
    return PROFILE_COMMANDS
      .map((cmd) => ({
        cmd,
        uses: summary.commandTotals[cmd] ?? 0,
        mistakes: summary.commandMistakes[cmd] ?? 0,
      }))
      .sort((a, b) => (b.mistakes - a.mistakes) || (a.uses - b.uses))
      .slice(0, 3)
      .map((entry) => entry.cmd);
  }, [summary.commandMistakes, summary.commandTotals]);
  const profileSignature = useMemo(
    () => JSON.stringify({
      name,
      levels: summary.totalLevels,
      commands: summary.totalCommands,
      favorite: summary.favoriteCommand,
      weak: weakCommands,
      mistakes: Object.values(summary.commandMistakes).reduce((total, count) => total + count, 0),
    }),
    [name, summary.commandMistakes, summary.favoriteCommand, summary.totalCommands, summary.totalLevels, weakCommands],
  );

  const latestCommandData = PROFILE_COMMANDS.map((cmd) => ({
    command: cmd,
    count: latestRunStats?.commandCounts?.[cmd] ?? 0,
  }));
  const nonZeroCounts = latestCommandData.map((entry) => entry.count).filter((count) => count > 0);
  const leastNonZero = Math.min(...(nonZeroCounts.length ? nonZeroCounts : [0]));
  const mostUsed = Math.max(...latestCommandData.map((entry) => entry.count), 0);
  const runSeries = activeRun ? [...runs, activeRun] : runs;
  const efficiencyData = runSeries.map((run, index) => {
    const first = runSeries[0]?.totalCommands ?? run.totalCommands;
    const last = runSeries.at(-1)?.totalCommands ?? run.totalCommands;
    const trend = runSeries.length > 1 ? first + ((last - first) * index) / (runSeries.length - 1) : run.totalCommands;
    return {
      run: index === runs.length && activeRun ? "Now" : `Run ${index + 1}`,
      commands: run.totalCommands,
      trend: Math.round(trend * 10) / 10,
    };
  });
  const masteryData = PROFILE_COMMANDS.map((cmd) => ({
    command: cmd,
    mastery: Math.min(30, summary.commandTotals[cmd] ?? 0),
  }));
  const timeSeries = [
    ...runs.map((run, index) => ({ run: `Run ${index + 1}`, seconds: Math.round(run.durationMs / 1000), active: false })),
    ...(activeRun ? [{ run: "Now", seconds: Math.max(1, Math.round((Date.now() - activeRun.startedAt) / 1000)), active: true }] : []),
  ];
  const bestSeconds = timeSeries.filter((entry) => !entry.active).length
    ? Math.min(...timeSeries.filter((entry) => !entry.active).map((entry) => entry.seconds))
    : 0;
  const timeData = timeSeries.map((entry) => ({
    ...entry,
    best: !entry.active && entry.seconds === bestSeconds,
  }));

  const leftStats = [
    { label: "Total Levels", value: summary.totalLevels },
    { label: "Total Commands", value: summary.totalCommands },
    { label: "Keys Found", value: summary.totalKeysFound },
    { label: "Doors Unlocked", value: summary.totalLockedDoorsUnlocked },
  ];
  const rightStats = [
    { label: "Favorite Command", value: summary.favoriteCommand },
    { label: "Current Streak", value: summary.currentWinStreak },
    { label: "Best Streak", value: summary.bestWinStreak },
    { label: "Completed Today", value: summary.levelsToday },
  ];

  // Icon + caption metadata for the Stats tab tiles. Order mirrors
  // {leftStats, rightStats} so we can zip them together at render time.
  const statTilesLeft: Array<{ icon: LucideIcon; caption?: string }> = [
    { icon: Trophy,    caption: "Quests cleared all-time" },
    { icon: Terminal,  caption: "Across every run logged" },
    { icon: KeyRound,  caption: "Iron and bone — every kind" },
    { icon: DoorOpen,  caption: "Sealed thresholds breached" },
  ];
  const statTilesRight: Array<{ icon: LucideIcon; caption?: string }> = [
    { icon: Sparkles,     caption: "Most reached-for spell" },
    { icon: Flame,        caption: "Wins back to back" },
    { icon: Star,         caption: "Longest unbroken hunt" },
    { icon: CalendarCheck, caption: "Quests finished today" },
  ];
  // Shared catalog — same list used by the unlock toast so the two views
  // never drift.
  const achievementStats = computeAchievementProgress(summary).map(({ def, state }) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    reward: def.reward,
    icon: def.icon,
    rarity: def.rarity,
    detail: `${state.current}/${state.target}`,
    earned: state.unlocked,
  }));
  const [leftMastery, rightMastery] = splitInHalf(PROFILE_COMMANDS);
  const [leftAchievements, rightAchievements] = splitInHalf(achievementStats);

  const updateName = (value: string) => {
    setName(value);
    savePlayerName(value);
  };

  const toggleReveal = (cmd: ProfileCommand) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(cmd)) next.delete(cmd);
      else next.add(cmd);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      const meta = data.user?.user_metadata;
      setEditingUsername(meta?.username ?? meta?.full_name ?? meta?.name ?? readPlayerName());
    });
  }, []);

  useEffect(() => {
    const refresh = () => setProfileData({ runs: readRuns(), activeRun: readActiveRun() });
    refresh();
    const id = window.setInterval(refresh, 1000);
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const fallback =
      `Shell Archetype: ${summary.favoriteCommand === "find" ? "Careful Cartographer" : "Rising Operator"}. ` +
      `Practice ${weakCommands[0] ?? "find"} next to sharpen your route.`;
    setAiProfileSummary(fallback);
    try {
      const cache = localStorage.getItem(PROFILE_AI_SUMMARY_KEY);
      const parsed = cache ? JSON.parse(cache) as { signature?: string; text?: string } : null;
      if (parsed?.signature === profileSignature && parsed.text) {
        setAiProfileSummary(parsed.text);
        return;
      }
    } catch {
      // Ignore cache parse failures.
    }

    let cancelled = false;
    void askProfileSummary(
      "profile",
      {
        profileFacts: {
          playerName: name,
          totalLevels: summary.totalLevels,
          totalCommands: summary.totalCommands,
          favoriteCommand: summary.favoriteCommand,
          weakCommands,
          recentMistakes: Object.values(summary.commandMistakes).reduce((total, count) => total + count, 0),
        },
      },
      fallback,
    ).then((text) => {
      if (cancelled) return;
      setAiProfileSummary(text);
      try {
        localStorage.setItem(PROFILE_AI_SUMMARY_KEY, JSON.stringify({ signature: profileSignature, text }));
      } catch {
        // Local storage can be unavailable in private contexts.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [name, profileSignature, summary.commandMistakes, summary.favoriteCommand, summary.totalCommands, summary.totalLevels, weakCommands]);

  const renderMasteryCard = (cmd: ProfileCommand, index: number) => {
    const uses = summary.commandTotals[cmd] ?? 0;
    const level = masteryLabel(uses).toUpperCase();
    const revealedCmd = revealed.has(cmd);
    const copy = COMMAND_COPY[cmd];
    return (
      <SpellCard key={cmd} index={index} title={copy.title}>
        <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 12, lineHeight: 1.45 }}>{copy.description}</p>
        <Divider />
        <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, color: C.goldDark, textTransform: "uppercase" }}>Objectives</div>
        <code style={{ display: "block", marginTop: 6, fontSize: 11, color: C.ink }}>{copy.example}</code>
        <Divider />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, color: C.goldDark, textTransform: "uppercase" }}>Reward</span>
          <span style={{
            border: `1px solid ${C.goldDark}`,
            background: C.dark,
            color: C.goldBright,
            padding: "3px 8px",
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 9,
          }}>
            {level}
          </span>
        </div>
        <button
          type="button"
          onClick={() => toggleReveal(cmd)}
          style={{
            marginTop: 12,
            border: 0,
            background: "transparent",
            color: C.goldDark,
            cursor: "pointer",
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 10,
            textTransform: "uppercase",
          }}
        >
          {revealedCmd ? "Hide Details" : "Reveal More"}
        </button>
        {revealedCmd && (
          <p style={{ margin: "8px 0 0", fontFamily: "Georgia, serif", fontSize: 11, color: C.dim, lineHeight: 1.45 }}>
            Used {uses} times. {copy.tip}
          </p>
        )}
      </SpellCard>
    );
  };

  const renderTabContent = () => {
    if (activeTab === "account") {
      const displayName =
        (user?.user_metadata?.username as string | undefined) ??
        (user?.user_metadata?.full_name as string | undefined) ??
        (user?.user_metadata?.name as string | undefined) ??
        null;
      const email = user?.email ?? null;
      const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
      const provider = (user?.app_metadata?.provider as string | undefined) ?? "email";
      const createdAt = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : null;
      const initialsSource = (displayName || editingUsername || email || "").trim();
      const initials = initialsSource
        ? initialsSource
            .split(/[\s@._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join("") || initialsSource[0]?.toUpperCase()
        : "?";
      const headlineName = displayName || editingUsername || (email ? email.split("@")[0] : "Adventurer");

      const detailRow = (Icon: typeof Mail, label: string, value: string) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 4,
            border: `1px solid ${C.sep}`,
            background: "rgba(255, 248, 220, 0.45)",
          }}
        >
          <span
            style={{
              flex: "0 0 28px",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: C.dark,
              display: "grid",
              placeItems: "center",
              color: C.goldBright,
              boxShadow: `inset 0 0 6px rgba(0,0,0,0.6), 0 0 6px rgba(200,145,58,0.25)`,
            }}
          >
            <Icon size={14} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: C.goldDark,
                marginBottom: 2,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 13,
                color: C.ink,
                wordBreak: "break-word",
              }}
            >
              {value}
            </div>
          </div>
        </div>
      );

      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            padding: "8px 24px 18px",
          }}
        >
          {/* Hero header — avatar + name + email under it */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", maxWidth: 480 }}>
            {/* Avatar with double halo */}
            <div style={{ position: "relative" }}>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -10,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(240, 200, 100, 0.22) 0%, rgba(240, 200, 100, 0.08) 50%, transparent 75%)",
                  filter: "blur(2px)",
                }}
              />
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName ?? "avatar"}
                  referrerPolicy="no-referrer"
                  style={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: `2px solid ${C.gold}`,
                    objectFit: "cover",
                    boxShadow: `0 0 18px rgba(200,145,58,0.45), inset 0 0 0 2px rgba(0,0,0,0.4)`,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: `2px solid ${C.gold}`,
                    background: `radial-gradient(circle at 35% 30%, rgba(40,22,8,0.95), ${C.dark})`,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: 32,
                    fontWeight: 700,
                    color: C.goldBright,
                    letterSpacing: "0.04em",
                    boxShadow: `0 0 18px rgba(200,145,58,0.45), inset 0 0 12px rgba(0,0,0,0.6)`,
                  }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Name (display mode) OR input (edit mode) + edit toggle */}
            {!usernameEditMode ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
                    fontSize: 26,
                    color: C.ink,
                    letterSpacing: "0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {headlineName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUsername(headlineName);
                    setUsernameEditMode(true);
                  }}
                  aria-label="Edit username"
                  title="Edit username"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${C.goldDark}`,
                    background: C.dark,
                    color: C.goldBright,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: `0 0 8px rgba(200,145,58,0.18)`,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 12px rgba(200,145,58,0.5)`;
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 8px rgba(200,145,58,0.18)`;
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                  }}
                >
                  <Pencil size={12} />
                </button>
                {usernameSaved && (
                  <span style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, color: C.goldDark, letterSpacing: "0.12em" }}>
                    Saved ✓
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  aria-label="Username"
                  autoFocus
                  value={editingUsername}
                  onChange={(e) => { setEditingUsername(e.target.value); setUsernameSaved(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveUsername();
                    if (e.key === "Escape") setUsernameEditMode(false);
                  }}
                  placeholder="Enter username"
                  style={{
                    border: 0,
                    borderBottom: `2px solid ${C.goldDark}`,
                    background: "rgba(255, 248, 220, 0.6)",
                    outline: "none",
                    textAlign: "center",
                    fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
                    fontSize: 22,
                    color: C.ink,
                    width: 220,
                    padding: "2px 8px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setUsernameEditMode(false)}
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "5px 10px",
                    border: `1px solid ${C.sep}`,
                    background: "transparent",
                    color: C.dim,
                    cursor: "pointer",
                    borderRadius: 3,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveUsername}
                  disabled={usernameSaving || !editingUsername.trim()}
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "5px 12px",
                    border: `1px solid ${C.goldDark}`,
                    background: C.dark,
                    color: C.goldBright,
                    cursor: usernameSaving ? "wait" : "pointer",
                    borderRadius: 3,
                    boxShadow: `0 0 6px rgba(200,145,58,0.25)`,
                    opacity: !editingUsername.trim() ? 0.5 : 1,
                  }}
                >
                  {usernameSaving ? "..." : "Save"}
                </button>
              </div>
            )}

            {/* Email subtitle directly under name */}
            {email && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: C.dim,
                  letterSpacing: "0.04em",
                }}
              >
                {email}
              </span>
            )}
          </div>

          {/* AI summary card (if available) */}
          {aiProfileSummary && (
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                border: `1px solid ${C.sep}`,
                background: C.card,
                padding: "12px 18px",
                borderRadius: 4,
                boxShadow: `inset 0 0 18px rgba(139,105,20,0.08)`,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  left: 16,
                  background: "rgb(247, 234, 199)",
                  padding: "0 8px",
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: C.goldDark,
                  textTransform: "uppercase",
                }}
              >
                Loremaster's Notes
              </span>
              <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 13, color: C.ink, lineHeight: 1.5, textAlign: "center" }}>
                {aiProfileSummary}
              </p>
            </div>
          )}

          {/* Detail badges grid */}
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
            }}
          >
            {email && detailRow(Mail, "Email", email)}
            {provider && detailRow(ShieldCheck, "Signed in via", provider === "google" ? "Google" : "Email & Password")}
            {createdAt && detailRow(CalendarDays, "Member since", createdAt)}
          </div>

          {/* Sign out — themed with danger affordance */}
          {user && (
            <button
              type="button"
              onClick={async () => { await supabase.auth.signOut(); onClose(); }}
              style={{
                marginTop: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "8px 22px",
                border: `1px solid hsl(0 60% 35% / 0.6)`,
                background: "linear-gradient(180deg, hsl(0 30% 12%), hsl(0 30% 8%))",
                color: "hsl(20 75% 75%)",
                cursor: "pointer",
                borderRadius: 4,
                boxShadow: "inset 0 0 14px hsl(0 0% 0% / 0.5), 0 0 8px hsl(0 70% 40% / 0.25)",
                transition: "box-shadow 0.2s ease, color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "inset 0 0 14px hsl(0 0% 0% / 0.5), 0 0 14px hsl(0 80% 50% / 0.5)";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(20 90% 85%)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "inset 0 0 14px hsl(0 0% 0% / 0.5), 0 0 8px hsl(0 70% 40% / 0.25)";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(20 75% 75%)";
              }}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          )}

          {!user && (
            <p style={{ fontFamily: "Georgia, serif", fontSize: 13, color: C.dim, textAlign: "center" }}>
              Not signed in. Your progress is saved locally only.
            </p>
          )}
        </div>
      );
    }

    if (activeTab === "stats") {
      return (
        <>
          <PageColumn>
            {leftStats.map((stat, i) => (
              <StatTile
                key={stat.label}
                icon={statTilesLeft[i].icon}
                label={stat.label}
                value={stat.value}
                caption={statTilesLeft[i].caption}
              />
            ))}
          </PageColumn>
          <PageColumn>
            {rightStats.map((stat, i) => (
              <StatTile
                key={stat.label}
                icon={statTilesRight[i].icon}
                label={stat.label}
                value={stat.value}
                caption={statTilesRight[i].caption}
              />
            ))}
          </PageColumn>
        </>
      );
    }

    if (activeTab === "mastery") {
      return (
        <>
          <PageColumn>{leftMastery.map((cmd, index) => renderMasteryCard(cmd, index + 1))}</PageColumn>
          <PageColumn>{rightMastery.map((cmd, index) => renderMasteryCard(cmd, index + leftMastery.length + 1))}</PageColumn>
        </>
      );
    }

    if (activeTab === "achievements") {
      const renderAchievement = (achievement: typeof achievementStats[number], index: number) => (
        <SpellCard key={achievement.id} index={index} title={`${achievement.icon} ${achievement.name}`} locked={!achievement.earned}>
          <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.45 }}>
            {achievement.description}
          </p>
          <Divider />
          <p style={{ margin: 0, fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {achievement.rarity} · {achievement.earned ? "Earned" : `Progress ${achievement.detail}`}
          </p>
          {achievement.earned && (
            <p style={{ margin: "6px 0 0", fontFamily: "Georgia, serif", fontSize: 12, fontStyle: "italic", color: C.goldDark }}>
              "{achievement.reward}"
            </p>
          )}
        </SpellCard>
      );
      return (
        <>
          <PageColumn>{leftAchievements.map((achievement, index) => renderAchievement(achievement, index + 1))}</PageColumn>
          <PageColumn>{rightAchievements.map((achievement, index) => renderAchievement(achievement, index + leftAchievements.length + 1))}</PageColumn>
        </>
      );
    }

    if (activeTab === "difficulty") {
      return (
        <PageColumn>
          <div style={{ width: "100%", maxWidth: 500, margin: "0 auto" }}>
            <DifficultySettings />
          </div>
        </PageColumn>
      );
    }

    // Empty-state detection — every chart needs at least one run/command
    // to be meaningful. We compute these once so each ChartFrame can
    // render a nice italic "complete a quest…" line instead of an
    // axis-only blank rectangle.
    const noLatestCommands = !latestCommandData.some((d) => d.count > 0);
    const noTimeData = timeData.length === 0;
    const noEfficiencyData = efficiencyData.length === 0;
    const noMasteryData = !masteryData.some((d) => d.mastery > 0);

    // Top-of-page insight banner — short adaptive line summarizing trend.
    const insightLine = (() => {
      if (summary.totalLevels === 0) {
        return "Run your first quest to start charting your trajectory.";
      }
      if (summary.totalLevels === 1) {
        return "One quest under your belt — the dungeon is taking notes.";
      }
      const last = runs.at(-1);
      const prev = runs.at(-2);
      if (last && prev) {
        if (last.totalCommands < prev.totalCommands) {
          return `Sharper than last time — ${prev.totalCommands - last.totalCommands} fewer keystrokes used.`;
        }
        if (last.durationMs < prev.durationMs) {
          return `Faster than your previous quest by ${Math.round((prev.durationMs - last.durationMs) / 1000)}s.`;
        }
      }
      return "Steady progress. Keep mixing new commands into your runs.";
    })();

    return (
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Insight banner spanning the full progress page */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            margin: "0 12px",
            border: `1px solid ${C.sep}`,
            background: "linear-gradient(180deg, rgba(255,248,220,0.6), rgba(244,228,188,0.45))",
            boxShadow: "inset 0 0 18px rgba(139,105,20,0.08)",
            borderRadius: 4,
          }}
        >
          <Sparkles size={16} style={{ color: C.gold, flex: "0 0 16px" }} aria-hidden />
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 13,
              fontStyle: "italic",
              color: C.ink,
              lineHeight: 1.4,
            }}
          >
            {insightLine}
          </span>
        </div>

        <div style={{ display: "flex", gap: 42, alignItems: "flex-start", minWidth: 0 }}>
        <PageColumn>
          <ChartFrame
            title="Commands Used This Run"
            subtitle="How your latest dungeon was solved, command by command."
            empty={noLatestCommands}
            emptyText="No commands logged yet. Type a few and reopen this page."
          >
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={latestCommandData}>
                <CartesianGrid stroke={C.chartInkDim} strokeDasharray="3 3" />
                <XAxis dataKey="command" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: "rgba(139,105,20,0.10)" }}
                  contentStyle={{ background: "rgba(255,248,220,0.96)", border: `1px solid ${C.goldDark}`, color: C.ink, borderRadius: 3 }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {latestCommandData.map((entry) => (
                    <Cell
                      key={entry.command}
                      fill={
                        entry.count === mostUsed && entry.count > 0
                          ? C.gold
                          : entry.count === leastNonZero
                          ? "#7d5a30"
                          : "#a07b3e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            title="Efficiency Over Time"
            subtitle="Commands per quest — lower is sharper."
            empty={noEfficiencyData}
            emptyText="At least one completed quest is needed to chart efficiency."
          >
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={efficiencyData}>
                <CartesianGrid stroke={C.chartInkDim} strokeDasharray="3 3" />
                <XAxis dataKey="run" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "rgba(255,248,220,0.96)", border: `1px solid ${C.goldDark}`, color: C.ink, borderRadius: 3 }}
                />
                <Line type="monotone" dataKey="commands" stroke={C.chartInk} strokeWidth={2} dot={{ r: 3, fill: C.gold }} />
                <Line type="monotone" dataKey="trend" stroke={C.goldDark} strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </PageColumn>

        <PageColumn>
          <ChartFrame
            title="Time Per Run"
            subtitle="Seconds to victory. Gold marks your fastest finish."
            empty={noTimeData}
            emptyText="Finish a quest to record your first time."
          >
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={timeData}>
                <CartesianGrid stroke={C.chartInkDim} strokeDasharray="3 3" />
                <XAxis dataKey="run" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: "rgba(139,105,20,0.10)" }}
                  contentStyle={{ background: "rgba(255,248,220,0.96)", border: `1px solid ${C.goldDark}`, color: C.ink, borderRadius: 3 }}
                />
                <Bar dataKey="seconds" radius={[3, 3, 0, 0]}>
                  {timeData.map((entry) => (
                    <Cell key={entry.run} fill={entry.best ? C.gold : "#a07b3e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            title="Command Mastery Shape"
            subtitle="Coverage across your toolkit — round means well-balanced."
            empty={noMasteryData}
            emptyText="Use any command to start sketching this shape."
          >
            <ResponsiveContainer width="100%" height={190}>
              <RadarChart data={masteryData}>
                <PolarGrid stroke={C.chartInkDim} />
                <PolarAngleAxis dataKey="command" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Radar dataKey="mastery" stroke={C.gold} strokeWidth={2} fill={C.gold} fillOpacity={0.32} />
                <Tooltip
                  contentStyle={{ background: "rgba(255,248,220,0.96)", border: `1px solid ${C.goldDark}`, color: C.ink, borderRadius: 3 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </PageColumn>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        color: C.ink,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1240px, 98vw)",
          maxHeight: "98vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 40,
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "4px 12px",
            borderRadius: 3,
            cursor: "pointer",
            border: `1px solid ${C.goldDark}`,
            background: C.dark,
            color: C.goldBright,
          }}
        >
          <X size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "-2px" }} />
          Close
        </button>

        <div
          id="profile-modal-title"
          style={{
            textAlign: "center",
            fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
            fontSize: 36,
            color: C.goldBright,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 30px rgba(200,145,58,0.5)",
            lineHeight: 1,
          }}
        >
          Adventurer Profile
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          {(Object.keys(TAB_LABELS) as ProfileTab[]).map((tab) => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "4px 14px",
                  borderRadius: 3,
                  cursor: "pointer",
                  border: `1px solid ${C.goldDark}`,
                  background: active ? C.gold : C.dark,
                  color: active ? "#f0e0b0" : C.gold,
                  transition: "all 0.15s",
                }}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        <div
          style={{
            width: "100%",
            aspectRatio: "1920 / 1080",
            maxHeight: "calc(98vh - 150px)",
            position: "relative",
            backgroundImage: `url(${profileBg})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.85))",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "17%",
              left: "16%",
              right: "16%",
              textAlign: "center",
              zIndex: 2,
            }}
          >
            <input
              aria-label="Player name"
              value={name}
              onChange={(event) => updateName(event.target.value)}
              style={{
                width: "min(420px, 80%)",
                border: 0,
                borderBottom: `2px solid ${C.goldDark}`,
                background: "transparent",
                outline: "none",
                textAlign: "center",
                fontFamily: "'Pirata One', 'Cinzel', Georgia, serif",
                fontSize: 24,
                color: C.ink,
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              top: "25%",
              bottom: "15%",
              left: "14%",
              right: "14%",
              zIndex: 3,
              display: "flex",
              alignItems: "flex-start",
              gap: 42,
              minHeight: 0,
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
