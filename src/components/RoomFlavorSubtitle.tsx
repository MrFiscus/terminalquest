interface RoomFlavorSubtitleProps {
  text: string | null;
}

export function RoomFlavorSubtitle({ text }: RoomFlavorSubtitleProps) {
  if (!text) return null;

  return (
    <div className="pointer-events-none absolute bottom-28 left-1/2 z-30 w-[min(88%,560px)] -translate-x-1/2 animate-fade-in">
      <div className="rounded-md border border-[hsl(var(--torch-glow)/0.55)] bg-[hsl(230_22%_6%/0.82)] px-4 py-2 text-center shadow-[0_6px_20px_hsl(0_0%_0%/0.65)]">
        <p className="font-mono-clean text-[13px] italic text-parchment">{text}</p>
      </div>
    </div>
  );
}
