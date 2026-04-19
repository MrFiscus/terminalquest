import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getRoom } from "@/game/dungeon";
import { PlayerSprite } from "@/components/PlayerSprite";
import { ScrollPopup } from "@/components/ScrollPopup";
import archwayDoor from "@/assets/archway-door.png";
import scrollItem from "@/assets/scroll-item.png";
import type { DecorKind, GameState, VfxPulse } from "@/game/types";

interface GameWorldProps {
  state: GameState;
  onDismissPopup: () => void;
  headerRight?: ReactNode;
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
  return Math.max(0.38, smoothLight(d, 5.5));
}

function vfxKindFor(vfx: VfxPulse[], x: number, y: number) {
  for (let i = vfx.length - 1; i >= 0; i--) {
    if (vfx[i].cells.some((c) => c.x === x && c.y === y)) return vfx[i].kind;
  }
  return null;
}

function wallTransform(x: number, y: number, width: number, height: number) {
  if (x === 0) return "scaleX(-1)";
  if (y === height - 1) return "scaleY(-1)";
  if (x === width - 1) return "none";
  return y === 0 ? "none" : undefined;
}

function floorTint(x: number, y: number) {
  if ((x * 13 + y * 7) % 17 === 0) return "rgba(255,255,255,0.035)";
  if ((x * 5 + y * 11) % 19 === 0) return "rgba(0,0,0,0.06)";
  return "transparent";
}

const decorSpriteFor = (kind: DecorKind) => `/assets/dungeon/props/${kind}.png`;

function floorFeatureStyle(kind: DecorKind): CSSProperties | null {
  if (kind === "crack") {
    return {
      width: "76%",
      height: "42%",
      opacity: 0.5,
      transform: "rotate(-8deg)",
      background:
        "linear-gradient(150deg, transparent 0 42%, rgba(8,9,12,0.7) 43% 47%, transparent 48% 100%), linear-gradient(32deg, transparent 0 58%, rgba(8,9,12,0.55) 59% 62%, transparent 63% 100%)",
      filter: "blur(0.2px)",
    };
  }
  if (kind === "water") {
    return {
      width: "86%",
      height: "56%",
      opacity: 0.5,
      borderRadius: "45%",
      background:
        "radial-gradient(ellipse at 45% 45%, rgba(84,147,169,0.52), rgba(29,73,93,0.38) 58%, rgba(12,27,38,0) 72%)",
      boxShadow: "inset 0 0 8px rgba(166,220,235,0.22)",
    };
  }
  return null;
}

export function GameWorld({ state, onDismissPopup, headerRight }: GameWorldProps) {
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
      const tile = Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(Math.min(r.width / room.width, r.height / room.height))));
      setTileW(tile);
      setTileH(tile);
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
            className={cn("relative overflow-visible", y === 0 && !door ? "wall-cast-shadow" : "")}
            style={{ width: tileW, height: tileH }}
          >
            {!isEdge && !door && (
              <span className="absolute inset-0" style={{ background: floorTint(x, y) }} />
            )}
            {isEdge && !door && (
              <img
                src="/assets/dungeon/tiles/wall.png"
                alt=""
                draggable={false}
                className="absolute inset-[-10%] h-[120%] w-[120%] object-cover opacity-95"
                style={{
                  imageRendering: "pixelated",
                  transform: wallTransform(x, y, room.width, room.height),
                  filter: (x + y) % 9 === 0 ? "brightness(1.18)" : (x * 3 + y) % 11 === 0 ? "brightness(0.78)" : undefined,
                }}
              />
            )}
            {door && (
              <span
                className="absolute inset-0"
                style={{ background: "radial-gradient(circle at 50% 58%, rgba(0,0,0,0.48), transparent 62%)" }}
              />
            )}
            {door && (
              <>
                <img
                  src={archwayDoor}
                  alt={door.target === ".." ? "exit archway" : `${door.target} archway`}
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    bottom: 0,
                    width: "85%",
                    height: "85%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                    transformOrigin: "center bottom",
                    filter: door.locked ? "brightness(0.35) sepia(0.4)" : undefined,
                  }}
                />
                {door.locked && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ bottom: "28%", fontSize: tileW * 0.38, lineHeight: 1, zIndex: 5 }}
                    aria-label="locked"
                  >
                    🔒
                  </span>
                )}
              </>
            )}
            {torch && (
              <>
                <span className="ground-shadow" aria-hidden />
                <img
                  src="/assets/dungeon/tiles/torch.png"
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none torch-glow"
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
  const playerLight = {
    x: (state.player.x + 0.5) * tileW,
    y: (state.player.y + 0.5) * tileH,
    radius: TILE * 4.4,
  };
  const torchLights = room.tiles
    .filter((t) => t.kind === "torch")
    .map((t) => ({
      x: (t.x + 0.5) * tileW,
      y: (t.y + 0.5) * tileH,
      radius: TILE * 3.2,
    }));

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
      {/* Header — single dark-iron bar; difficulty toggles injected from parent via slot */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 iron-header border-b-2 border-[hsl(var(--terminal-frame))] relative z-10">
        <div className="flex flex-col min-w-0">
          <span className="font-pixel carved-gold text-[13px] truncate">{room.name}</span>
          <span className="font-pixel text-[10px] text-parchment mt-1 truncate">{room.path}</span>
        </div>
        {headerRight}
      </div>

      {/* Stage — fills the right panel; dungeon stays a centered square */}
      <div
        ref={stageRef}
        className="relative flex-1 overflow-hidden grid place-items-center"
      >
        <div
          key={room.path}
          className="relative pixelate-in overflow-hidden"
          style={{
            width: boardW,
            height: boardH,
            background:
              "radial-gradient(circle at 48% 42%, rgba(106,113,124,0.66) 0%, rgba(53,59,68,0.58) 46%, rgba(15,17,23,0.94) 100%), linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.22))",
            boxShadow:
              "var(--shadow-pit), inset 0 0 60px 10px rgba(0,0,0,0.25)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 18% 24%, rgba(255,185,89,0.14), transparent 28%), radial-gradient(circle at 82% 28%, rgba(255,220,150,0.08), transparent 26%), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.08) 1px, transparent 1px)",
              backgroundSize: "auto, auto, 54px 54px, 54px 54px",
              zIndex: 0,
            }}
          />
          {/* Tile grid */}
          <div
            className="grid relative pointer-events-none"
            style={{
              gridTemplateColumns: `repeat(${room.width}, ${tileW}px)`,
              gridTemplateRows: `repeat(${room.height}, ${tileH}px)`,
              zIndex: 2,
            }}
          >
            {grid}
          </div>

          {/* Generated room props assembled from individual sprites. */}
          {(room.decor ?? []).map((decor, index) => {
            const featureStyle = floorFeatureStyle(decor.kind);
            return (
              <div
                key={`decor-${decor.kind}-${decor.x}-${decor.y}-${index}`}
                className="pointer-events-none absolute flex items-center justify-center"
                style={{
                  left: decor.x * tileW,
                  top: decor.y * tileH,
                  width: tileW,
                  height: tileH,
                  zIndex: featureStyle ? 3 : 7,
                }}
              >
                {featureStyle ? (
                  <span aria-hidden style={featureStyle} />
                ) : (
                  <img
                    src={decorSpriteFor(decor.kind)}
                    alt=""
                    draggable={false}
                    className={cn(
                      "object-contain drop-shadow-[0_3px_3px_hsl(0_0%_0%/0.65)]",
                      decor.kind === "ladder" ? "h-[150%] w-[80%]" : "h-[88%] w-[88%]",
                    )}
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
              </div>
            );
          })}

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
                  <div key={i} className="relative flex items-center justify-center">
                    <div className="vfx-fire-glow absolute inset-0" aria-hidden />
                    <span className="vfx-fire-flame text-2xl" aria-hidden>🔥</span>
                    <span className="vfx-fire-smoke absolute text-xl" aria-hidden>💨</span>
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
                opacity: 1,
                zIndex: 30,
              }}
            >
              <span className="label-chip breathe text-[10px] font-bold whitespace-nowrap" style={{ transform: "translateX(-50%)", display: "inline-block" }}>
                {d.target === ".." ? "../" : d.locked ? `[locked] ${d.target}/` : `${d.target}/`}
              </span>
            </div>
          ))}

          {/* Files (items) */}
          {room.files.map((f) => {
            const b = brightnessFor(edist(state.player.x, state.player.y, f.x, f.y));
            const isKey = f.type === "key";
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
                {isKey ? (
                  <span
                    style={{
                      fontSize: tileW * 0.5,
                      lineHeight: 1,
                      filter: "drop-shadow(0 0 6px hsl(45 100% 60%))",
                      position: "relative",
                      zIndex: 1,
                    }}
                    aria-label={f.name}
                  >
                    🗝
                  </span>
                ) : (
                  <img
                    src={scrollItem}
                    alt={f.name}
                    className="object-contain drop-shadow-[0_2px_2px_hsl(0_0%_0%/0.6)] drop-shadow-[0_0_6px_hsl(var(--gold)/0.55)]"
                    style={{
                      width: "60%",
                      height: "60%",
                      imageRendering: "pixelated",
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                )}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 label-chip breathe text-[7px]">
                  {f.name}
                </span>
              </div>
            );
          })}

          {/* Soft warm wash — torches add gentle amber light. No flicker, no darkness mask. */}
          {(() => {
            const torches = room.tiles.filter((t) => t.kind === "torch");
            if (torches.length === 0) return null;
            const warmGlow = torches.map((t) => {
              const cx = (t.x + 0.5) * tileW;
              const cy = (t.y + 0.5) * tileH;
              const r = TILE * 3.2;
              return `radial-gradient(circle at ${cx}px ${cy}px, rgba(255,170,80,0.18) 0px, rgba(255,170,80,0.08) ${r * 0.5}px, rgba(255,170,80,0) ${r}px)`;
            });
            return (
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{ background: warmGlow.join(", "), zIndex: 11 }}
                aria-hidden
              />
            );
          })()}

          {/* Subtle edge vignette only — keeps the dungeon bright in the middle. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.35) 100%)",
              zIndex: 13,
            }}
            aria-hidden
          />

          {/* Player sprite (framer-motion tile movement) */}
          <motion.div
            className="pointer-events-none absolute"
            initial={false}
            animate={{ left: state.player.x * tileW, top: state.player.y * tileH }}
            transition={{ type: "tween", ease: "linear", duration: 0.1 }}
            style={{
              width: tileW,
              height: tileH,
              zIndex: 20,
            }}
          >
            {/* Soft ground shadow pinned to floor */}
            <span className="ground-shadow" aria-hidden />
            {/* Knight anchored so feet sit at the bottom of the tile */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center"
              style={{ bottom: 0, width: "100%", height: "100%" }}
            >
              <PlayerSprite anim={state.playerAnim} facing={state.playerFacing} size={Math.min(TILE, 48)} />
            </div>
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
