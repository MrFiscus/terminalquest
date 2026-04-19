interface RoomFlavorSubtitleProps {
  text: string | null;
}

export function RoomFlavorSubtitle({ text }: RoomFlavorSubtitleProps) {
  if (!text) return null;

  return (
    <div className="pointer-events-none absolute bottom-28 left-1/2 z-30 w-[min(88%,560px)] -translate-x-1/2 lp-hero-in">
      <div className="relative rounded-md border border-[hsl(var(--torch-glow)/0.55)] bg-[hsl(230_22%_6%/0.85)] px-4 py-2 text-center shadow-[0_6px_20px_hsl(0_0%_0%/0.65)]">
        <div
          className="lp-breathe pointer-events-none absolute inset-0 rounded-md"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 50%, hsl(33 100% 50% / 0.10) 0%, transparent 70%)",
          }}
        />
        <p
          className="relative text-[14px] italic text-parchment"
          style={{ fontFamily: "'Cinzel', 'MedievalSharp', serif", letterSpacing: "0.02em" }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
