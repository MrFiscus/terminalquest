import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askDungeonMaster, type DungeonMasterContext } from "@/game/aiDungeonMasterService";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardDialogProps {
  context: DungeonMasterContext;
  externalMessage?: string | null;
}

export function WizardDialog({ context, externalMessage }: WizardDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isChatting, setIsChatting] = useState(false);
  const [message, setMessage] = useState("Greetings, traveler. Click my thoughts if you seek guidance.");
  const [displayedMessage, setDisplayedMessage] = useState(message);
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

  useEffect(() => {
    if (!externalMessage) return;
    setMessage(externalMessage);
    setIsOpen(true);
    setIsChatting(false);
  }, [externalMessage]);

  useEffect(() => {
    if (isLoading) return;
    setDisplayedMessage("");
    let index = 0;
    const timer = setInterval(() => {
      index += 2;
      setDisplayedMessage(message.slice(0, index));
      if (index >= message.length) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [isLoading, message]);

  // Auto-close welcome dialog after 5 seconds if not chatting
  useEffect(() => {
    if (!isOpen || isChatting) return;
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isChatting, isOpen, message]);

  return (
    <div className="fixed bottom-[84px] right-0 z-[130] pointer-events-none flex items-end justify-end gap-0 p-2">

      {/* Parchment Dialog Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 10 }}
            className="relative mb-2 -mr-4 flex justify-end pointer-events-auto"
          >
            <div
              className={cn(
                "relative w-72 cursor-pointer p-4 transition-all hover:shadow-[2px_4px_12px_rgba(0,0,0,0.6)]",
                isChatting && "cursor-default w-80"
              )}
              style={{
                backgroundColor: "#f5e6d3",
                backgroundImage: "linear-gradient(135deg, #f5e6d3 0%, #eaddca 100%)",
                boxShadow: "2px 4px 10px rgba(0,0,0,0.5), inset 0 0 20px rgba(139,69,19,0.12)",
                border: "1.5px solid #5d4037",
                borderRadius: "2px 8px 4px 12px / 8px 2px 12px 2px",
              }}
              onClick={() => !isChatting && setIsChatting(true)}
            >
              {/* Close Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsChatting(false); }}
                className="absolute -top-2 -left-2 w-5 h-5 bg-[#5d4037] text-[#f5e6d3] rounded-full flex items-center justify-center border border-[#f5e6d3] hover:bg-[#3e2723] transition-colors shadow-md z-20"
              >
                <X size={10} />
              </button>

              {/* Decorative Corner Fold */}
              <div className="absolute top-0 right-0 w-3 h-3 bg-[#5d4037]/10 rotate-45 translate-x-0.5 -translate-y-0.5 border-b border-l border-[#5d4037]/30" />

              <AnimatePresence mode="wait">
                {!isChatting ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-h-28 overflow-y-auto text-sm text-[#3e2723] leading-snug font-semibold"
                  >
                    <span>{displayedMessage}</span>
                    {isLoading && (
                      <span className="ml-1 inline-flex translate-y-0.5 gap-0.5">
                        <span className="w-1 h-1 bg-[#5d4037] rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1 h-1 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                    )}
                    <div className="mt-2 text-[8px] text-[#5d4037]/60 italic uppercase tracking-wider font-pixel border-t border-[#5d4037]/10 pt-1">
                      Click to ask
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-[#5d4037]/20 pb-1">
                      <span className="text-[8px] font-pixel text-[#5d4037] uppercase tracking-wider">Ask Keeper</span>
                      <button onClick={() => setIsChatting(false)} className="text-[#5d4037]/60 hover:text-[#5d4037]">
                        <span className="text-[8px] font-pixel">✕</span>
                      </button>
                    </div>
                    <div className="flex gap-1.5">
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
                        className="w-full bg-transparent border-0 border-b border-[#8b6914] px-0 py-0.5 text-[#3b1f0a] outline-none placeholder:text-[#3b1f0a]/40 text-[13px]"
                        style={{ fontFamily: "'Uncial Antiqua', cursive" }}
                      />
                      <button
                        onClick={handleSend}
                        className="bg-[#5d4037] text-[#f5e6d3] p-1.5 rounded hover:scale-105 transition-transform shrink-0"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Paper tail */}
              <div
                className="absolute bottom-4 -right-[6px] w-3 h-3 rotate-45 border-r border-b border-[#5d4037]"
                style={{ backgroundColor: "#eaddca" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Wizard (Permanent Anchor) */}
      <div
        className="relative z-10 h-40 w-40 flex-shrink-0 translate-x-2 cursor-pointer pointer-events-auto group"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={isLoading ? "/src/assets/characters/wizard-talking.gif" : "/src/assets/characters/wizard-idle.png"}
          alt="Wizard"
          className="w-full h-full object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105"
          style={{ imageRendering: "pixelated" }}
        />
        {!isOpen && (
          <div className="absolute -top-1 right-0 bg-[#5d4037] text-[#f5e6d3] font-pixel text-[7px] px-1.5 py-0.5 rounded shadow-lg animate-bounce uppercase">
            ?
          </div>
        )}
      </div>
    </div>
  );
}
