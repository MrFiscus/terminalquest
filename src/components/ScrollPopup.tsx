import { useEffect } from "react";

interface ScrollPopupProps {
  title: string;
  body: string;
  onDismiss: () => void;
}

export function ScrollPopup({ title, body, onDismiss }: ScrollPopupProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 max-w-md w-[80%] animate-fade-in"
      onClick={onDismiss}
      role="dialog"
    >
      <div
        className="parchment-tex rounded-sm px-6 py-5 text-stone-dark"
        style={{
          boxShadow:
            "0 12px 40px hsl(0 0% 0% / 0.85), inset 0 0 0 2px hsl(35 40% 50%), inset 0 0 0 4px hsl(42 55% 78%)",
          fontFamily: "'Press Start 2P', 'VT323', monospace",
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider">{title}</span>
          <span className="text-[8px] opacity-60">click / esc</span>
        </div>
        <div
          className="whitespace-pre-wrap text-[12px] leading-relaxed"
          style={{ fontFamily: "'VT323', monospace" }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
