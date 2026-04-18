import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { useGameState } from "@/hooks/useGameState";

const Index = () => {
  const { state, submit, reset } = useGameState();

  return (
    <main className="relative grid h-screen w-screen grid-cols-1 md:grid-cols-2 overflow-hidden bg-background">
      <h1 className="sr-only">Terminal Quest — Linux Dungeon RPG</h1>

      {/* Left: Terminal */}
      <section aria-label="Terminal" className="h-full min-h-0">
        <Terminal state={state} onSubmit={submit} />
      </section>

      {/* Right: Game world + inventory */}
      <section aria-label="Dungeon" className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <GameWorld state={state} />
        </div>
        <InventoryBar items={state.inventory} />
      </section>

      {state.won && <VictoryOverlay onReset={reset} />}
    </main>
  );
};

export default Index;
