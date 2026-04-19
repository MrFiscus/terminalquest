import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MauQuiz } from "@/game/types";

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
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative max-w-md w-full parchment-tex p-8 rounded-sm text-stone-dark overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          boxShadow: "0 20px 50px rgba(0,0,0,0.8), inset 0 0 0 2px #8b4513, inset 0 0 40px rgba(139,69,19,0.1)",
        }}
      >
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none">
           <div className="absolute top-4 right-4 text-4xl">🐾</div>
        </div>

        <h3 className="font-pixel text-sm uppercase tracking-widest text-[#5d4037] mb-4 flex items-center gap-2">
          <span>Mau's Trial</span>
          <div className="h-[2px] flex-1 bg-[#5d4037]/20" />
        </h3>

        <p className="font-pixel-text text-lg leading-relaxed mb-8 text-[#3e2723]">
          {quiz.question}
        </p>

        {quiz.type === "choice" ? (
          <div className="grid grid-cols-2 gap-4">
            {quiz.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => onSubmit(opt)}
                className="font-pixel py-3 px-4 bg-[#5d4037] text-[#efebe9] hover:bg-[#4e342e] transition-colors rounded-sm text-xs active:translate-y-1 shadow-md hover:shadow-lg"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleInputSubmit} className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5d4037] font-mono">$</span>
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full bg-[#d7ccc8]/50 border-b-2 border-[#5d4037] py-2 pl-8 pr-3 font-mono text-[#3e2723] focus:outline-none focus:border-[#8d6e63] transition-colors"
                placeholder="Type your answer..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="font-pixel py-2 px-4 text-[#5d4037] hover:text-[#3e2723] text-[10px]"
              >
                [Cancel]
              </button>
              <button
                type="submit"
                className="font-pixel py-2 px-6 bg-[#5d4037] text-[#efebe9] hover:bg-[#4e342e] rounded-sm text-[10px] shadow-md"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
