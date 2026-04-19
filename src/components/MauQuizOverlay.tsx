import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MauQuiz } from "@/game/types";
import scrollImage from "@/assets/scroll.png";

interface MauQuizOverlayProps {
  quiz: MauQuiz;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

export function MauQuizOverlay({ quiz, onSubmit, onClose }: MauQuizOverlayProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (quiz.type === "input" && inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue("");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && quiz.completedMessage) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, quiz.completedMessage]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
	      <motion.div
	        className="relative text-[#3b1f0a]"
	        initial={{ scale: 0.9, y: 20 }}
	        animate={{ scale: 1, y: 0 }}
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
	            justifyContent: "center",
	          }}
	        >
	        {/* Decorative corner */}
	        <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none">
	           <div className="absolute top-4 right-4 text-4xl">🐾</div>
	        </div>
	
	        <h3 className="font-pixel text-sm uppercase tracking-widest text-[#8b6914] mb-4 flex items-center justify-center gap-2 text-center">
	          <span>Mau's Trial</span>
	          <div className="h-[2px] flex-1 bg-[#8b6914]/30" />
	        </h3>
	
	        <p className="font-pixel-text text-2xl leading-relaxed mb-6 text-center text-[#3b1f0a]">
	          {quiz.completedMessage ?? quiz.question}
	        </p>

        {quiz.completedMessage ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="font-pixel py-2 px-6 bg-[#8b6914] text-[#fff1c7] hover:bg-[#6f5410] text-[10px]"
            >
              Continue
            </button>
          </div>
        ) : quiz.type === "choice" ? (
          <div className="grid grid-cols-2 gap-3">
	            {quiz.options?.map((opt) => (
	              <button
	                key={opt}
	                onClick={() => onSubmit(opt)}
	                className="font-pixel py-3 px-4 bg-[#8b6914] text-[#fff1c7] hover:bg-[#6f5410] transition-colors text-xs active:translate-y-1"
	              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleInputSubmit} className="space-y-4">
            <div className="relative">
	              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6914] font-mono">$</span>
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
	                className="w-full bg-transparent border-0 border-b-2 border-[#8b6914] py-2 pl-8 pr-3 font-mono text-[#3b1f0a] focus:outline-none focus:border-[#8b6914] transition-colors"
	                placeholder="Type your answer..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
	                className="font-pixel py-2 px-4 text-[#8b6914] hover:text-[#3b1f0a] text-[10px]"
              >
                [Cancel]
              </button>
              <button
                type="submit"
	                className="font-pixel py-2 px-6 bg-[#8b6914] text-[#fff1c7] hover:bg-[#6f5410] text-[10px]"
	              >
                Submit
              </button>
            </div>
          </form>
	        )}
	        </div>
	      </motion.div>
    </motion.div>
  );
}
