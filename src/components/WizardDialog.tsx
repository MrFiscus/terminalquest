import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askDungeonMaster, type DungeonMasterContext } from "@/game/aiDungeonMasterService";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardDialogProps {
  context: DungeonMasterContext;
}

export function WizardDialog({ context }: WizardDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isChatting, setIsChatting] = useState(false);
  const [message, setMessage] = useState("Greetings, traveler. Click my thoughts if you seek guidance.");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userQuery = input.trim();
    setInput("");
    setIsLoading(true);
    
    try {
      const response = await askDungeonMaster(userQuery, context);
      setMessage(response);
      setIsChatting(false);
    } catch (error) {
      setMessage("The magic is flickering... try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isChatting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatting]);

  // Auto-close welcome dialog after 7 seconds if not chatting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isChatting) {
        setIsOpen(false);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [isChatting]);

  return (
    <div className="fixed bottom-0 right-0 z-40 pointer-events-none flex items-end justify-end p-2 gap-0 h-64 w-full max-w-2xl">
      
      {/* Parchment Dialog Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="relative flex justify-end mb-12 -mr-8 pointer-events-auto"
          >
            <div
              className={cn(
                "relative p-6 min-w-[240px] max-w-sm cursor-pointer transition-all hover:shadow-[4px_8px_20px_rgba(0,0,0,0.6)]",
                isChatting && "cursor-default scale-100 shadow-[4px_8px_25px_rgba(0,0,0,0.7)]"
              )}
              style={{
                backgroundColor: "#f5e6d3",
                backgroundImage: "linear-gradient(135deg, #f5e6d3 0%, #eaddca 100%)",
                boxShadow: "2px 5px 15px rgba(0,0,0,0.5), inset 0 0 40px rgba(139,69,19,0.15)",
                border: "2px solid #5d4037",
                borderRadius: "2px 10px 5px 15px / 10px 3px 15px 2px",
              }}
              onClick={() => !isChatting && setIsChatting(true)}
            >
              {/* Close Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsChatting(false); }}
                className="absolute -top-3 -left-3 w-7 h-7 bg-[#5d4037] text-[#f5e6d3] rounded-full flex items-center justify-center border-2 border-[#f5e6d3] hover:bg-[#3e2723] transition-colors shadow-md z-20"
              >
                <X size={14} />
              </button>

              {/* Decorative Corner Fold */}
              <div className="absolute top-0 right-0 w-4 h-4 bg-[#5d4037]/10 rotate-45 translate-x-1 -translate-y-1 border-b border-l border-[#5d4037]/30" />
              
              <AnimatePresence mode="wait">
                {!isChatting ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-sans text-base text-[#3e2723] leading-relaxed font-semibold drop-shadow-sm"
                  >
                    {isLoading ? (
                      <div className="flex gap-1 py-2">
                        <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : message}
                    <div className="mt-3 text-[11px] text-[#5d4037]/70 italic uppercase tracking-wider font-pixel border-t border-[#5d4037]/10 pt-1">
                      Click to Ask the Keeper
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="flex flex-col gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-[#5d4037]/20 pb-1">
                      <span className="text-[10px] font-pixel text-[#5d4037] uppercase tracking-wider">Seek Wisdom</span>
                      <button 
                        onClick={() => setIsChatting(false)}
                        className="text-[#5d4037]/60 hover:text-[#5d4037]"
                      >
                        <span className="text-[9px] font-pixel">Cancel</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSend();
                        }}
                        placeholder="Your question..."
                        className="w-full bg-transparent border-0 border-b-2 border-[#8b6914] px-0 py-1 text-[#3b1f0a] outline-none placeholder:text-[#3b1f0a]/40 focus:border-[#8b6914]"
                        style={{ fontFamily: "'Uncial Antiqua', 'MedievalSharp', cursive", fontSize: "1.2rem" }}
                      />
                      <button 
                        onClick={handleSend} 
                        className="bg-[#5d4037] text-[#f5e6d3] p-2 rounded-lg hover:scale-105 transition-transform shrink-0"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Paper "Tail" pointing to Wizard */}
              <div 
                className="absolute bottom-6 -right-[8px] w-4 h-4 bg-[#f5e6d3] rotate-45 border-r-2 border-b-2 border-[#5d4037]" 
                style={{ backgroundColor: "#f5e6d3" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Wizard (Permanent Anchor) */}
      <div 
        className="relative w-48 h-48 flex-shrink-0 pointer-events-auto z-10 translate-x-4 cursor-pointer group"
        onClick={() => setIsOpen(true)}
      >
        <img 
          src={isLoading ? "/src/assets/characters/wizard-talking.gif" : "/src/assets/characters/wizard-idle.png"} 
          alt="Wizard"
          className="w-full h-full object-contain drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105"
          style={{ imageRendering: "pixelated" }}
        />
        {!isOpen && (
          <div className="absolute top-0 right-0 bg-[#5d4037] text-[#f5e6d3] font-pixel text-[8px] px-2 py-1 rounded shadow-lg animate-bounce uppercase">
            Advice?
          </div>
        )}
      </div>
    </div>
  );
}
