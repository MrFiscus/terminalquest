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
import { DEMO_CONTEXT, useGameState } from "@/hooks/useGameState";
import { getRoom } from "@/game/dungeon";
import { generateLevel, type Difficulty } from "@/game/aiLevelService";
import { generateDifficultyMechanicLevel } from "@/game/difficultyMechanics";
import { adaptationMessage, getWeakCommands, type CommandStats } from "@/game/adaptiveDungeon";
import { startGameAmbience, stopGameAmbience } from "@/game/audio";
import { useCallback, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import type { LinuxCommand, VictoryReport } from "@/game/types";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const { 
    state, submit, dismissPopup, loadLevel, 
    teachingTip, dungeonMasterTip, roomSubtitle,
    submitMauQuiz, closeMauQuiz, openScroll, closeScroll
  } = useGameState({
    onOpenProfile: openProfile,
  });
  const [generating, setGenerating] = useState<Difficulty | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [linuxFamiliarity, setLinuxFamiliarity] = useState<number | undefined>(undefined);
  const [bookOpen, setBookOpen] = useState(false);
  const [advancingLevel, setAdvancingLevel] = useState(false);

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
      loadLevel(
        level,
        `${difficulty} (${level.rooms.length} rooms)`,
        showcaseMode
          ? "The dungeon whispers: type ls to survey your surroundings."
          : playMode === "guided" ? adaptationMessage(weakCommands) : null,
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
      loadLevel(level, `${difficulty} (${level.rooms.length} rooms)`, adaptation, "guided", {
        showcaseMode: false,
        weakCommands,
      });
      setActiveDifficulty(difficulty);
      setHasEntered(true);
    } finally {
      setAdvancingLevel(false);
    }
  };

  if (!hasEntered) {
    return (
      <DifficultyMenu
        busy={Boolean(generating)}
        onConfirm={async (difficulty, familiarity, precise) => {
          setLinuxFamiliarity(familiarity);
          const loaded = await loadAIDungeon(difficulty, familiarity);
          if (loaded) setHasEntered(true);
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

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        aria-label="Open profile"
        title="Open profile"
        className="z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-amber-500 bg-gray-900 text-amber-300 shadow-[0_0_0_hsl(38_92%_50%/0)] transition hover:scale-105 hover:shadow-[0_0_18px_hsl(38_92%_50%/0.75)]"
      >
        <UserRound className="h-5 w-5" aria-hidden />
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
          targetFile={state.targetFile}
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

      <WizardDialog 
        externalMessage={dungeonMasterTip || teachingTip?.message || null}
        context={{
          goal: state.goal,
          requiredCommands: state.requiredCommands,
          winCondition: state.winCondition,
          currentRoom: currentRoom?.name || state.cwd,
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
