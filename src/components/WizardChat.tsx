import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askDungeonMaster, type DungeonMasterContext } from "@/game/aiDungeonMasterService";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Send, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import wizardIdle from "@/assets/characters/wizard-idle.png";
import wizardTalking from "@/assets/characters/wizard-talking.gif";

interface Message {
  role: "user" | "wizard";
  text: string;
}

interface WizardChatProps {
  context: DungeonMasterContext;
}

export function WizardChat({ context }: WizardChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "wizard", text: "Greetings, traveler! I am the Keeper of the Terminal. How can I assist you on your quest?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsTyping(true);

    try {
      const response = await askDungeonMaster(userText, context);
      setMessages((prev) => [...prev, { role: "wizard", text: response }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "wizard", text: "The magic is flickering... I couldn't reach the beyond. Try again?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="pointer-events-auto flex flex-col w-[320px] sm:w-[380px] h-[450px] rounded-2xl border-4 border-[#8b4513] bg-[#f5e6d3] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#8b4513] text-[#f5e6d3]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f5e6d3] border-2 border-[#f5e6d3] overflow-hidden">
                  <img 
                    src={isTyping ? wizardTalking : wizardIdle} 
                    alt="Wizard"
                    className="w-full h-full object-cover scale-150 mt-1"
                  />
                </div>
                <span className="font-pixel text-xs tracking-wider">The Wizard</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:scale-110 transition-transform"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 bg-[#ead8ba]">
              <div ref={scrollRef} className="space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: msg.role === "wizard" ? -10 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-3 py-2 rounded-xl text-sm font-pixel-text leading-relaxed shadow-sm",
                      msg.role === "wizard" 
                        ? "bg-white border-2 border-[#8b4513] text-[#3e2723] rounded-tl-none" 
                        : "bg-[#8b4513] text-[#f5e6d3] rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex gap-1 items-center p-2 text-[#8b4513]">
                    <span className="w-1.5 h-1.5 bg-[#8b4513] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#8b4513] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-[#8b4513] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 bg-white border-t-2 border-[#8b4513] flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask the Wizard..."
                className="font-pixel-text text-sm bg-[#f5e6d3]/30 border-[#8b4513]/30 focus-visible:ring-[#8b4513]"
              />
              <Button 
                onClick={handleSend}
                disabled={isTyping}
                size="icon"
                className="bg-[#8b4513] hover:bg-[#5d2e0c] shrink-0"
              >
                <Send size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="pointer-events-auto relative group"
      >
        {/* Coc Style Speech Bubble */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-12 right-0 bg-white border-2 border-[#8b4513] px-3 py-1 rounded-lg shadow-lg whitespace-nowrap"
          >
            <span className="font-pixel text-[10px] text-[#3e2723]">Need help? Ask me!</span>
            <div className="absolute -bottom-2 right-6 w-3 h-3 bg-white border-r-2 border-b-2 border-[#8b4513] rotate-45" />
          </motion.div>
        )}

        <div className="w-16 h-16 rounded-full border-4 border-[#8b4513] bg-[#f5e6d3] shadow-xl overflow-hidden flex items-center justify-center">
          <img 
            src={wizardIdle} 
            alt="Wizard"
            className="w-full h-full object-cover scale-150 mt-1 transition-transform group-hover:scale-[1.65]"
          />
        </div>
        
        {/* Pulse effect */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full border-4 border-[#8b4513] animate-ping opacity-25" />
        )}
      </motion.button>
    </div>
  );
}
