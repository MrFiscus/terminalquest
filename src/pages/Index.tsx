import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { useGameState } from "@/hooks/useGameState";
import { generateLevel, type Difficulty } from "@/game/aiLevelService";
import { useState } from "react";

const Index = () => {
  const { state, submit, reset, dismissPopup, loadLevel } = useGameState();
  const [generating, setGenerating] = useState<Difficulty | null>(null);

  const loadAIDungeon = async (difficulty: Difficulty) => {
    if (generating || state.animating) return;
    setGenerating(difficulty);
    try {
      const level = await generateLevel({
        difficulty,
        weakCommands: ["find", "mv"],
        recentMistakes: [],
      });
      loadLevel(level, `${difficulty} (${level.rooms.length} rooms)`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <main className="relative grid h-screen w-screen grid-cols-[40vw_4px_60vw] overflow-hidden bg-background">
      <h1 className="sr-only">Terminal Quest - Linux Dungeon RPG</h1>

      <section aria-label="Terminal" className="h-full min-h-0">
        <Terminal state={state} onSubmit={submit} />
      </section>

      <div className="pillar-divider h-full" aria-hidden />

      <section aria-label="Dungeon" className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 carved-stone-tex border-b-2 border-stone-slab-edge px-3 py-2">
          <span className="font-pixel carved-gold text-[10px] tracking-wider">Claude Dungeon</span>
          {(["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              onClick={() => loadAIDungeon(difficulty)}
              disabled={Boolean(generating) || state.animating}
              className="stone-tablet-btn font-pixel text-[9px] uppercase px-3 py-1.5"
            >
              {generating === difficulty ? "..." : difficulty}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <GameWorld state={state} onDismissPopup={dismissPopup} />
        </div>
        <InventoryBar items={state.inventory} slots={5} />
      </section>

      {state.won && <VictoryOverlay onReset={reset} targetFile={state.targetFile} />}
    </main>
  );
};

export default Index;
