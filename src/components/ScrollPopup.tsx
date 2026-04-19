import { useEffect } from "react";
import scrollImage from "@/assets/Scroll.png";

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
	      className="pointer-events-auto absolute left-1/2 top-1/2 z-[120] -translate-x-1/2 -translate-y-1/2 animate-fade-in"
	      onClick={onDismiss}
	      role="dialog"
	    >
	      <div
	        className="relative text-[#3b1f0a]"
	        style={{
	          width: "min(650px, 90vw, calc(80vh * 2400 / 1792))",
	          aspectRatio: "2400 / 1792",
	          boxSizing: "border-box",
	          overflow: "hidden",
	          backgroundImage: `url(${scrollImage})`,
	          backgroundSize: "100% 100%",
	          backgroundRepeat: "no-repeat",
	          backgroundColor: "transparent",
	          fontFamily: "'Press Start 2P', 'VT323', monospace",
	        }}
	      >
	        <div
	          style={{
	            position: "absolute",
	            left: "14%",
	            right: "14%",
	            top: "24%",
	            bottom: "18%",
	            overflowY: "auto",
	          }}
	        >
	        <div className="mb-2 flex items-center justify-between">
	          <span className="text-[10px] uppercase tracking-wider text-[#8b6914]">{title}</span>
	          <span className="text-[8px] text-[#3b1f0a]/60">click / esc</span>
	        </div>
	        <div
	          className="whitespace-pre-wrap text-[12px] leading-relaxed"
	          style={{ fontFamily: "'VT323', monospace" }}
	        >
	          {body}
	        </div>
	        </div>
	      </div>
	    </div>
  );
}
