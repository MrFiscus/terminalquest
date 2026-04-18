import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { DifficultyMenu } from "@/components/DifficultyMenu";
import { WizardPopup } from "@/components/WizardPopup";
import { RoomFlavorSubtitle } from "@/components/RoomFlavorSubtitle";
import { useGameState } from "@/hooks/useGameState";
import { generateLevel, type Difficulty } from "@/game/aiLevelService";
import { adaptationMessage, getWeakCommands } from "@/game/adaptiveDungeon";
import { cn } from "@/lib/utils";
import { useState } from "react";

const Index = () => {
  const { state, submit, reset, dismissPopup, loadLevel, teachingTip, dismissTeaching, roomSubtitle } = useGameState();
  const [generating, setGenerating] = useState<Difficulty | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  const loadAIDungeon = async (difficulty: Difficulty) => {
    if (generating || state.animating) return;
    setGenerating(difficulty);
    try {
      const weakCommands = getWeakCommands(state.commandStats, 4);
      const level = await generateLevel({
        difficulty,
        weakCommands,
        recentMistakes: state.recentMistakes,
      });
      loadLevel(level, `${difficulty} (${level.rooms.length} rooms)`, adaptationMessage(weakCommands));
      setActiveDifficulty(difficulty);
    } finally {
      setGenerating(null);
    }
  };

  if (!hasEntered) {
    return (
      <DifficultyMenu
        busy={Boolean(generating)}
        onConfirm={(difficulty) => {
          setHasEntered(true);
          void loadAIDungeon(difficulty);
        }}
      />
    );
  }

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
        <RoomFlavorSubtitle text={roomSubtitle} />
        <InventoryBar items={state.inventory} slots={5} />
      </section>

      {state.won && (
        <VictoryOverlay
          onReset={reset}
          targetFile={state.targetFile}
          completionMessage={state.completionMessage}
        />
      )}
      <WizardPopup tip={teachingTip} onDismiss={dismissTeaching} />
    </main>
  );
};

export default Index;
