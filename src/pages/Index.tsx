import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
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
  readFamiliarity,
  readLevelSession,
  readOnboarded,
  saveFamiliarity,
  setOnboarded,
  type LevelSessionSnapshot,
} from "@/game/progressStats";
import { ResumeDialog } from "@/components/ResumeDialog";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { LinuxCommand, VictoryReport } from "@/game/types";
import type { GeneratedLevel } from "@/game/aiLevelService";

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

const headerNounNotes: Record<string, string> = {
  archive: "Dusty shelves lean over narrow paths, hiding clues between old records.",
  cellar: "Damp stone and low vents make every footstep sound closer than it is.",
  chamber: "A worked stone room waits in silence, marked by old travel and newer danger.",
  crypt: "Cold graves and cracked floor tiles make the air feel heavy.",
  forge: "Scorched brick and rusted tools hint at work abandoned in a hurry.",
  foyer: "A threshold room opens into branching passages and watchful shadows.",
  gallery: "Long walls carry banners, scratches, and signs of previous explorers.",
  hall: "A broad passage pulls your attention toward every doorway at once.",
  keep: "Reinforced stone and old storage crates make this room feel defended.",
  library: "Broken stacks and scattered notes turn the room into a puzzle of paper.",
  observatory: "Dark vents and old markings suggest someone studied the maze from here.",
  sanctum: "Quiet symbols and candle-stained stone make the room feel deliberate.",
  vault: "Heavy masonry and guarded corners make this chamber feel important.",
};

function fallbackRoomNote(roomName: string) {
  const parts = roomName.split(/[._-]+/).filter(Boolean);
  const noun = [...parts].reverse().find((part) => headerNounNotes[part]) ?? "chamber";
  return headerNounNotes[noun];
}

function roomHeaderNote(room: ReturnType<typeof getRoom>, transientNote: string | null, fallback: string) {
  if (!room) return fallback;
  const escapedName = room.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedPathName = room.path.split("/").pop()?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? escapedName;
  const raw = transientNote || room.description || fallback;
  const cleaned = raw
    .replace(new RegExp(`^${escapedName}\\s*:\\s*`, "i"), "")
    .replace(new RegExp(`^You enter\\s+${escapedName}\\.\\s*`, "i"), "")
    .replace(new RegExp(`^A generated chamber named\\s+${escapedPathName}\\.?\\s*`, "i"), "")
    .replace(new RegExp(`^A generated chamber named\\s+${escapedName}\\.?\\s*`, "i"), "")
    .trim();
  return cleaned || fallbackRoomNote(room.name) || fallback;
}

const Index = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const {
    state, submit, dismissPopup, loadLevel,
    teachingTip, dungeonMasterTip, roomSubtitle,
    submitMauQuiz, closeMauQuiz, openScroll, closeScroll,
    achievementQueue, dismissAchievement,
    resumeSession,
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

  // Track the signed-in user so the header button can show their actual
  // avatar (Google profile pic, custom avatar, or auto-generated initials)
  // instead of a generic placeholder icon.
  const [headerUser, setHeaderUser] = useState<User | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setHeaderUser(data.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setHeaderUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
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
      const showcaseMode = familiarity === 0;
      const weakCommands = showcaseMode
        ? ["mkdir", "cd", "ls", "mv"]
        : getWeakCommands(state.commandStats, 4);
      const playMode = showcaseMode ? "guided" : (familiarity ?? 0) >= 67 ? "real" : "guided";
      const generationSeed = [
        difficulty,
        familiarity ?? "unknown",
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 10),
        state.commandHistory.length,
      ].join("-");
      const level = showcaseMode
        ? generateDifficultyMechanicLevel(difficulty, familiarity, weakCommands)
        : await generateLevel({
            difficulty,
            familiarity,
            weakCommands,
            recentMistakes: state.recentMistakes,
            generationSeed,
          });
      const label = `${difficulty} (${level.rooms.length} rooms)`;
      const adaptation = showcaseMode
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

  const handleCloseVictoryToResume = () => {
    const session = readLevelSession();
    if (!session) {
      navigate("/", { replace: true });
      return;
    }
    setPendingSession(session);
    setResumeDecision("pending");
    setHasEntered(false);
  };

  const handleCloseResumeToLanding = () => {
    navigate("/", { replace: true });
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
  const isDemoMode = Boolean(state.showcaseMode || state.difficultyValue === 0);
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
  const mapSubtitle = roomHeaderNote(currentRoom, roomSubtitle, state.goal);

  // Header avatar — prefer the OAuth provider's profile image, then
  // initials from the user's name/email, then the generic UserRound.
  // Wrapped in a single button so the click target is the whole circle.
  const headerAvatarUrl =
    (headerUser?.user_metadata?.avatar_url as string | undefined) ?? null;
  const headerInitialsSource = (
    (headerUser?.user_metadata?.username as string | undefined) ??
    (headerUser?.user_metadata?.full_name as string | undefined) ??
    (headerUser?.user_metadata?.name as string | undefined) ??
    headerUser?.email ??
    ""
  ).trim();
  const headerInitials = headerInitialsSource
    ? headerInitialsSource
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || headerInitialsSource[0]?.toUpperCase()
    : null;

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        aria-label="Open profile"
        title={headerUser ? "Open profile" : "Sign in"}
        className="z-[60] flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500 bg-gray-900 text-amber-300 shadow-[0_0_0_hsl(38_92%_50%/0)] transition hover:scale-105 hover:shadow-[0_0_18px_hsl(38_92%_50%/0.75)]"
        style={{ padding: 0 }}
      >
        {headerAvatarUrl ? (
          <img
            src={headerAvatarUrl}
            alt={headerInitialsSource || "Profile avatar"}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => {
              // If the avatar URL fails (CORS, expired Google ref, etc.)
              // hide the broken image so the initials fallback shows.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : headerInitials ? (
          <span
            aria-hidden
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "hsl(38 80% 70%)",
              textShadow: "0 0 6px hsl(38 90% 55% / 0.6)",
            }}
          >
            {headerInitials}
          </span>
        ) : (
          <UserRound className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );

  return (
    <main className="relative grid h-screen w-screen grid-cols-[40vw_4px_60vw] overflow-hidden bg-background">
      <h1 className="sr-only">Terminal Quest - Linux Dungeon RPG</h1>
      <section aria-label="Terminal" className="h-full min-h-0">
        <Terminal state={state} onSubmit={submit} />
      </section>

      <div className="pillar-divider h-full" aria-hidden />

      <section aria-label="Dungeon" className="relative flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <GameWorld
            state={state}
            onDismissPopup={dismissPopup}
            headerRight={headerActions}
            headerSubtitle={mapSubtitle}
          />
        </div>
        <InventoryBar items={state.inventory} slots={5} onOpenBook={() => setBookOpen(true)} />
      </section>

      {state.won && (
        <VictoryOverlay
          onReset={loadNextAdaptiveDungeon}
          onReplay={handleReplayCurrentLevel}
          onClose={handleCloseVictoryToResume}
          targetFile={state.targetFile}
          canReplay={Boolean(replayPayloadRef.current)}
          completionMessage={state.completionMessage}
          report={state.completionReport}
          busy={advancingLevel}
          actionLabel="TRAIN NEXT SKILL"
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

      <WizardDialog
        externalMessage={dungeonMasterTip || teachingTip?.message || null}
        playerFamiliarity={linuxFamiliarity}
        context={{
          goal: state.goal,
          requiredCommands: state.requiredCommands,
          winCondition: state.winCondition,
          currentRoom: currentRoom?.name || state.cwd,
          currentPath: state.cwd,
          // Inventory and visible room contents — letting the wizard
          // reference these directly is what turns generic answers into
          // ones that point at the right item or door.
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
    </main>
  );
};

export default Index;
