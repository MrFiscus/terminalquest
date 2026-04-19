import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
import { BookOfSecrets } from "@/components/BookOfSecrets";
import { ProfileModal } from "@/components/ProfileModal";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { DifficultyMenu } from "@/components/DifficultyMenu";
import { RoomFlavorSubtitle } from "@/components/RoomFlavorSubtitle";
import { MauQuizOverlay } from "@/components/MauQuizOverlay";
import { ScrollModal } from "@/components/ScrollModal";
import { WizardDialog } from "@/components/WizardDialog";
import { DEMO_CONTEXT, useGameState } from "@/hooks/useGameState";
import { getRoom } from "@/game/dungeon";
import { generateLevel, type Difficulty } from "@/game/aiLevelService";
import { generateDifficultyMechanicLevel } from "@/game/difficultyMechanics";
import { adaptationMessage, getWeakCommands } from "@/game/adaptiveDungeon";
import { startGameAmbience, stopGameAmbience } from "@/game/audio";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { AnimatePresence } from "framer-motion";

const Index = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const { 
    state, submit, reset, dismissPopup, loadLevel, 
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
          ? "First, find Mau with: find Mau"
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
  const isDemoMode = Boolean(state.showcaseMode || state.difficultyValue === 50);
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
  const mapSubtitle = roomSubtitle || (
    currentRoom ? `${currentRoom.name}: ${currentRoom.description}` : state.goal
  );

  const difficultyToggles = (
    <div className="flex items-center gap-1.5">
      {(["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => (
        <button
          key={difficulty}
          type="button"
          onClick={() => loadAIDungeon(difficulty)}
          disabled={Boolean(generating) || state.animating}
          className={cn(
            "stone-toggle",
            activeDifficulty === difficulty && "stone-toggle-active",
          )}
          aria-pressed={activeDifficulty === difficulty}
        >
          {generating === difficulty ? "..." : difficulty}
        </button>
      ))}

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
          <GameWorld state={state} onDismissPopup={dismissPopup} headerRight={difficultyToggles} />
        </div>
        <RoomFlavorSubtitle text={mapSubtitle} />
        <InventoryBar items={state.inventory} slots={5} onOpenBook={() => setBookOpen(true)} />
      </section>

      {state.won && (
        <VictoryOverlay
          onReset={reset}
          targetFile={state.targetFile}
          completionMessage={state.completionMessage}
          report={state.completionReport}
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
