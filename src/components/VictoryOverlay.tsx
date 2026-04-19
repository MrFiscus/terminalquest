interface VictoryOverlayProps {
  onReset: () => void;
  targetFile: string;
  completionMessage?: string | null;
}

export function VictoryOverlay({ onReset, targetFile, completionMessage }: VictoryOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 lp-hero-in">
      <div className="relative max-w-md overflow-hidden border-2 border-primary bg-stone-dark p-8 text-center shadow-[0_0_40px_hsl(var(--torch-glow)/0.5)]">
        {/* Breathing ember halo */}
        <div
          className="lp-breathe pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, hsl(33 100% 50% / 0.20) 0%, transparent 65%)",
          }}
        />
        {/* Floating embers */}
        {Array.from({ length: 5 }).map((_, i) => {
          const left = 12 + (i * 19) % 80;
          const dur = 5 + (i % 3) * 1.4;
          const delay = (i * 0.7) % 5;
          const drift = (i % 2 === 0 ? 1 : -1) * (5 + (i % 3) * 3);
          return (
            <span
              key={i}
              className="lp-ember"
              style={{
                left: `${left}%`,
                bottom: `${10 + (i * 8) % 30}%`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                ["--ember-drift" as never]: `${drift}px`,
              }}
              aria-hidden
            />
          );
        })}

        <div className="relative">
          <div className="font-pixel text-base text-victory mb-4">★ VICTORY ★</div>
          <h2
            className="lp-silver-cast mb-4 inline-block"
            style={{
              fontFamily: "'Cinzel', 'Pirata One', serif",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "0.08em",
            }}
          >
            YOU ESCAPED THE DUNGEON
          </h2>
          <p
            className="text-[15px] text-parchment mb-6"
            style={{ fontFamily: "'Cinzel', 'MedievalSharp', serif" }}
          >
            The relic <span className="text-victory">{targetFile}</span> rests safely in your inventory.{" "}
            <span className="italic">{completionMessage ?? "The torches die. Daylight returns."}</span>
          </p>
          <button
            type="button"
            onClick={onReset}
            className="lp-stone-btn lp-stone-btn-sweep px-8 py-3"
            style={{ fontSize: 13 }}
          >
            <span className="lp-eng-glow">▶&nbsp;&nbsp;DESCEND AGAIN</span>
          </button>
        </div>
      </div>
    </div>
  );
}
