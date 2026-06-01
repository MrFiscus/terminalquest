import { GameWorld } from "@/components/GameWorld";
import { HudTabs } from "@/components/HudTabs";
import { Terminal } from "@/components/Terminal";
import { StatusBars } from "@/components/StatusBars";
import { BookOfSecrets } from "@/components/BookOfSecrets";
import { ProfileModal } from "@/components/ProfileModal";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { DifficultyMenu } from "@/components/DifficultyMenu";
import { MauQuizOverlay } from "@/components/MauQuizOverlay";
import { ScrollModal } from "@/components/ScrollModal";
import { WizardDialog } from "@/components/WizardDialog";
import { AchievementToastQueue } from "@/components/AchievementToast";
import { DEMO_CONTEXT, useGameState } from "@/hooks/useGameState";
import { getRoom } from "@/game/dungeon";
import { generateLevel, type Difficulty } from "@/game/aiLevelService";
import { generateDifficultyMechanicLevel } from "@/game/difficultyMechanics";
import { adaptationMessage, getWeakCommands, type CommandStats } from "@/game/adaptiveDungeon";
import { startGameAmbience, stopGameAmbience } from "@/game/audio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearLevelSession,
  isTutorialCompleted,
  readFamiliarity,
  readLevelSession,
  readOnboarded,
  saveFamiliarity,
  setOnboarded,
  type LevelSessionSnapshot,
} from "@/game/progressStats";
import { ResumeDialog } from "@/components/ResumeDialog";
import { AnimatePresence } from "framer-motion";
import type { LinuxCommand, VictoryReport } from "@/game/types";
import type { GeneratedLevel } from "@/game/aiLevelService";
import { createLanternCatacombsLevel, LANTERN_CATACOMBS_ID } from "@/game/tutorialLevels";

interface ReplayLoadPayload {
  level: GeneratedLevel;
  label: string;
  adaptation?: string | null;
  playMode: "guided" | "real";
  options?: {
    showcaseMode?: boolean;
    weakCommands?: string[];
  };
}

const progressionCommands: LinuxCommand[] = [
  "pwd",
  "cat",
  "file",
  "find",
  "grep",
  "touch",
  "cp",
  "mkdir",
  "chmod",
  "rm",
  "man",
];

const isLinuxCommand = (value: string): value is LinuxCommand =>
  progressionCommands.includes(value as LinuxCommand) ||
  ["ls", "cd", "mv", "help", "hint", "whoami", "echo", "clear"].includes(value);

function teachingCommandCount(report?: VictoryReport | null) {
  const mistakes = report?.mistakesMade ?? 0;
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

const nextTeachingCommands = (stats: CommandStats, count: number) => {
  const unused = progressionCommands.filter((command) => (stats[command]?.uses ?? 0) === 0);
  const leastUsed = progressionCommands
    .filter((command) => !unused.includes(command))
    .slice()
    .sort((a, b) =>
      (stats[a]?.uses ?? 0) - (stats[b]?.uses ?? 0) ||
      progressionCommands.indexOf(a) - progressionCommands.indexOf(b),
    );
  return [...unused, ...leastUsed].slice(0, count);
};

function nextLevelWeakCommands(stats: CommandStats, report?: VictoryReport | null) {
  const reportWeakness = report?.weakestCommand && isLinuxCommand(report.weakestCommand)
    ? [report.weakestCommand]
    : [];
  const newLessons = nextTeachingCommands(stats, teachingCommandCount(report));
  return Array.from(new Set([
    ...reportWeakness,
    ...getWeakCommands(stats, 4),
    ...newLessons,
  ].filter(Boolean))).slice(0, 8) as LinuxCommand[];
}

const Index = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const openProfile = useCallback(() => {
    setProfileOpen(true);
    setBookOpen(false);
  }, []);
  const {
    state, wizardMessage, submit, dismissPopup, loadLevel, roomSubtitle,
    submitMauQuiz,
    closeMauQuiz, openScroll, closeScroll,
    achievementQueue, dismissAchievement,
    dismissVictory,
    resumeSession,
    dismissErrorPopup,
    chronicleLog,
  } = useGameState({
    onOpenProfile: openProfile,
  });
  const [generating, setGenerating] = useState<Difficulty | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  // Initialize the familiarity state from localStorage synchronously on
  // first render so we don't flash the slider for returning users.
  const [linuxFamiliarity, setLinuxFamiliarity] = useState<number | undefined>(() => {
    const stored = readFamiliarity();
    return stored == null ? undefined : stored;
  });
  // Resume-prompt state — computed synchronously on first render so the
  // dialog appears immediately on refresh, before any slider / auto-enter
  // flow has a chance to flash. `resumeDecision` tracks what the player
  // chose so we only show the prompt once per mount.
  const [pendingSession, setPendingSession] = useState<LevelSessionSnapshot | null>(() => readLevelSession());
  const [resumeDecision, setResumeDecision] = useState<"pending" | "continue" | "new" | "none">(
    () => (readLevelSession() ? "pending" : "none"),
  );
  // When true, the user has onboarded before and has a saved familiarity —
  // skip the slider and jump straight into an adaptive level on mount.
  // Only activates AFTER the resume dialog is resolved (or skipped).
  const [autoEntering, setAutoEntering] = useState(() => {
    const hasSession = !!readLevelSession();
    if (hasSession) return false; // wait for resume dialog
    return readOnboarded() && readFamiliarity() != null;
  });
  const [bookOpen, setBookOpen] = useState(false);
  const [advancingLevel, setAdvancingLevel] = useState(false);

  const replayPayloadRef = useRef<ReplayLoadPayload | null>(null);

  useEffect(() => {
    if (!hasEntered) return;
    startGameAmbience();
    return () => stopGameAmbience();
  }, [hasEntered]);

  const loadAIDungeon = async (difficulty: Difficulty, familiarity = linuxFamiliarity) => {
    if (generating || state.animating) return false;
    setGenerating(difficulty);
    try {
      const shouldLoadTutorial =
        (familiarity ?? 0) <= 33 &&
        !isTutorialCompleted(LANTERN_CATACOMBS_ID);
      const showcaseMode = familiarity === 0 && !shouldLoadTutorial;
      const weakCommands = showcaseMode
        ? ["mkdir", "cd", "ls", "mv"]
        : getWeakCommands(state.commandStats, 4);
      const playMode = shouldLoadTutorial || showcaseMode
        ? "guided"
        : (familiarity ?? 0) >= 67 ? "real" : "guided";
      const generationSeed = [
        difficulty,
        familiarity ?? "unknown",
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 10),
        state.commandHistory.length,
      ].join("-");
      const level = shouldLoadTutorial
        ? createLanternCatacombsLevel(familiarity ?? 20)
        : showcaseMode
        ? generateDifficultyMechanicLevel(difficulty, familiarity, weakCommands)
        : await generateLevel({
            difficulty,
            familiarity,
            weakCommands,
            recentMistakes: state.recentMistakes,
            generationSeed,
          });
      const label = shouldLoadTutorial
        ? `${difficulty} Lantern Catacombs (${level.rooms.length} rooms)`
        : `${difficulty} (${level.rooms.length} rooms)`;
      const adaptation = shouldLoadTutorial
        ? "The Lantern Catacombs awaken. Read what is near, and let each command teach the next."
        : showcaseMode
        ? "The dungeon whispers: type ls to survey your surroundings."
        : playMode === "guided" ? adaptationMessage(weakCommands) : null;
      replayPayloadRef.current = {
        level,
        label,
        adaptation,
        playMode,
        options: { showcaseMode, weakCommands },
      };
      loadLevel(
        level,
        label,
        adaptation,
        playMode,
        { showcaseMode, weakCommands },
      );
      setActiveDifficulty(difficulty);
      return true;
    } finally {
      setGenerating(null);
    }
  };

  const loadNextAdaptiveDungeon = async () => {
    if (advancingLevel || generating || state.animating) return;
    setAdvancingLevel(true);
    try {
      const difficulty = activeDifficulty ?? (
        (linuxFamiliarity ?? 50) < 34 ? "easy" : (linuxFamiliarity ?? 50) < 67 ? "medium" : "hard"
      );
      const weakCommands = nextLevelWeakCommands(state.commandStats, state.completionReport);
      const teachingCommands = nextTeachingCommands(
        state.commandStats,
        teachingCommandCount(state.completionReport),
      );
      const generationSeed = [
        "progression",
        difficulty,
        linuxFamiliarity ?? "unknown",
        state.completionReport?.weakestCommand ?? "unknown",
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 10),
      ].join("-");
      const level = await generateLevel({
        difficulty,
        familiarity: linuxFamiliarity,
        weakCommands,
        recentMistakes: [
          ...state.recentMistakes,
          state.completionReport?.nextLesson ?? "",
        ].filter(Boolean).slice(0, 5),
        generationSeed,
      });
      const focus = weakCommands[0];
      const adaptation =
        `Next dungeon tuned for ${focus}, with ${teachingCommands.length} new ${teachingCommands.length === 1 ? "lesson" : "lessons"} woven in: ${teachingCommands.join(", ")}.`;
      const label = `${difficulty} (${level.rooms.length} rooms)`;
      replayPayloadRef.current = {
        level,
        label,
        adaptation,
        playMode: "guided",
        options: { showcaseMode: false, weakCommands },
      };
      loadLevel(level, label, adaptation, "guided", {
        showcaseMode: false,
        weakCommands,
      });
      setActiveDifficulty(difficulty);
      setHasEntered(true);
    } finally {
      setAdvancingLevel(false);
    }
  };

  // Returning-user auto-enter: if the player already confirmed the slider
  // in a previous session, skip the slider and jump into an adaptive level
  // using their saved familiarity. Demo (familiarity=0) is preserved — it
  // routes through the same loadAIDungeon call which picks the demo path
  // based on familiarity === 0.
  useEffect(() => {
    if (!autoEntering || hasEntered) return;
    const familiarity = readFamiliarity();
    if (familiarity == null) {
      setAutoEntering(false);
      return;
    }
    const difficulty: Difficulty =
      familiarity < 34 ? "easy" : familiarity < 67 ? "medium" : "hard";
    setLinuxFamiliarity(familiarity);
    (async () => {
      try {
        const loaded = await loadAIDungeon(difficulty, familiarity);
        if (loaded) setHasEntered(true);
      } catch {
        // Fall back to showing the slider if generation fails.
      } finally {
        setAutoEntering(false);
      }
    })();
    // loadAIDungeon is stable per render; triggering only when the gate
    // flips is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEntering]);

  // ── Resume-or-new prompt ──────────────────────────────────────────────
  // Takes priority over auto-enter and the slider. Once the player picks,
  // we flip resumeDecision and the rest of the gating logic below runs
  // as before.
  const handleContinueSession = () => {
    if (!pendingSession) return;
    // Restore the GameState + runTracker from storage. Also restore the
    // in-memory familiarity / difficulty so adaptive next-level logic
    // still has the right context.
    resumeSession(pendingSession);
    if (pendingSession.linuxFamiliarity != null) {
      setLinuxFamiliarity(pendingSession.linuxFamiliarity);
    }
    if (pendingSession.activeDifficulty) {
      setActiveDifficulty(pendingSession.activeDifficulty as Difficulty);
    }
    setPendingSession(null);
    setResumeDecision("continue");
    setHasEntered(true);
  };
  const handleStartNewWorld = () => {
    // Throw away the saved snapshot so next auto-save writes a fresh one.
    clearLevelSession();
    setPendingSession(null);
    setResumeDecision("new");
    // Re-arm auto-enter for onboarded users; first-timers fall through to
    // the slider like normal.
    setAutoEntering(readOnboarded() && readFamiliarity() != null);
  };

  const handleCloseVictoryOverlay = () => {
    dismissVictory();
  };

  const handleCloseResumeToLanding = () => {
    window.location.assign("/");
  };

  const handleReplayCurrentLevel = () => {
    const payload = replayPayloadRef.current;
    if (!payload) return;
    loadLevel(payload.level, payload.label, payload.adaptation, payload.playMode, payload.options);
    setHasEntered(true);
  };

  if (!hasEntered) {
    if (resumeDecision === "pending" && pendingSession) {
      return (
        <ResumeDialog
          session={pendingSession}
          onContinue={handleContinueSession}
          onNew={handleStartNewWorld}
          onClose={handleCloseResumeToLanding}
        />
      );
    }
    if (autoEntering) {
      // Brief loader while the adaptive level is being generated for a
      // returning player. Kept intentionally minimal so it doesn't fight
      // with the DifficultyMenu styling when we do fall back to it.
      return (
        <div
          className="fixed inset-0 flex items-center justify-center bg-background"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
        >
          <div className="flex flex-col items-center gap-3 text-parchment">
            <span className="text-sm tracking-[0.25em] uppercase opacity-75">
              Preparing your next dungeon
            </span>
            <span className="text-xs opacity-60">…drawing the map</span>
          </div>
        </div>
      );
    }
    return (
      <DifficultyMenu
        busy={Boolean(generating)}
        onConfirm={async (difficulty, familiarity, precise) => {
          setLinuxFamiliarity(familiarity);
          const loaded = await loadAIDungeon(difficulty, familiarity);
          if (loaded) {
            // Persist the slider value + mark the user onboarded so future
            // visits skip the slider and continue the adaptive loop.
            saveFamiliarity(familiarity);
            setOnboarded(true);
            setHasEntered(true);
          }
        }}
      />
    );
  }

  const currentRoom = getRoom(state.rooms, state.cwd);
  const isDemoMode = Boolean(!state.tutorialId && (state.showcaseMode || state.difficultyValue === 0));
  const brokenDoor = currentRoom?.doors.find((door) => door.broken);
  const repairCommand = brokenDoor
    ? state.showcaseMode
      ? "mkdir door"
      : `mkdir ${brokenDoor.target}`
    : undefined;
  const roomHintFiles =
    brokenDoor && currentRoom
      ? currentRoom.files
          .filter((file) => file.contents && (file.name.endsWith(".txt") || file.name === "scroll"))
          .map((file) => file.name)
      : undefined;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">Terminal Quest - Linux Dungeon RPG</h1>

      {/* Main Content Area */}
      <div className="absolute inset-0 min-h-0">
        {/* Left-side HUD: StatusBars + Tabs + Terminal */}
        {!profileOpen && !bookOpen && (
          <section
            aria-label="Player Status & Terminal"
            className="absolute left-0 top-0 bottom-0 z-[140] w-[300px] pl-4 pr-1 py-4 pointer-events-none"
          >
            <div className="w-full h-full pointer-events-auto pb-[50px] flex flex-col gap-2">
              <StatusBars
                playerName="Adventurer"
                className="flex-none"
              />
              <HudTabs
                items={state.inventory}
                slots={5}
                commandLog={chronicleLog}
                onOpenBook={() => setBookOpen(true)}
                onOpenProfile={() => setProfileOpen(true)}
                className="flex-1 min-h-0 px-2"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-[-60px] z-10 pointer-events-auto">
              <Terminal state={state} onSubmit={submit} />
            </div>
          </section>
        )}

        {/* Map area — fills from left panel edge to right edge */}
        <section aria-label="Dungeon" className={`absolute top-0 bottom-0 z-[10] ${
          profileOpen ? "left-0 right-0" : "left-[300px] right-0"
        }`}>
          <GameWorld
            state={state}
            onDismissPopup={dismissPopup}
            onDismissErrorPopup={dismissErrorPopup}
            roomSubtitle={roomSubtitle}
          />
        </section>
      </div>

      {state.won && (
        <VictoryOverlay
          onReset={loadNextAdaptiveDungeon}
          onReplay={handleReplayCurrentLevel}
          onClose={handleCloseVictoryOverlay}
          targetFile={state.targetFile}
          canReplay={Boolean(replayPayloadRef.current)}
          completionMessage={state.completionMessage}
          report={state.completionReport}
          busy={advancingLevel}
          actionLabel={state.tutorialId === LANTERN_CATACOMBS_ID ? "ENTER THE NEXT DUNGEON" : "TRAIN NEXT SKILL"}
        />
      )}
      {bookOpen && <BookOfSecrets onClose={() => setBookOpen(false)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

      <AnimatePresence>
        {state.activeMauQuiz && (
          <MauQuizOverlay
            quiz={state.activeMauQuiz}
            onSubmit={submitMauQuiz}
            onClose={closeMauQuiz}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.activeScroll && (
          <ScrollModal
            name={state.activeScroll.name}
            contents={state.activeScroll.contents}
            onClose={closeScroll}
          />
        )}
      </AnimatePresence>

      <AchievementToastQueue queue={achievementQueue} onDismiss={dismissAchievement} />

      {!profileOpen && (
        <WizardDialog
          externalMessage={wizardMessage}
          playerFamiliarity={linuxFamiliarity}
          context={{
            tutorialId: state.tutorialId,
            tutorialProgress: state.tutorialProgress,
            goal: state.goal,
            requiredCommands: state.requiredCommands,
            winCondition: state.winCondition,
            currentRoom: currentRoom?.name || state.cwd,
            currentPath: state.cwd,
            inventory: state.inventory.map((file) => file.name),
            roomFiles: currentRoom?.files.map((file) => file.name) ?? [],
            roomDoors: currentRoom?.doors.map((door) =>
              door.locked ? `${door.target}(locked)` : door.target,
            ) ?? [],
            recentCommands: state.commandHistory.slice(-6),
            mistakes: state.recentMistakes.slice(-4),
            weakCommands: nextLevelWeakCommands(state.commandStats, state.completionReport),
            brokenDoorName: brokenDoor?.target,
            repairCommand,
            roomHintFiles,
            demoScript: isDemoMode ? DEMO_CONTEXT : undefined,
          }}
        />
      )}
    </main>
  );
};

export default Index;
