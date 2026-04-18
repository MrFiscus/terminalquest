import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { useGameState } from "@/hooks/useGameState";

const Index = () => {
  const { state, submit, reset, dismissPopup } = useGameState();

  return (
    <main className="relative grid h-screen w-screen grid-cols-[40fr_14px_60fr] overflow-hidden bg-background">
      <h1 className="sr-only">Terminal Quest — Linux Dungeon RPG</h1>

      {/* Left: Terminal (40%) */}
      <section aria-label="Terminal" className="h-full min-h-0">
        <Terminal state={state} onSubmit={submit} />
      </section>

      {/* Stone pillar divider */}
      <div className="pillar-divider h-full" aria-hidden />

      {/* Right: Game world + inventory (60%) */}
      <section aria-label="Dungeon" className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <GameWorld state={state} onDismissPopup={dismissPopup} />
        </div>
        <InventoryBar items={state.inventory} slots={5} />
      </section>

      {state.won && <VictoryOverlay onReset={reset} />}
    </main>
  );
};

export default Index;
