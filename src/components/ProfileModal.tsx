import { useEffect, useMemo, useState } from "react";
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
import { Lock, X } from "lucide-react";
import {
  PROFILE_COMMANDS,
  efficiencyInsight,
  formatDuration,
  masteryLabel,
  personalizedTips,
  readPlayerName,
  readRuns,
  savePlayerName,
  summarizeProgress,
  weakSpotLines,
  type ProfileCommand,
} from "@/game/progressStats";
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

type ProfileTab = "stats" | "mastery" | "achievements" | "progress";

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
  stats: "Stats",
  mastery: "Mastery",
  achievements: "Achievements",
  progress: "Progress",
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

export function ProfileModal({ onClose }: ProfileModalProps) {
  const runs = useMemo(() => readRuns(), []);
  const [name, setName] = useState(() => readPlayerName());
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [revealed, setRevealed] = useState<Set<ProfileCommand>>(() => new Set());
  const summary = useMemo(() => summarizeProgress(runs, name), [runs, name]);
  const lastRun = runs.at(-1);

  const latestCommandData = PROFILE_COMMANDS.map((cmd) => ({
    command: cmd,
    count: lastRun?.commandCounts?.[cmd] ?? 0,
  }));
  const nonZeroCounts = latestCommandData.map((entry) => entry.count).filter((count) => count > 0);
  const leastNonZero = Math.min(...(nonZeroCounts.length ? nonZeroCounts : [0]));
  const mostUsed = Math.max(...latestCommandData.map((entry) => entry.count), 0);
  const efficiencyData = runs.map((run, index) => {
    const first = runs[0]?.totalCommands ?? run.totalCommands;
    const last = runs.at(-1)?.totalCommands ?? run.totalCommands;
    const trend = runs.length > 1 ? first + ((last - first) * index) / (runs.length - 1) : run.totalCommands;
    return {
      run: `Run ${index + 1}`,
      commands: run.totalCommands,
      trend: Math.round(trend * 10) / 10,
    };
  });
  const masteryData = PROFILE_COMMANDS.map((cmd) => ({
    command: cmd,
    mastery: Math.min(30, summary.commandTotals[cmd] ?? 0),
  }));
  const bestMs = runs.length ? Math.min(...runs.map((run) => run.durationMs)) : 0;
  const timeData = runs.map((run, index) => ({
    run: `Run ${index + 1}`,
    seconds: Math.round(run.durationMs / 1000),
    best: run.durationMs === bestMs,
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
  const achievementStats = [
    { name: "First Blood", detail: `${Math.min(summary.totalLevels, 1)}/1 completed`, earned: summary.totalLevels >= 1 },
    { name: "Speed Runner", detail: `${runs.some((run) => run.durationMs < 120000) ? 1 : 0}/1 under 2m`, earned: runs.some((run) => run.durationMs < 120000) },
    { name: "Explorer", detail: `${Math.min(summary.commandTotals.find ?? 0, 5)}/5 find uses`, earned: (summary.commandTotals.find ?? 0) >= 5 },
    { name: "Lockpicker", detail: `${Math.min(summary.totalLockedDoorsUnlocked, 3)}/3 locks`, earned: summary.totalLockedDoorsUnlocked >= 3 },
    { name: "Linux Wizard", detail: `${PROFILE_COMMANDS.filter((cmd) => (summary.commandTotals[cmd] ?? 0) > 0).length}/${PROFILE_COMMANDS.length} commands`, earned: PROFILE_COMMANDS.every((cmd) => (summary.commandTotals[cmd] ?? 0) > 0) },
  ];
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
    if (activeTab === "stats") {
      return (
        <>
          <PageColumn>
            {leftStats.map((stat, index) => <StatCard key={stat.label} index={index + 1} label={stat.label} value={stat.value} />)}
          </PageColumn>
          <PageColumn>
            {rightStats.map((stat, index) => <StatCard key={stat.label} index={index + 5} label={stat.label} value={stat.value} />)}
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
        <SpellCard key={achievement.name} index={index} title={achievement.name} locked={!achievement.earned}>
          <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.45 }}>
            {achievement.earned ? "Inscribed in gold." : "Still hidden beneath wax and dust."}
          </p>
          <Divider />
          <p style={{ margin: 0, fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, color: C.goldDark, textTransform: "uppercase" }}>
            Progress
          </p>
          <p style={{ margin: "6px 0 0", fontFamily: "Georgia, serif", fontSize: 12 }}>{achievement.detail}</p>
        </SpellCard>
      );
      return (
        <>
          <PageColumn>{leftAchievements.map((achievement, index) => renderAchievement(achievement, index + 1))}</PageColumn>
          <PageColumn>{rightAchievements.map((achievement, index) => renderAchievement(achievement, index + leftAchievements.length + 1))}</PageColumn>
        </>
      );
    }

    return (
      <>
        <PageColumn>
          <ChartShell title="Commands Used This Run">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={latestCommandData}>
                <CartesianGrid stroke={C.chartInkDim} />
                <XAxis dataKey="command" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "rgba(255,248,220,0.92)", border: `1px solid ${C.dark}`, color: C.ink }} />
                <Bar dataKey="count">
                  {latestCommandData.map((entry) => (
                    <Cell key={entry.command} fill={entry.count === mostUsed && entry.count > 0 ? C.chartInk : entry.count === leastNonZero ? "#4b3520" : "#6f5432"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
          <ChartShell title="Efficiency Over Time">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={efficiencyData}>
                <CartesianGrid stroke={C.chartInkDim} />
                <XAxis dataKey="run" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "rgba(255,248,220,0.92)", border: `1px solid ${C.dark}`, color: C.ink }} />
                <Line type="monotone" dataKey="commands" stroke={C.chartInk} strokeWidth={2} />
                <Line type="monotone" dataKey="trend" stroke="#4b3520" strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartShell>
        </PageColumn>
        <PageColumn>
          <ChartShell title="Time Per Run">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={timeData}>
                <CartesianGrid stroke={C.chartInkDim} />
                <XAxis dataKey="run" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <YAxis allowDecimals={false} stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "rgba(255,248,220,0.92)", border: `1px solid ${C.dark}`, color: C.ink }} />
                <Bar dataKey="seconds">
                  {timeData.map((entry) => <Cell key={entry.run} fill={entry.best ? C.chartInk : "#6f5432"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
          <ChartShell title="Command Mastery Shape">
            <ResponsiveContainer width="100%" height={190}>
              <RadarChart data={masteryData}>
                <PolarGrid stroke={C.chartInkDim} />
                <PolarAngleAxis dataKey="command" stroke={C.chartInk} tick={{ fill: C.chartInk, fontSize: 10 }} />
                <Radar dataKey="mastery" stroke={C.chartInk} fill={C.chartInk} fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: "rgba(255,248,220,0.92)", border: `1px solid ${C.dark}`, color: C.ink }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartShell>
        </PageColumn>
      </>
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
