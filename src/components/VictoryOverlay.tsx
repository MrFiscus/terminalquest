import { Button } from "@/components/ui/button";

interface VictoryOverlayProps {
  onReset: () => void;
  targetFile: string;
  completionMessage?: string | null;
}

export function VictoryOverlay({ onReset, targetFile, completionMessage }: VictoryOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 animate-fade-in">
      <div className="relative max-w-md border-2 border-primary bg-stone-dark p-8 text-center shadow-[0_0_40px_hsl(var(--torch-glow)/0.5)]">
        <div className="font-pixel text-base text-victory mb-4">★ VICTORY ★</div>
        <h2 className="font-pixel text-xs text-primary mb-3">YOU ESCAPED THE DUNGEON</h2>
        <p className="font-mono-pixel text-base text-parchment mb-6">
          The relic <span className="text-victory">{targetFile}</span> rests safely in your inventory.
          {" "}
          {completionMessage ?? "The torches die. Daylight returns."}
        </p>
        <Button
          onClick={onReset}
          className="font-pixel text-[10px] tracking-widest"
        >
          ▶ DESCEND AGAIN
        </Button>
      </div>
    </div>
  );
}
