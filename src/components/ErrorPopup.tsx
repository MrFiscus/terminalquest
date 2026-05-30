import { useEffect } from "react";

interface ErrorPopupProps {
  title: string;
  body: string;
  onDismiss: () => void;
}

export function ErrorPopup({ title, body, onDismiss }: ErrorPopupProps) {
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
      className="pointer-events-auto absolute left-1/2 top-1/4 z-[120] -translate-x-1/2 animate-fade-in"
      onClick={onDismiss}
      role="alert"
    >
      <div
        className="relative bg-black/90 border-2 border-red-900 shadow-[0_0_20px_rgba(220,38,38,0.4)] px-6 py-4 rounded-md min-w-[300px] max-w-[500px]"
        style={{
          fontFamily: "'Press Start 2P', 'VT323', monospace",
        }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-red-900/50 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-red-500 font-pixel">
            {title}
          </span>
          <span className="text-[8px] text-red-500/60 ml-4 font-pixel">click / esc</span>
        </div>
        <div
          className="whitespace-pre-wrap text-[14px] leading-relaxed text-red-100"
          style={{ fontFamily: "'VT323', monospace" }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
