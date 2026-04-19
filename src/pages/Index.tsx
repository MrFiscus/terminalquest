import { GameWorld } from "@/components/GameWorld";
import { InventoryBar } from "@/components/InventoryBar";
import { Terminal } from "@/components/Terminal";
import { BookOfSecrets } from "@/components/BookOfSecrets";
import { VictoryOverlay } from "@/components/VictoryOverlay";
import { DifficultyMenu } from "@/components/DifficultyMenu";
import { WizardPopup } from "@/components/WizardPopup";
import { RoomFlavorSubtitle } from "@/components/RoomFlavorSubtitle";
import { useGameState } from "@/hooks/useGameState";
import { generateLevel, type Difficulty } from "@/game/aiLevelService";
import { adaptationMessage, getWeakCommands } from "@/game/adaptiveDungeon";
import { cn } from "@/lib/utils";
import { useState } from "react";
import slateTexture from "@/assets/slate-texture.jpg";

const Index = () => {
  const { state, submit, reset, dismissPopup, loadLevel, teachingTip, dismissTeaching, roomSubtitle } = useGameState();
  const [generating, setGenerating] = useState<Difficulty | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [linuxFamiliarity, setLinuxFamiliarity] = useState<number | undefined>(undefined);
  const [bookOpen, setBookOpen] = useState(false);

  const loadAIDungeon = async (difficulty: Difficulty, familiarity = linuxFamiliarity) => {
    if (generating || state.animating) return;
    const generationSeed = `${difficulty}-${familiarity ?? "tier"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setGenerating(difficulty);
    try {
      const weakCommands = getWeakCommands(state.commandStats, 4);
      const level = await generateLevel({
        difficulty,
        familiarity,
        generationSeed,
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
        onConfirm={(difficulty, familiarity) => {
          setLinuxFamiliarity(familiarity);
          setHasEntered(true);
          void loadAIDungeon(difficulty, familiarity);
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

      {/* Book of Secrets — landing-style stone tablet button */}
      <button
        type="button"
        onClick={() => setBookOpen(true)}
        className="lp-stone-btn lp-stone-btn-sweep"
        style={{ fontSize: 9, padding: "5px 12px", letterSpacing: "0.14em" }}
        title="Open the Book of Secrets"
      >
        <span className="lp-eng-glow">📖&nbsp;&nbsp;BOOK OF SECRETS</span>
      </button>
    </div>
  );

  return (
    <main
      className="dungeon-page-bg relative grid h-screen w-screen grid-cols-[40vw_4px_60vw] overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(ellipse at 50% 30%, hsl(230 14% 14%) 0%, hsl(230 18% 7%) 55%, hsl(230 22% 3%) 100%), url(${slateTexture})`,
        backgroundRepeat: "no-repeat, repeat",
        backgroundSize: "100% 100%, 512px 512px",
        backgroundPosition: "center, center",
        backgroundAttachment: "fixed, fixed",
        backgroundBlendMode: "multiply, normal",
      }}
    >
      <h1 className="sr-only">Terminal Quest - Linux Dungeon RPG</h1>

      {/* Ambient embers across the dungeon side */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[60vw] overflow-hidden" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => {
          const left = 8 + (i * 17) % 84;
          const dur = 6 + (i % 4) * 1.3;
          const delay = (i * 0.85) % 6;
          const drift = (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 4);
          return (
            <span
              key={i}
              className="lp-ember"
              style={{
                left: `${left}%`,
                bottom: `${12 + (i * 9) % 30}%`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                ["--ember-drift" as never]: `${drift}px`,
              }}
            />
          );
        })}
      </div>

      <section aria-label="Terminal" className="relative z-[2] h-full min-h-0 lp-hero-in">
        <div
          className="lp-breathe pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 50%, hsl(33 100% 50% / 0.06) 0%, transparent 65%)",
          }}
        />
        <Terminal state={state} onSubmit={submit} />
      </section>

      <div className="pillar-divider relative z-[2] h-full" aria-hidden />

      <section
        aria-label="Dungeon"
        className="relative z-[2] flex h-full min-h-0 flex-col lp-hero-in"
        style={{ animationDelay: "120ms" }}
      >
        <div
          className="lp-breathe pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 45%, hsl(33 100% 50% / 0.08) 0%, transparent 65%)",
            animationDelay: "1.4s",
          }}
        />
        <div className="relative min-h-0 flex-1">
          <GameWorld state={state} onDismissPopup={dismissPopup} headerRight={difficultyToggles} />
        </div>
        <RoomFlavorSubtitle text={roomSubtitle} />
        <div className="lp-hero-in" style={{ animationDelay: "240ms" }}>
          <InventoryBar items={state.inventory} slots={5} />
        </div>
      </section>

      {state.won && (
        <VictoryOverlay
          onReset={reset}
          targetFile={state.targetFile}
          completionMessage={state.completionMessage}
        />
      )}
      <WizardPopup tip={teachingTip} onDismiss={dismissTeaching} />

      {bookOpen && <BookOfSecrets onClose={() => setBookOpen(false)} />}
    </main>
  );
};

export default Index;
