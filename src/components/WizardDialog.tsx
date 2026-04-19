import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askDungeonMaster, type DungeonMasterContext } from "@/game/aiDungeonMasterService";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import wizardIdle from "@/assets/characters/wizard-idle.png";
import wizardTalking from "@/assets/characters/wizard-talking.gif";

interface WizardDialogProps {
  context: DungeonMasterContext;
  externalMessage?: string | null;
  /** Saved Linux familiarity slider value (0–100). Tunes wizard verbosity. */
  playerFamiliarity?: number;
}

interface ChatTurn {
  q: string;
  a: string;
}

const HISTORY_LIMIT = 5; // last N turns sent as conversation context

export function WizardDialog({ context, externalMessage, playerFamiliarity }: WizardDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isChatting, setIsChatting] = useState(false);
  const [message, setMessage] = useState("Greetings, traveler. Click my thoughts if you seek guidance.");
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Local conversation buffer — keeps the wizard answers contextual to
  // recent follow-ups instead of treating every question as cold start.
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the AI context every render with the latest history + familiarity.
  // Spread the parent context first so any field we add wins.
  const aiContext: DungeonMasterContext = useMemo(() => ({
    ...context,
    playerFamiliarity,
    conversationHistory: history.flatMap((turn) => [
      { role: "player" as const, text: turn.q },
      { role: "wizard" as const, text: turn.a },
    ]),
  }), [context, playerFamiliarity, history]);

  /**
   * Contextual quick-question chips that change with the game state.
   * They give beginners obvious entry points instead of forcing them to
   * invent a question from scratch.
   */
  const quickChips = useMemo(() => {
    const chips: string[] = [];
    chips.push("What should I do next?");
    if (context.weakCommands && context.weakCommands.length > 0) {
      chips.push(`Explain \`${context.weakCommands[0]}\``);
    } else if (context.requiredCommands && context.requiredCommands.length > 0) {
      chips.push(`Explain \`${context.requiredCommands[0]}\``);
    }
    if (context.brokenDoorName) {
      chips.push("How do I fix the broken door?");
    } else if ((context.roomDoors ?? []).some((d) => /\(locked\)/.test(d))) {
      chips.push("Where is the key?");
    } else {
      chips.push("I'm stuck — give me a hint.");
    }
    return chips.slice(0, 3);
  }, [context]);

  const sendQuestion = async (raw: string) => {
    const userQuery = raw.trim();
    if (!userQuery || isLoading) return;
    setInput("");
    setIsLoading(true);
    try {
      const response = await askDungeonMaster(userQuery, aiContext);
      setMessage(response);
      // Persist the exchange into local history (capped to HISTORY_LIMIT).
      setHistory((prev) => [...prev, { q: userQuery, a: response }].slice(-HISTORY_LIMIT));
      setIsChatting(false);
    } catch (_error) {
      setMessage("The magic is flickering... try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendQuestion(input);
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

  // Auto-close timer scales with the message length so a long teaching
  // hint isn't yanked away before the reader can finish it. Roughly
  // 60ms per character with a generous floor and ceiling.
  useEffect(() => {
    if (!isOpen || isChatting) return;
    const dwellMs = Math.max(8000, Math.min(28000, message.length * 60));
    const timer = setTimeout(() => setIsOpen(false), dwellMs);
    return () => clearTimeout(timer);
  }, [isChatting, isOpen, message]);

  return (
    <div className="fixed bottom-0 right-0 z-[130] pointer-events-none flex items-end justify-end gap-0 p-0">

      {/* Parchment Dialog Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 10 }}
            className="relative mb-2 mr-0 flex justify-end pointer-events-auto"
          >
            <div
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-[2px_4px_14px_rgba(0,0,0,0.65)] flex flex-col",
                "w-[30rem] p-3.5",
                isChatting && "cursor-default w-[34rem] p-4"
              )}
              style={{
                backgroundColor: "#f5e6d3",
                backgroundImage: "linear-gradient(135deg, #f5e6d3 0%, #eaddca 100%)",
                boxShadow: "2px 4px 12px rgba(0,0,0,0.55), inset 0 0 24px rgba(139,69,19,0.14)",
                border: "1.5px solid #5d4037",
                borderRadius: "3px 10px 5px 14px / 10px 3px 14px 3px",
                // Hard cap so the dialog stays roughly within the
                // inventory zone — it can spill a little above, but
                // shouldn't reach into the dungeon's bottom wall / doors.
                // The message body scrolls internally for long hints.
                maxHeight: isChatting ? "min(32vh, 260px)" : "min(22vh, 170px)",
              }}
              onClick={() => !isChatting && setIsChatting(true)}
            >
              {/* Close Button — bigger so it's easy to hit */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsChatting(false); }}
                aria-label="Dismiss the Keeper"
                className="absolute -top-2.5 -left-2.5 w-7 h-7 bg-[#5d4037] text-[#f5e6d3] rounded-full flex items-center justify-center border border-[#f5e6d3] hover:bg-[#3e2723] transition-colors shadow-md z-20"
              >
                <X size={14} />
              </button>

              {/* Decorative Corner Fold */}
              <div className="absolute top-0 right-0 w-3 h-3 bg-[#5d4037]/10 rotate-45 translate-x-0.5 -translate-y-0.5 border-b border-l border-[#5d4037]/30" />

              {/* Speaker header — establishes who's talking and what mode */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#5d4037]/30">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: "#8b6914", boxShadow: "0 0 6px #c9a84c" }}
                    aria-hidden
                  />
                  <span
                    className="uppercase"
                    style={{
                      fontFamily: "'Cinzel', Georgia, serif",
                      fontSize: 11,
                      letterSpacing: "0.22em",
                      color: "#5d4037",
                      fontWeight: 700,
                    }}
                  >
                    {isChatting ? "Ask the Keeper" : "The Keeper Speaks"}
                  </span>
                </div>
                {isChatting && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsChatting(false); }}
                    className="text-[#5d4037]/70 hover:text-[#5d4037] transition-colors"
                    aria-label="Back to message"
                    style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 10, letterSpacing: "0.14em" }}
                  >
                    BACK
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!isChatting ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[#3e2723] flex flex-col min-h-0 flex-1"
                  >
                    <div
                      className="overflow-y-auto pr-1 flex-1 min-h-0 wizard-scroll"
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: 15,
                        lineHeight: 1.5,
                        fontWeight: 400,
                        letterSpacing: "0.005em",
                      }}
                      onClick={(e) => {
                        // Click-to-skip typewriter — if the animation is
                        // still revealing characters, jump to the full
                        // message instead of opening the chat.
                        if (displayedMessage.length < message.length) {
                          e.stopPropagation();
                          setDisplayedMessage(message);
                        }
                      }}
                    >
                      <span>{displayedMessage}</span>
                      {isLoading && (
                        <span className="ml-1 inline-flex translate-y-0.5 gap-1">
                          <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.4s]" />
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-3 pt-2 border-t border-[#5d4037]/20 flex items-center justify-center gap-2"
                      style={{
                        fontFamily: "'Cinzel', Georgia, serif",
                        fontSize: 11,
                        letterSpacing: "0.18em",
                        color: "#8b6914",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      <span aria-hidden>▸</span>
                      Click to ask the Keeper
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex flex-col gap-2.5 min-h-0 flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Last response shown above the input so the conversation has context */}
                    {displayedMessage && (
                      <div
                        className="overflow-y-auto p-2 pr-3 rounded flex-1 min-h-0 wizard-scroll"
                        style={{
                          background: "rgba(93,64,55,0.08)",
                          border: "1px solid rgba(93,64,55,0.18)",
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: "#3e2723",
                        }}
                      >
                        {displayedMessage}
                        {isLoading && (
                          <span className="ml-1 inline-flex translate-y-0.5 gap-1">
                            <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-[#5d4037] rounded-full animate-bounce [animation-delay:0.4s]" />
                          </span>
                        )}
                      </div>
                    )}
                    {/* Quick-question chips — adapt to the current
                        room/state so beginners always have a starting
                        point. Each chip sends its prompt as if typed. */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); sendQuestion(chip); }}
                          disabled={isLoading}
                          className="transition-colors disabled:opacity-50 disabled:cursor-wait"
                          style={{
                            fontFamily: "Georgia, serif",
                            fontSize: 12,
                            lineHeight: 1.2,
                            color: "#3e2723",
                            background: "rgba(201,168,76,0.18)",
                            border: "1px solid rgba(139,105,20,0.5)",
                            padding: "4px 9px",
                            borderRadius: 12,
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.32)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.18)";
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-stretch">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSend();
                          if (e.key === "Escape") setIsChatting(false);
                        }}
                        placeholder="Type a question for the Keeper…"
                        className="flex-1 outline-none transition-shadow"
                        style={{
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontSize: 15,
                          color: "#3b1f0a",
                          background: "rgba(255,248,220,0.85)",
                          border: "1.5px solid #8b6914",
                          borderRadius: 4,
                          padding: "8px 12px",
                          boxShadow: "inset 0 1px 3px rgba(93,64,55,0.18)",
                        }}
                        onFocus={(e) => {
                          (e.currentTarget as HTMLInputElement).style.boxShadow =
                            "inset 0 1px 3px rgba(93,64,55,0.18), 0 0 0 2px rgba(201,168,76,0.4)";
                        }}
                        onBlur={(e) => {
                          (e.currentTarget as HTMLInputElement).style.boxShadow =
                            "inset 0 1px 3px rgba(93,64,55,0.18)";
                        }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        aria-label="Send question to the Keeper"
                        className="flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          fontFamily: "'Cinzel', Georgia, serif",
                          fontSize: 11,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          background: "linear-gradient(180deg, #5d4037, #3e2723)",
                          color: "#f5e6d3",
                          border: "1.5px solid #3e2723",
                          padding: "8px 14px",
                          borderRadius: 4,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                      >
                        <Send size={14} />
                        Ask
                      </button>
                    </div>
                    <div
                      className="text-center"
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: 11,
                        fontStyle: "italic",
                        color: "rgba(93,64,55,0.7)",
                      }}
                    >
                      Press <kbd style={{ fontFamily: "monospace", fontSize: 10, padding: "1px 4px", background: "rgba(93,64,55,0.12)", border: "1px solid rgba(93,64,55,0.25)", borderRadius: 2 }}>Enter</kbd> to ask · <kbd style={{ fontFamily: "monospace", fontSize: 10, padding: "1px 4px", background: "rgba(93,64,55,0.12)", border: "1px solid rgba(93,64,55,0.25)", borderRadius: 2 }}>Esc</kbd> to dismiss
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

      {/* The Wizard (Permanent Anchor) — kept at full size; nudged
          DOWN with translate-y so the bottom of the sprite sits below
          the viewport. Same visual character, just lower on screen so
          it stops covering the dungeon's bottom wall / doors. */}
      <div
        className="relative z-10 h-40 w-40 flex-shrink-0 cursor-pointer pointer-events-auto group translate-y-[60px]"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={isLoading ? wizardTalking : wizardIdle}
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
