import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import scrollImage from "@/assets/Scroll.png";

interface ScrollModalProps {
  name: string;
  contents: string;
  onClose: () => void;
}

export function ScrollModal({ name, contents, onClose }: ScrollModalProps) {
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleDown);
    return () => window.removeEventListener("keydown", handleDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out pointer-events-auto"
    >
      <motion.div
        className="relative text-[#3b1f0a] cursor-default"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 92vw, calc(82vh * 2400 / 1792))",
          aspectRatio: "2400 / 1792",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundImage: `url(${scrollImage})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundColor: "transparent",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            top: "26%",
            bottom: "20%",
            overflowY: "auto",
            scrollbarWidth: "none",
            display: "flex",
            flexDirection: "column",
          }}
          className="no-scrollbar"
        >
          <div className="flex justify-between items-center mb-4 border-b border-[#8b6914]/20 pb-2">
            <h3 className="font-pixel text-xs uppercase tracking-widest text-[#8b6914]">
              Ancient Knowledge
            </h3>
            <button onClick={onClose} className="text-[#8b6914] hover:scale-110 transition-transform">
              <X size={16} />
            </button>
          </div>

          <h2 className="font-pixel text-lg text-[#3b1f0a] mb-4 text-center underline decoration-[#8b6914]/40 underline-offset-4">
            {name}
          </h2>
          
          <div className="font-pixel-text text-xl leading-relaxed text-[#3b1f0a] whitespace-pre-wrap italic text-center p-2">
            {contents}
          </div>

          <div className="mt-8 mb-4 flex justify-center opacity-30">
            <div className="w-24 h-[1px] bg-[#8b6914]" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
