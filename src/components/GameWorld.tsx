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

  // Measure stage and fill the available dungeon panel.
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
        const isWall = isEdge && !door;
        const isAltFloor = !isWall && (x * 7 + y * 13) % 6 === 0;
        cells.push(
          <div
            key={`${x}-${y}`}
            className={cn("relative overflow-hidden", y === 0 && !door ? "wall-cast-shadow" : "")}
            style={{
              width: tileW,
              height: tileH,
              backgroundImage: isWall
                ? "url(/assets/dungeon/tiles/wall.png)"
                : `url(/assets/dungeon/tiles/${isAltFloor ? "floor-alt.png" : "floor.png"})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              boxShadow: isWall
                ? "inset 0 4px 0 hsl(0 0% 100% / 0.10), inset 0 -3px 0 hsl(0 0% 0% / 0.6), inset 0 0 0 1px hsl(0 0% 0% / 0.5)"
                : "inset 0 0 0 1px hsl(0 0% 0% / 0.35)",
            }}
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
              <>
                <span className="ground-shadow" aria-hidden />
                <img
                  src="/assets/dungeon/tiles/torch.png"
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none torch-flicker torch-glow"
                  style={{ imageRendering: "pixelated" }}
                />
              </>
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
    <div className="relative flex h-full flex-col bg-background stone-tex">
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
      <div className="flex items-center justify-between px-4 py-2 carved-stone-tex border-b-2 border-[hsl(var(--terminal-frame))] relative z-10">
        <div className="flex flex-col">
          <span className="font-pixel carved-gold text-[11px]">{room.name}</span>
          <span className="font-pixel text-[8px] text-parchment/70 mt-1 drop-shadow-[0_1px_0_hsl(0_0%_0%/0.8)]">{room.path}</span>
        </div>
        <span className="font-pixel carved-gold text-[10px]">TERMINAL · QUEST</span>
      </div>

      {/* Stage — fills the right panel; dungeon stays a centered square */}
      <div
        ref={stageRef}
        className="relative flex-1 overflow-hidden grid place-items-center"
      >
        <div
          key={room.path}
          className="relative pixelate-in"
          style={{
            width: boardW,
            height: boardH,
            boxShadow:
              "var(--shadow-pit), inset 0 0 120px 40px rgba(0,0,0,0.75), inset 0 0 240px 80px rgba(0,0,0,0.55)",
          }}
        >
          {/* Tile grid */}
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `repeat(${room.width}, ${tileW}px)`,
              gridTemplateRows: `repeat(${room.height}, ${tileH}px)`,
              zIndex: 0,
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
                top: d.y * tileH - 16,
                opacity: brightnessFor(edist(state.player.x, state.player.y, d.x, d.y)),
                zIndex: 30,
              }}
            >
              <span className="label-chip breathe text-[7px]">
                {d.target === ".." ? "../" : `${d.target}/`}
              </span>
            </div>
          ))}

          {/* Torch labels */}
          {room.tiles
            .filter((t) => t.kind === "torch")
            .map((t) => (
              <div
                key={`torch-label-${t.x}-${t.y}`}
                className="pointer-events-none absolute label-float"
                style={{
                  left: t.x * tileW + tileW / 2,
                  top: t.y * tileH - 16,
                  transform: "translateX(-50%)",
                  opacity: brightnessFor(edist(state.player.x, state.player.y, t.x, t.y)),
                  zIndex: 30,
                }}
              >
                <span className="label-chip breathe text-[7px]">torch</span>
              </div>
            ))}

          {/* Files (items) */}
          {room.files.map((f) => {
            const b = brightnessFor(edist(state.player.x, state.player.y, f.x, f.y));
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
                  zIndex: 20,
                }}
                title={f.name}
              >
                <span className="ground-shadow" aria-hidden />
                <img
                  src={scrollItem}
                  alt={f.name}
                  className="h-[80%] w-[80%] object-contain drop-shadow-[0_3px_3px_hsl(0_0%_0%/0.7)] drop-shadow-[0_0_8px_hsl(var(--gold)/0.55)]"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 label-chip breathe text-[7px]">
                  {f.name}
                </span>
              </div>
            );
          })}

          {/* Vignette — transparent center, dark edges. Pointer-events disabled. */}
          <div
            className="pointer-events-none absolute inset-0 light-flicker"
            style={{
              background:
                "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 80%)",
              zIndex: 10,
            }}
            aria-hidden
          />
          {(() => {
            const torches = room.tiles.filter((t) => t.kind === "torch");
            const playerCx = (state.player.x + 0.5) * tileW;
            const playerCy = (state.player.y + 0.5) * tileH;
            const playerR = TILE * 3.5;
            const warmGlow = [
              `radial-gradient(circle at ${playerCx}px ${playerCy}px, rgba(255,150,50,0.18) 0px, rgba(255,150,50,0.10) ${playerR * 0.55}px, rgba(255,150,50,0) ${playerR}px)`,
              ...torches.map((t) => {
                const cx = (t.x + 0.5) * tileW;
                const cy = (t.y + 0.5) * tileH;
                const r = TILE * 3.2;
                return `radial-gradient(circle at ${cx}px ${cy}px, rgba(255,150,50,0.28) 0px, rgba(255,150,50,0.12) ${r * 0.5}px, rgba(255,150,50,0) ${r}px)`;
              }),
            ];
            return (
              <div
                className="pointer-events-none absolute inset-0 light-flicker mix-blend-screen"
                style={{
                  background: warmGlow.join(", "),
                  transition: "background 240ms ease-out",
                  zIndex: 11,
                }}
                aria-hidden
              />
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
              zIndex: 20,
            }}
          >
            <span className="ground-shadow" aria-hidden />
            <PlayerSprite anim={state.playerAnim} facing={state.playerFacing} size={Math.min(TILE, 48)} />

          </motion.div>
          {/* Mini-map (pwd flash) */}
          {showMinimap && (
            <div
              className="pointer-events-none absolute right-2 top-2 animate-fade-in"
              style={{ zIndex: 30 }}
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
