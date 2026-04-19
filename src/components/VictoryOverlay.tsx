import { Button } from "@/components/ui/button";
import scrollImage from "@/assets/scroll.png";

interface VictoryOverlayProps {
  onReset: () => void;
  targetFile: string;
  completionMessage?: string | null;
}

export function VictoryOverlay({ onReset, targetFile, completionMessage }: VictoryOverlayProps) {
	  return (
	    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 animate-fade-in">
	      <div
	        className="relative text-center text-[#3b1f0a]"
	        style={{
	          width: "950px",
	          maxWidth: "98vw",
	          maxHeight: "95vh",
	          overflow: "hidden",
	          paddingTop: "80px",
	          paddingBottom: "80px",
	          paddingLeft: "60px",
	          paddingRight: "60px",
	          backgroundImage: `url(${scrollImage})`,
	          backgroundSize: "100% 100%",
	          backgroundRepeat: "no-repeat",
	          backgroundColor: "transparent",
	        }}
	      >
	        <div style={{ maxHeight: "calc(95vh - 160px)", overflowY: "auto", scrollbarWidth: "none" }}>
	          <div className="font-pixel text-base text-[#8b6914] mb-4">★ VICTORY ★</div>
	          <h2 className="font-pixel text-xs text-[#8b6914] mb-3">YOU ESCAPED THE DUNGEON</h2>
	          <p className="font-mono-pixel text-base text-[#3b1f0a] mb-6">
	            The relic <span className="text-[#8b6914]">{targetFile}</span> rests safely in your inventory.
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
	    </div>
  );
}
