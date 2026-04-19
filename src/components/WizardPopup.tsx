import { useEffect } from "react";
import type { TeachingTip } from "@/game/commandTeaching";

interface WizardPopupProps {
  tip: TeachingTip | null;
  onDismiss: () => void;
}

export function WizardPopup({ tip, onDismiss }: WizardPopupProps) {
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(onDismiss, 5200);
    return () => clearTimeout(timer);
  }, [tip, onDismiss]);

  if (!tip) return null;

  return (
    <div className="pointer-events-none fixed bottom-28 right-60 z-[130] flex max-w-xs items-end gap-2 animate-fade-in">
      <div className="rounded-md border-2 border-[hsl(var(--torch-glow)/0.8)] bg-[hsl(230_22%_6%/0.92)] px-3 py-2 text-parchment shadow-[0_6px_18px_hsl(0_0%_0%/0.75)]">
        <p className="font-mono-clean text-[12px] leading-snug">{tip.message}</p>
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-stone-slab-edge bg-stone-dark text-2xl shadow-[0_0_18px_hsl(var(--torch-glow)/0.35)]"
        aria-hidden
      >
        🧙
      </div>
    </div>
  );
}
