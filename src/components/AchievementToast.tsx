import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AchievementDef, AchievementRarity } from "@/game/achievements";

/**
 * Small medieval-parchment popup that slides into the top-right of the
 * map when a new achievement is unlocked. Auto-dismisses after 5s.
 * A queue component stacks multiple toasts when several unlock at once.
 */

const DISPLAY_MS = 5000;

const RARITY_STYLE: Record<
  AchievementRarity,
  { border: string; glow: string; accent: string; label: string }
> = {
  common: {
    border: "rgba(190, 165, 95, 0.9)",
    glow: "rgba(255, 215, 120, 0.35)",
    accent: "hsl(42 55% 72%)",
    label: "Common",
  },
  rare: {
    border: "rgba(110, 180, 220, 0.95)",
    glow: "rgba(120, 190, 240, 0.4)",
    accent: "hsl(200 70% 75%)",
    label: "Rare",
  },
  epic: {
    border: "rgba(185, 135, 235, 0.95)",
    glow: "rgba(200, 140, 255, 0.45)",
    accent: "hsl(280 70% 80%)",
    label: "Epic",
  },
  legendary: {
    border: "rgba(255, 190, 90, 1)",
    glow: "rgba(255, 200, 100, 0.6)",
    accent: "hsl(42 90% 72%)",
    label: "Legendary",
  },
};

interface AchievementToastProps {
  achievement: AchievementDef;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const palette = RARITY_STYLE[achievement.rarity];
  const isLegendary = achievement.rarity === "legendary";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      onClick={onDismiss}
      role="status"
      aria-live="polite"
      className="pointer-events-auto cursor-pointer select-none"
      style={{
        minWidth: 280,
        maxWidth: 320,
        background:
          "linear-gradient(140deg, rgba(38,28,20,0.97) 0%, rgba(24,18,14,0.97) 100%)",
        border: `2px solid ${palette.border}`,
        borderRadius: 6,
        boxShadow: `0 8px 28px rgba(0,0,0,0.6), 0 0 0 2px rgba(0,0,0,0.4) inset, 0 0 22px ${palette.glow}`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* top ribbon */}
      <div
        style={{
          padding: "4px 10px",
          background: `linear-gradient(180deg, ${palette.border} 0%, rgba(0,0,0,0.35) 100%)`,
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "hsl(0 0% 10%)",
          textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Achievement Unlocked</span>
        <span style={{ opacity: 0.85 }}>{palette.label}</span>
      </div>

      {/* body */}
      <div style={{ display: "flex", gap: 12, padding: "12px 12px 12px 14px", alignItems: "flex-start" }}>
        {/* icon */}
        <div
          className={isLegendary ? "achievement-icon-legendary" : undefined}
          style={{
            fontSize: 34,
            lineHeight: 1,
            flex: "0 0 auto",
            filter: `drop-shadow(0 0 6px ${palette.glow})`,
            marginTop: 2,
          }}
        >
          {achievement.icon}
        </div>

        {/* text */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 14,
              fontWeight: 700,
              color: palette.accent,
              textShadow: "0 1px 0 rgba(0,0,0,0.6)",
              marginBottom: 2,
              letterSpacing: "0.02em",
            }}
          >
            {achievement.name}
          </div>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 11,
              lineHeight: 1.35,
              color: "hsl(42 25% 80%)",
              marginBottom: 6,
            }}
          >
            {achievement.description}
          </div>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 10.5,
              fontStyle: "italic",
              color: "hsl(42 40% 65%)",
              opacity: 0.9,
            }}
          >
            "{achievement.reward}"
          </div>
        </div>
      </div>

      {/* progress bar (auto-timer) */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: DISPLAY_MS / 1000, ease: "linear" }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          background: palette.accent,
          opacity: 0.7,
        }}
      />
    </motion.div>
  );
}

interface AchievementToastQueueProps {
  queue: AchievementDef[];
  onDismiss: (id: string) => void;
}

export function AchievementToastQueue({ queue, onDismiss }: AchievementToastQueueProps) {
  return (
    <div
      className="pointer-events-none fixed flex flex-col gap-2"
      style={{
        top: 80,
        right: 16,
        zIndex: 120,
        maxWidth: 340,
      }}
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {queue.map((achievement) => (
          <AchievementToast
            key={achievement.id}
            achievement={achievement}
            onDismiss={() => onDismiss(achievement.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
