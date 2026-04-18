import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getRoom } from "@/game/dungeon";
import { PlayerSprite } from "@/components/PlayerSprite";
import { ScrollPopup } from "@/components/ScrollPopup";
import archwayDoor from "@/assets/archway-door.png";
import scrollItem from "@/assets/scroll-item.png";
import type { GameState, VfxPulse } from "@/game/types";

interface GameWorldProps {
  state: GameState;
  onDismissPopup: () => void;
}

const MIN_TILE = 24;
const MAX_TILE = 96;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function edist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

// Smooth radial falloff used for opacity of items/doors/labels.
// Returns 1 at the source and ~0 beyond `radius`.
function smoothLight(d: number, radius: number) {
  if (d >= radius) return 0;
  const t = 1 - d / radius;
  return Math.max(0, Math.min(1, t * t));
}

function brightnessFor(d: number): number {
  // Smooth fade — used for proximity-based UI opacity (labels, items).
  return Math.max(0.18, smoothLight(d, 4.5));
}

function vfxKindFor(vfx: VfxPulse[], x: number, y: number) {
  for (let i = vfx.length - 1; i >= 0; i--) {
    if (vfx[i].cells.some((c) => c.x === x && c.y === y)) return vfx[i].kind;
  }
  return null;
}

export function GameWorld({ state, onDismissPopup }: GameWorldProps) {
  const room = getRoom(state.rooms, state.cwd);
  const stageRef = useRef<HTMLDivElement>(null);
  const [tileW, setTileW] = useState(44);
  const [tileH, setTileH] = useState(44);

  // Measure stage and stretch tiles to fully fill it (no padding, no gaps).
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !room) return;
    const compute = () => {
      const r = el.getBoundingClientRect();
      setTileW(Math.max(1, r.width / room.width));
      setTileH(Math.max(1, r.height / room.height));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [room]);

  const grid = useMemo(() => {
    if (!room) return null;
    const cells = [];
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const isEdge = x === 0 || y === 0 || x === room.width - 1 || y === room.height - 1;
        const door = room.doors.find((d) => d.x === x && d.y === y);
        const torch = room.tiles.find((t) => t.x === x && t.y === y && t.kind === "torch");
        cells.push(
          <div
            key={`${x}-${y}`}
            className={cn(
              "relative",
              isEdge && !door ? "wall-tex wall-brick" : (x + y) % 2 === 0 ? "floor-tex-alt" : "floor-tex",
            )}
            style={{ width: tileW, height: tileH }}
          >
            {door && (
              <img
                src={archwayDoor}
                alt={door.target === ".." ? "exit archway" : `${door.target} archway`}
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                style={{ imageRendering: "pixelated", transform: "scale(1.15)", transformOrigin: "center bottom" }}
              />
            )}
            {torch && (
              <span
                className="absolute inset-0 torch-tex torch-flicker"
                aria-hidden
              />
            )}
          </div>,
        );
      }
    }
    return cells;
  }, [room, tileW, tileH]);

  if (!room) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">The void.</div>;
  }

  // Sprite size scales with the smaller axis so the player remains square.
  const TILE = Math.min(tileW, tileH);
  const boardW = room.width * tileW;
  const boardH = room.height * tileH;

  // Mini-map flash on pwd
  const showMinimap = state.vfx.some((v) => v.kind === "pwd");

  return (
    <div className="relative flex h-full flex-col bg-background floor-tex">
      {/* cd-teleport fade overlay */}
      <AnimatePresence>
        {state.transitioning && (
          <motion.div
            key="fade"
            className="pointer-events-none absolute inset-0 bg-black"
            style={{ zIndex: 50 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 carved-stone-tex border-b-2 border-stone-slab-edge relative z-10">
        <div className="flex flex-col">
          <span className="font-pixel text-[10px] text-primary drop-shadow-[0_1px_0_hsl(0_0%_0%/0.8)]">{room.name}</span>
          <span className="font-pixel text-[8px] text-primary/90 drop-shadow-[0_1px_0_hsl(0_0%_0%/0.8)] mt-1">{room.path}</span>
        </div>
        <span className="font-pixel text-[9px] text-primary/80 drop-shadow-[0_1px_0_hsl(0_0%_0%/0.8)]">TERMINAL · QUEST</span>
      </div>

      {/* Stage — fills the entire right panel, no padding, no gaps */}
      <div
        ref={stageRef}
        className="relative flex-1 overflow-hidden"
      >
        <div
          key={room.path}
          className="relative pixelate-in"
          style={{
            width: boardW,
            height: boardH,
            boxShadow: "var(--shadow-pit)",
          }}
        >
          {/* Tile grid */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${room.width}, ${tileW}px)`,
              gridTemplateRows: `repeat(${room.height}, ${tileH}px)`,
            }}
          >
            {grid}
          </div>

          {/* VFX overlay (per-cell) */}
          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${room.width}, ${tileW}px)`,
              gridTemplateRows: `repeat(${room.height}, ${tileH}px)`,
              zIndex: 8,
            }}
            aria-hidden
          >
            {Array.from({ length: room.width * room.height }).map((_, i) => {
              const x = i % room.width;
              const y = Math.floor(i / room.width);
              const k = vfxKindFor(state.vfx, x, y);
              if (!k) return <div key={i} />;
              if (k === "ls")
                return (
                  <div key={i} className="vfx-pulse" style={{ background: "hsl(var(--torch-glow) / 0.35)" }} />
                );
              if (k === "find")
                return (
                  <div key={i} className="vfx-trail flex items-center justify-center text-[16px]">
                    <span style={{ color: "hsl(195 90% 65%)", textShadow: "0 0 8px hsl(195 90% 65%)" }}>
                      ◉
                    </span>
                  </div>
                );
              if (k === "rm")
                return (
                  <div key={i} className="vfx-smoke flex items-center justify-center text-2xl">
                    <span style={{ color: "hsl(280 60% 70%)", textShadow: "0 0 12px hsl(280 60% 70%)" }}>
                      ✦
                    </span>
                  </div>
                );
              if (k === "manifest")
                return (
                  <div key={i} className="vfx-manifest" style={{ background: "hsl(var(--gold) / 0.25)" }} />
                );
              if (k === "inspect")
                return (
                  <div key={i} className="vfx-inspect flex items-center justify-center text-xl">
                    <span style={{ color: "hsl(var(--gold))" }}>🔍</span>
                  </div>
                );
              if (k === "pwd")
                return (
                  <div key={i} className="vfx-pulse" style={{ background: "hsl(var(--accent) / 0.45)" }} />
                );
              return <div key={i} />;
            })}
          </div>

          {/* Door labels */}
          {room.doors.map((d) => (
            <div
              key={`label-${d.x}-${d.y}`}
              className="pointer-events-none absolute label-float"
              style={{
                left: d.x * tileW + tileW / 2,
                top: d.y * tileH - 14,
                opacity: brightnessFor(dist(state.player.x, state.player.y, d.x, d.y)),
                zIndex: 9,
              }}
            >
              <span className="font-pixel text-[7px] text-parchment whitespace-nowrap rounded bg-stone-slab-edge/85 px-1.5 py-0.5 border border-stone-light/30 shadow-[0_2px_4px_hsl(0_0%_0%/0.6)]">
                {d.target === ".." ? "../" : `${d.target}/`}
              </span>
            </div>
          ))}

          {/* Files (items) */}
          {room.files.map((f) => {
            const b = brightnessFor(dist(state.player.x, state.player.y, f.x, f.y));
            return (
              <div
                key={f.name}
                className="pointer-events-none absolute flex items-center justify-center item-float transition-opacity duration-200"
                style={{
                  left: f.x * tileW,
                  top: f.y * tileH,
                  width: tileW,
                  height: tileH,
                  opacity: b,
                  zIndex: 7,
                }}
                title={f.name}
              >
                <img
                  src={scrollItem}
                  alt={f.name}
                  className="h-[80%] w-[80%] object-contain drop-shadow-[0_0_8px_hsl(var(--gold)/0.55)]"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-pixel text-[7px] text-parchment whitespace-nowrap rounded bg-stone-slab-edge/80 px-1 py-0.5 border border-stone-light/30">
                  {f.name}
                </span>
              </div>
            );
          })}

          {/* Smooth radial darkness overlay — single layer with light sources */}
          {(() => {
            const playerCx = (state.player.x + 0.5) * tileW;
            const playerCy = (state.player.y + 0.5) * tileH;
            const playerR = TILE * 4.2;

            const torches = room.tiles.filter((t) => t.kind === "torch");
            // Each light source punches a soft transparent hole in the dark veil.
            const lightHoles = [
              `radial-gradient(circle at ${playerCx}px ${playerCy}px, transparent 0px, transparent ${playerR * 0.35}px, hsl(0 0% 4% / 0.55) ${playerR * 0.75}px, hsl(0 0% 3% / 0.96) ${playerR}px)`,
              ...torches.map((t) => {
                const cx = (t.x + 0.5) * tileW;
                const cy = (t.y + 0.5) * tileH;
                const r = TILE * 3.2;
                return `radial-gradient(circle at ${cx}px ${cy}px, transparent 0px, transparent ${r * 0.3}px, hsl(0 0% 4% / 0.5) ${r * 0.7}px, hsl(0 0% 3% / 0.96) ${r}px)`;
              }),
            ];

            const warmGlow = [
              `radial-gradient(circle at ${playerCx}px ${playerCy}px, hsl(33 100% 55% / 0.18) 0px, hsl(33 100% 55% / 0.08) ${playerR * 0.5}px, transparent ${playerR}px)`,
              ...torches.map((t) => {
                const cx = (t.x + 0.5) * tileW;
                const cy = (t.y + 0.5) * tileH;
                const r = TILE * 3.2;
                return `radial-gradient(circle at ${cx}px ${cy}px, hsl(33 100% 55% / 0.28) 0px, hsl(33 100% 55% / 0.1) ${r * 0.5}px, transparent ${r}px)`;
              }),
            ];

            return (
              <>
                {/* Deep charcoal void — covers everything outside light circles. */}
                <div
                  className="pointer-events-none absolute inset-0 light-flicker"
                  style={{
                    background: lightHoles.join(", "),
                    backgroundBlendMode: "multiply",
                    transition: "background 240ms ease-out",
                    zIndex: 6,
                  }}
                  aria-hidden
                />
                {/* Warm torch tint — soft orange wash over lit areas. */}
                <div
                  className="pointer-events-none absolute inset-0 light-flicker mix-blend-screen"
                  style={{
                    background: warmGlow.join(", "),
                    transition: "background 240ms ease-out",
                    zIndex: 11,
                  }}
                  aria-hidden
                />
              </>
            );
          })()}

          {/* Player sprite (framer-motion tile movement) */}
          <motion.div
            className="pointer-events-none absolute flex items-center justify-center"
            initial={false}
            animate={{ left: state.player.x * tileW, top: state.player.y * tileH }}
            transition={{ type: "tween", ease: "linear", duration: 0.1 }}
            style={{
              width: tileW,
              height: tileH,
              zIndex: 10,
            }}
          >
            <PlayerSprite anim={state.playerAnim} facing={state.playerFacing} size={Math.min(TILE, 48)} />
          </motion.div>
          {/* Mini-map (pwd flash) */}
          {showMinimap && (
            <div
              className="pointer-events-none absolute right-2 top-2 animate-fade-in"
              style={{ zIndex: 20 }}
            >
              <div
                className="grid gap-0.5 p-1 bg-stone-slab-edge/90 border border-stone-light/40"
                style={{
                  gridTemplateColumns: `repeat(${room.width}, 6px)`,
                  gridTemplateRows: `repeat(${room.height}, 6px)`,
                }}
              >
                {Array.from({ length: room.width * room.height }).map((_, i) => {
                  const x = i % room.width;
                  const y = Math.floor(i / room.width);
                  const isPlayer = x === state.player.x && y === state.player.y;
                  const isEdge = x === 0 || y === 0 || x === room.width - 1 || y === room.height - 1;
                  return (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        background: isPlayer
                          ? "hsl(var(--gold))"
                          : isEdge
                            ? "hsl(var(--stone-light))"
                            : "hsl(var(--floor))",
                        boxShadow: isPlayer ? "0 0 6px hsl(var(--gold))" : undefined,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-1 text-center font-pixel text-[7px] text-parchment">YOU ARE HERE</div>
            </div>
          )}

          {/* Parchment popup (cat) */}
          {state.popup && (
            <ScrollPopup
              title={state.popup.title}
              body={state.popup.body}
              onDismiss={onDismissPopup}
            />
          )}
        </div>
      </div>
    </div>
  );
}
