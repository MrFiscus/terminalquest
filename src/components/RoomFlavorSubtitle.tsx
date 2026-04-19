interface RoomFlavorSubtitleProps {
  text: string | null;
}

export function RoomFlavorSubtitle({ text }: RoomFlavorSubtitleProps) {
  return (
    <div className="relative z-30 flex min-h-[42px] items-center border-y border-[hsl(var(--torch-glow)/0.38)] bg-[hsl(230_20%_7%/0.94)] px-4 shadow-[inset_0_1px_0_hsl(42_70%_70%/0.08),inset_0_-1px_0_hsl(0_0%_0%/0.85)]">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-center text-center">
        <p className="min-w-0 font-mono-clean text-[12px] italic text-parchment">
          {text || "The dungeon waits for your next command."}
        </p>
      </div>
    </div>
  );
}
