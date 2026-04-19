import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getRoom } from "@/game/dungeon";
import { PlayerSprite } from "@/components/PlayerSprite";
import { MauSprite } from "@/components/MauSprite";
import { ScrollPopup } from "@/components/ScrollPopup";
import scrollItem from "@/assets/scroll-item.png";
import type { DecorKind, GameState, Room, VfxPulse } from "@/game/types";

interface GameWorldProps {
  state: GameState;
  onDismissPopup: () => void;
  headerRight?: ReactNode;
}

const MIN_TILE = 24;
const MAX_TILE = 96;

function edist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function smoothLight(d: number, radius: number) {
  if (d >= radius) return 0;
  const t = 1 - d / radius;
  return Math.max(0, Math.min(1, t * t));
}

function brightnessFor(d: number): number {
  return Math.max(0.38, smoothLight(d, 5.5));
}

function vfxKindFor(vfx: VfxPulse[], x: number, y: number) {
  for (let i = vfx.length - 1; i >= 0; i--) {
    if (vfx[i].cells.some((c) => c.x === x && c.y === y)) return vfx[i].kind;
  }
  return null;
}

function visualHash(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const elementAsset = (name: string) => `/assets/dungeon/elements/${name}.png`;
const newAsset = (name: string) => `/assets/dungeon/new/${name}.png`;

// ------------------------------------------------------------------
// WALL TILE SELECTION
// ------------------------------------------------------------------
// Every wall cell renders exactly one wall asset. Corners use Corner-Wall,
// torch positions use Engraved-Torch-Wall, everything else is Normal-Wall
// with Fancy/Symbol variants only on the top wall (their Greek-key border
// sits at the bottom of the tile, which only reads correctly up there).
function pickWallSprite(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
): { src: string; transform?: string } {
  const isLeftEdge = x === 0;
  const isRightEdge = x === width - 1;
  const isTopEdge = y === 0;
  const isBottomEdge = y === height - 1;

  const isCorner =
    (isLeftEdge || isRightEdge) && (isTopEdge || isBottomEdge);

  // -------------------------------------------------------------------
  // CONTINUOUS OUTER BORDER
  // -------------------------------------------------------------------
  // All outer-ring tiles render as composite Top-Soil blocks so the edge
  // matches the interior soil/wall style. The wall seam of Top-Soil-Wall
  // always points toward the room interior, produced by rotation:
  //   TOP    → natural                (wall seam at bottom, faces down/in)
  //   BOTTOM → rotate(180deg)         (wall seam at top, faces UP/in — south fix)
  //   LEFT   → rotate(-90deg)         (wall seam on right, faces right/in)
  //   RIGHT  → rotate(90deg)          (wall seam on left, faces left/in)
  // The 4 outer corners are pure soil — no wall seam anywhere.
  // Deterministic per position; no RNG on edge tiles.

  if (isCorner) {
    if (isTopEdge && isLeftEdge) return { src: newAsset("Top-Corner-Wall") };
    if (isTopEdge && isRightEdge) return { src: newAsset("Top-Corner-Wall"), transform: "scaleX(-1)" };
    if (isBottomEdge && isLeftEdge) return { src: newAsset("Top-Corner-Wall") };
    return { src: newAsset("Top-Corner-Wall"), transform: "scaleX(-1)" };
  }
  if (isTopEdge)    return { src: newAsset("Top-Soil-Wall") };
  if (isBottomEdge) return { src: newAsset("Top-Soil-Wall") };
  if (isLeftEdge)   return { src: newAsset("Top-Soil-Start"), transform: "scaleX(-1)" };
  if (isRightEdge)  return { src: newAsset("Top-Soil-Start") };

  return { src: elementAsset("Normal-Wall") };
}

// ------------------------------------------------------------------
// FLOOR TILE SELECTION
// ------------------------------------------------------------------
function floorSpriteFor(x: number, y: number, seed: number) {
  const roll = (x * 5 + y * 13 + seed) % 41;
  if (roll === 0) return elementAsset("Floor-Crack");
  if (roll === 17) return elementAsset("Inscribed-Floor");
  return elementAsset("Floor-Plain");
}

// ------------------------------------------------------------------
// DECOR SPRITE SELECTION
// ------------------------------------------------------------------
// Crates rotate through three wooden variants so clusters don't look cloned.
function crateVariant(x: number, y: number, seed: number): string {
  const roll = (x * 19 + y * 31 + seed * 7) % 3;
  if (roll === 0) return newAsset("Broken-Crate");
  if (roll === 1) return newAsset("Double-Broken-Box");
  return newAsset("Box");
}

function barrelVariant(x: number, y: number, seed: number): string {
  // Single barrel sprite, but the New pack's Barrel.png already shows two.
  return newAsset("Barrel");
}

function decorSpriteFor(kind: DecorKind, x: number, y: number, seed: number): string {
  switch (kind) {
    case "barrel":      return barrelVariant(x, y, seed);
    case "crate":       return crateVariant(x, y, seed);
    case "chest":
    case "chest-full":  return elementAsset("Chest-Full");
    case "chest-empty": return elementAsset("Chest-Empty");
    case "crack":       return elementAsset("Floor-Crack");
    case "inscribed-floor": return elementAsset("Inscribed-Floor");
    case "ladder":      return "/assets/dungeon/props/ladder.png";
    case "lamp":        return elementAsset("Torch");
    case "pillar":      return elementAsset("Pillar");
    case "banner":      return elementAsset("Banner");
    case "sack":        return "/assets/dungeon/props/sack.png";
    case "statue":      return elementAsset("Statue");
    default:            return `/assets/dungeon/props/${kind}.png`;
  }
}

function decorSizeClass(kind: DecorKind): string {
  if (kind === "statue")       return "h-[125%] w-[105%]";
  if (kind === "pillar")       return "h-[180%] w-[110%]";
  if (kind === "banner")       return "h-[160%] w-[115%]";
  if (kind === "ladder")       return "h-[140%] w-[78%]";
  if (kind === "chest" || kind === "chest-full" || kind === "chest-empty") return "h-[105%] w-[108%]";
  if (kind === "barrel")       return "h-[112%] w-[108%]";
  if (kind === "crate")        return "h-[105%] w-[102%]";
  return "h-[92%] w-[92%]";
}

function isFloorFeature(kind: DecorKind): boolean {
  return kind === "crack" || kind === "inscribed-floor" || kind === "water";
}

function isWallOnlyDecor(kind: DecorKind): boolean {
  // Architectural decor has its own overlay passes, never rendered as a
  // standing floor prop.
  return (
    kind === "banner" ||
    kind === "pillar" ||
    kind === "interior-wall" ||
    kind === "interior-door"
  );
}

function floorFeatureStyle(kind: DecorKind): CSSProperties | null {
  if (kind === "crack" || kind === "inscribed-floor") {
    return { width: "100%", height: "100%", opacity: kind === "crack" ? 0.8 : 0.72 };
  }
  if (kind === "water") {
    return {
      width: "96%",
      height: "86%",
      opacity: 0.72,
      borderRadius: "22%",
      background:
        "radial-gradient(ellipse at 45% 45%, rgba(122,180,200,0.72), rgba(43,99,122,0.64) 55%, rgba(20,48,64,0.5) 80%)",
      boxShadow: "inset 0 0 10px rgba(188,230,245,0.35), inset 0 0 20px rgba(18,40,55,0.45)",
    };
  }
  return null;
}

// ------------------------------------------------------------------
// TOP-WALL SOIL OVERHANG — tile semantics
// ------------------------------------------------------------------
// Soil-1 / Soil-2            → pure dirt, NO wall seam. Never used at a
//                              wall edge or over a wall cap.
// Top-Soil-Corner-Wall        → soil with a wall corner baked in. Terminates
//                              a soil run at its left/right end.
// Top-Soil-Wall / -Start-2    → soil with a wall seam along the bottom edge.
//                              This is what caps an actual wall tile.
// Top-Soil-Start              → soil with a vertical wall down one side —
//                              for perpendicular wall-into-soil transitions.
//
// Only the TOP wall gets the earthen soil cap — that side is the primary
// presentation direction. Left / right / bottom stay plain so the
// composition reads from one coherent viewing angle.

/** MIDDLE of a soil strip — picks a wall-capped variant (has bottom seam). */
function topSoilCapTile(seed: number, k: number): string {
  return (seed + k) % 2 === 0 ? newAsset("Top-Soil-Wall") : newAsset("Top-Soil-Start-2");
}

/** END of a soil strip — corner variant, flipped for the left end. */
function topSoilCornerTile(end: "left" | "right"): { src: string; transform?: string } {
  return end === "left"
    ? { src: newAsset("Top-Soil-Corner-Wall"), transform: "scaleX(-1)" }
    : { src: newAsset("Top-Soil-Corner-Wall") };
}

// (topWallSoilPieces removed — the in-grid outer ring is now rendered with
// Top-Soil-Wall composite tiles directly, so a separate overhang overlay
// would double-up the soil on the top edge.)

// Interior walls come from the generator as decor items with kind
// "interior-wall". The renderer just paints them.

// Pillar positions come from the generator (decor with kind "pillar"). The
// renderer just reads them back and decides which get banners.

// ------------------------------------------------------------------
// DOOR OVERLAY STYLE
// ------------------------------------------------------------------
function doorSide(x: number, y: number, width: number, height: number) {
  if (y === 0) return "top" as const;
  if (y === height - 1) return "bottom" as const;
  if (x === 0) return "left" as const;
  if (x === width - 1) return "right" as const;
  return "top" as const;
}

function doorOverlayStyle(x: number, y: number, width: number, height: number, tileW: number, tileH: number): CSSProperties {
  const side = doorSide(x, y, width, height);
  // Keep door tight to the tile so it reads as an opening IN the wall,
  // not a cabinet sitting in front of it.
  const w = tileW * 0.88;
  const h = tileH * 1.05;
  const base: CSSProperties = {
    position: "absolute",
    width: w,
    height: h,
    imageRendering: "pixelated",
    filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.8))",
  };

  if (side === "top") {
    return {
      ...base,
      left: x * tileW + tileW / 2,
      top: y * tileH + tileH * 0.42,
      transform: "translateX(-50%)",
    };
  }
  if (side === "bottom") {
    return {
      ...base,
      left: x * tileW + tileW / 2,
      top: y * tileH + tileH * 0.42,
      transform: "translateX(-50%)",
    };
  }
  if (side === "left") {
    return {
      ...base,
      left: x * tileW + tileW * 0.06,
      top: y * tileH + tileH / 2,
      transform: "translateY(-50%)",
    };
  }
  // right
  return {
    ...base,
    left: x * tileW + tileW * 0.06,
    top: y * tileH + tileH / 2,
    transform: "translateY(-50%)",
  };
}

function doorLabelStyle(x: number, y: number, width: number, height: number, tileW: number, tileH: number): CSSProperties {
  const side = doorSide(x, y, width, height);
  const base: CSSProperties = { opacity: 1, zIndex: 30 };
  if (side === "left") return { ...base, left: x * tileW + tileW + 4, top: y * tileH + tileH / 2 - 8 };
  if (side === "right") return { ...base, left: x * tileW - 4, top: y * tileH + tileH / 2 - 8 };
  if (side === "bottom") return { ...base, left: x * tileW + tileW / 2, top: y * tileH + tileH + 2 };
  return { ...base, left: x * tileW + tileW / 2, top: y * tileH - 12 };
}

function doorLabelTransform(x: number, y: number, width: number, height: number) {
  const side = doorSide(x, y, width, height);
  if (side === "left") return "translateY(-50%)";
  if (side === "right") return "translate(-100%, -50%)";
  if (side === "bottom") return "translateX(-50%)";
  return "translateX(-50%)";
}

function horizontalBorderWallFaceStyle(
  x: number,
  side: "top" | "bottom",
  roomHeight: number,
  tileW: number,
  tileH: number,
): CSSProperties {
  return {
    left: x * tileW,
    top: (side === "top" ? 0 : roomHeight - 1) * tileH + tileH * 0.55,
    width: tileW,
    height: tileH * 0.95,
    zIndex: 4,
  };
}

// ------------------------------------------------------------------
export function GameWorld({ state, onDismissPopup, headerRight }: GameWorldProps) {
  const room = getRoom(state.rooms, state.cwd);
  const stageRef = useRef<HTMLDivElement>(null);
  const [tileW, setTileW] = useState(44);
  const [tileH, setTileH] = useState(44);
  const roomSeed = useMemo(() => (room ? visualHash(room.path) : 0), [room]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !room) return;
    const compute = () => {
      const r = el.getBoundingClientRect();
      // Leave some vertical space at the top for soil-mound overhang.
      const usableH = r.height - 32;
      const tile = Math.max(
        MIN_TILE,
        Math.min(MAX_TILE, Math.floor(Math.min(r.width / room.width, usableH / room.height))),
      );
      setTileW(tile);
      setTileH(tile);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [room]);

  const torchSet = useMemo(() => {
    if (!room) return new Set<string>();
    return new Set(room.tiles.filter((t) => t.kind === "torch").map((t) => `${t.x},${t.y}`));
  }, [room]);

  const doorByPos = useMemo(() => {
    const map = new Map<string, { x: number; y: number; target: string }>();
    if (room) for (const d of room.doors) map.set(`${d.x},${d.y}`, { x: d.x, y: d.y, target: d.target });
    return map;
  }, [room]);

  const grid = useMemo(() => {
    if (!room) return null;
    const cells: JSX.Element[] = [];
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const isEdge = x === 0 || y === 0 || x === room.width - 1 || y === room.height - 1;
        const doorHere = doorByPos.get(`${x},${y}`);
        const torchHere = torchSet.has(`${x},${y}`);

        cells.push(
          <div
            key={`${x}-${y}`}
            className="relative overflow-visible"
            style={{ width: tileW, height: tileH }}
          >
            {/* Floor (interior tiles only) */}
            {!isEdge && (
              <img
                src={floorSpriteFor(x, y, roomSeed)}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
            )}

            {/* Wall tile — doors replace the wall visually via an overlay. */}
            {isEdge && !doorHere && (() => {
              const pick = pickWallSprite(x, y, room.width, room.height, roomSeed);
              return (
                <img
                  src={pick.src}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    imageRendering: "pixelated",
                    transform: pick.transform,
                  }}
                />
              );
            })()}

            {/* Torch alcove — Engraved-Torch-Wall replaces the wall tile here */}
            {isEdge && torchHere && (x === 0 || x === room.width - 1) && (
              <img
                src={newAsset("Engraved-Torch-Wall")}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover torch-glow"
                style={{
                  imageRendering: "pixelated",
                  transform:
                    y === room.height - 1
                      ? "scaleY(-1)"
                      : x === 0
                        ? "rotate(90deg)"
                        : x === room.width - 1
                          ? "rotate(-90deg)"
                          : undefined,
                }}
              />
            )}

            {/* Base wall under door — keeps continuity so door sits against wall */}
            {isEdge && doorHere && (() => {
              const pick = pickWallSprite(x, y, room.width, room.height, roomSeed);
              return (
                <>
                  <img
                    src={pick.src}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      imageRendering: "pixelated",
                      opacity: 0.92,
                      transform: pick.transform,
                    }}
                  />
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 70%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.38) 55%, transparent 80%)",
                    }}
                  />
                </>
              );
            })()}
          </div>,
        );
      }
    }
    return cells;
  }, [room, roomSeed, doorByPos, torchSet, tileW, tileH]);

  // Pillars come straight from room.decor so generator occupancy guarantees
  // no prop shares a tile with them.
  const pillars = useMemo(() => {
    const list = (room?.decor ?? []).filter((d) => d.kind === "pillar");
    return list.map((p, i) => ({ x: p.x, y: p.y, hasBanner: i % 2 === 0 }));
  }, [room]);

  const interiorWalls = useMemo(
    () => (room?.decor ?? []).filter((d) => d.kind === "interior-wall"),
    [room],
  );
  const interiorDoors = useMemo(
    () => (room?.decor ?? []).filter((d) => d.kind === "interior-door"),
    [room],
  );
  // Both interior-wall AND interior-door cells participate in a "run". We
  // use this set to decide whether a given cap is at an end of its run
  // (corner tile) or in the middle (wall-capped middle tile).
  const interiorRunSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of room?.decor ?? []) {
      if (d.kind === "interior-wall" || d.kind === "interior-door") set.add(`${d.x},${d.y}`);
    }
    return set;
  }, [room]);

  const cellAxis = (x: number, y: number): "h" | "v" => {
    const hasLeft = interiorRunSet.has(`${x - 1},${y}`);
    const hasRight = interiorRunSet.has(`${x + 1},${y}`);
    const hasUp = interiorRunSet.has(`${x},${y - 1}`);
    const hasDown = interiorRunSet.has(`${x},${y + 1}`);
    return hasLeft || hasRight || (!hasUp && !hasDown) ? "h" : "v";
  };

  const runAxis = (x: number, y: number): "h" | "v" => cellAxis(x, y);

  const runPosition = (x: number, y: number, axis = runAxis(x, y)): "left" | "right" | "middle" => {
    const before =
      axis === "h"
        ? interiorRunSet.has(`${x - 1},${y}`) && cellAxis(x - 1, y) === "h"
        : interiorRunSet.has(`${x},${y - 1}`) && cellAxis(x, y - 1) === "v";
    const after =
      axis === "h"
        ? interiorRunSet.has(`${x + 1},${y}`) && cellAxis(x + 1, y) === "h"
        : interiorRunSet.has(`${x},${y + 1}`) && cellAxis(x, y + 1) === "v";
    if (!before && after) return "left";
    if (before && !after) return "right";
    return "middle";
  };

  const interiorCapFor = (x: number, y: number) => {
    const axis = runAxis(x, y);
    const pos = runPosition(x, y, axis);
    const cap =
      pos === "middle"
        ? { src: topSoilCapTile(roomSeed + 53, axis === "h" ? x : y), transform: undefined as string | undefined }
        : topSoilCornerTile(pos);
    if (axis === "h") {
      return {
        axis,
        src: cap.src,
        style: {
          left: "0%",
          top: "-80%",
          width: "100%",
          height: "85%",
          transform: cap.transform,
        } satisfies CSSProperties,
      };
    }
    return {
      axis,
      src: cap.src,
      style: {
        left: "-80%",
        top: "0%",
        width: "85%",
        height: "100%",
        transform: cap.transform ? `${cap.transform} rotate(-90deg)` : "rotate(-90deg)",
      } satisfies CSSProperties,
    };
  };

  const horizontalInteriorCapFor = (x: number, y: number) => {
    const pos = runPosition(x, y, "h");
    const cap =
      pos === "middle"
        ? { src: topSoilCapTile(roomSeed + 53, x), transform: undefined as string | undefined }
        : topSoilCornerTile(pos);
    return {
      src: cap.src,
      style: {
        left: "0%",
        top: "-80%",
        width: "100%",
        height: "85%",
        transform: cap.transform,
      } satisfies CSSProperties,
    };
  };

  const hasVerticalWallAt = (x: number, y: number) =>
    interiorRunSet.has(`${x},${y}`) && cellAxis(x, y) === "v";

  // topSoil overhang removed — outer ring now uses composite Top-Soil-Wall tiles.

  if (!room) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">The void.</div>;
  }

  const TILE = Math.min(tileW, tileH);
  const boardW = room.width * tileW;
  const boardH = room.height * tileH;

  const showMinimap = state.vfx.some((v) => v.kind === "pwd");

  return (
    <div className="relative flex h-full flex-col bg-background stone-tex">
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

      <div className="flex items-center justify-between gap-3 px-4 py-2 iron-header border-b-2 border-[hsl(var(--terminal-frame))] relative z-10">
        <div className="flex flex-col min-w-0">
          <span className="font-pixel carved-gold text-[13px] truncate">{room.name}</span>
          <span className="font-pixel text-[10px] text-parchment mt-1 truncate">{room.path}</span>
        </div>
        {headerRight}
      </div>

      <div ref={stageRef} className="relative flex-1 overflow-hidden grid place-items-center">
        {/* This container handles the stable room key and the one-time entry animation */}
        <div key={state.cwd} className="pixelate-in relative overflow-visible">
          {/* This inner div handles the dynamic command pulses/shakes without re-triggering the blur */}
          <div
            className={cn(
              "relative overflow-visible",
              state.screenEffect?.kind === "error" && "command-error-shake",
              state.screenEffect?.kind === "reveal" && "command-reveal-pulse",
              state.screenEffect?.kind === "create" && "command-create-pulse",
              state.screenEffect?.kind === "traverse" && "command-traverse-pulse",
              state.screenEffect?.kind === "track" && "command-track-pulse",
              state.screenEffect?.kind === "aware" && "command-aware-pulse",
            )}
            style={{
              width: boardW,
              height: boardH,
              background:
                "radial-gradient(circle at 48% 42%, rgba(82,88,98,0.62) 0%, rgba(40,45,52,0.58) 50%, rgba(12,15,20,0.95) 100%)",
              boxShadow: "var(--shadow-pit), inset 0 0 60px 10px rgba(0,0,0,0.35)",
            }}
          >
            {/* ------- Grid: floor + wall tiles ------- */}
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

          {/* (Top-wall soil overhang removed — outer ring tiles now use Top-Soil-Wall composites directly.) */}

          {/* Horizontal borders get a stone face under the dirt lip for depth. */}
          {(["top", "bottom"] as const).flatMap((side) =>
            Array.from({ length: Math.max(0, room.width - 2) }, (_, i) => {
              const x = i + 1;
              const y = side === "top" ? 0 : room.height - 1;
              if (doorByPos.has(`${x},${y}`)) return null;
              const hasTorch = torchSet.has(`${x},${y}`);
              return (
                <img
                  key={`border-face-${side}-${x}`}
                  src={hasTorch ? newAsset("Engraved-Torch-Wall") : elementAsset("Normal-Wall")}
                  alt=""
                  draggable={false}
                  className={cn("pointer-events-none absolute object-cover", hasTorch && "torch-glow")}
                  style={{
                    ...horizontalBorderWallFaceStyle(x, side, room.height, tileW, tileH),
                    imageRendering: "pixelated",
                    transform: side === "bottom" && hasTorch ? "scaleY(-1)" : undefined,
                    filter: "drop-shadow(0 4px 5px rgba(0,0,0,0.55))",
                  }}
                />
              );
            }),
          )}

          {/* Bottom corner blocks need the same wall face as the bottom run. */}
          {[0, room.width - 1].map((x) => (
            <img
              key={`border-face-bottom-corner-${x}`}
              src={elementAsset("Normal-Wall")}
              alt=""
              draggable={false}
              className="pointer-events-none absolute object-cover"
              style={{
                ...horizontalBorderWallFaceStyle(x, "bottom", room.height, tileW, tileH),
                imageRendering: "pixelated",
                filter: "drop-shadow(0 4px 5px rgba(0,0,0,0.55))",
              }}
            />
          ))}

          {/* ------- Interior wall tiles (from generator decor: kind "interior-wall") ------- */}
          {interiorWalls.map((w) => {
            const cap = interiorCapFor(w.x, w.y);
            if (cap.axis === "v") {
              const connectUp = interiorRunSet.has(`${w.x},${w.y - 1}`);
              const connectDown = interiorRunSet.has(`${w.x},${w.y + 1}`);
              const joinsHorizontalUp = interiorRunSet.has(`${w.x},${w.y - 1}`) && cellAxis(w.x, w.y - 1) === "h";
              const joinsHorizontalDown = interiorRunSet.has(`${w.x},${w.y + 1}`) && cellAxis(w.x, w.y + 1) === "h";
              const pos = runPosition(w.x, w.y, "v");
              const needsEndpointWall = pos !== "middle";
              return (
                <div
                  key={`iw-${w.x}-${w.y}`}
                  className="pointer-events-none absolute"
                  style={{
                    left: w.x * tileW,
                    top: w.y * tileH,
                    width: tileW,
                    height: tileH,
                    zIndex: 6,
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-[2%] left-[8%] right-[8%] rounded-sm"
                    style={{ background: "rgba(0,0,0,0.42)", filter: "blur(6px)" }}
                  />
                  {needsEndpointWall && (
                    <img
                      src={elementAsset("Normal-Wall")}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        imageRendering: "pixelated",
                        transform: "rotate(90deg)",
                        filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.55))",
                      }}
                    />
                  )}
                  <img
                    src={pos === "middle" ? newAsset("Top-Soil-Wall") : newAsset("Top-Soil-Corner-Wall")}
                    alt=""
                    draggable={false}
                    className="absolute h-full w-full object-cover"
                    style={{
                      left: 0,
                      top: 0,
                      imageRendering: "pixelated",
                      transform: pos === "right" ? "rotate(-90deg)" : "rotate(90deg)",
                    }}
                  />
                  {(connectUp || connectDown) && (
                    <span
                      aria-hidden
                      className="absolute left-[18%] right-[18%]"
                      style={{
                        top: connectUp ? "-18%" : undefined,
                        bottom: connectDown ? "-18%" : undefined,
                        height: joinsHorizontalUp || joinsHorizontalDown ? "42%" : "34%",
                        backgroundColor: "rgba(55,48,36,0.72)",
                        backgroundImage: `url(${newAsset("Soil-2")})`,
                        backgroundSize: "cover",
                        imageRendering: "pixelated",
                        boxShadow: "inset 0 0 5px rgba(0,0,0,0.35)",
                      }}
                    />
                  )}
                </div>
              );
            }
            const joinsVerticalUp = hasVerticalWallAt(w.x, w.y - 1);
            const joinsVerticalDown = hasVerticalWallAt(w.x, w.y + 1);
            const isMudOnlyJoint = joinsVerticalUp || joinsVerticalDown;
            const joinsHorizontalLeft = interiorRunSet.has(`${w.x - 1},${w.y}`) && cellAxis(w.x - 1, w.y) === "h";
            const joinsHorizontalRight = interiorRunSet.has(`${w.x + 1},${w.y}`) && cellAxis(w.x + 1, w.y) === "h";
            return (
              <div
                key={`iw-${w.x}-${w.y}`}
                className="pointer-events-none absolute"
                style={{
                  left: w.x * tileW,
                  top: w.y * tileH,
                  width: tileW,
                  height: tileH,
                  zIndex: 6,
                }}
              >
                {isMudOnlyJoint && (
                  <img
                    src={elementAsset("Normal-Wall")}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      imageRendering: "pixelated",
                      filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.45))",
                    }}
                  />
                )}
                {!isMudOnlyJoint && (
                  <>
                    <span
                      aria-hidden
                      className="absolute left-[4%] right-[4%] bottom-[-6%] h-[28%] rounded-sm"
                      style={{ background: "rgba(0,0,0,0.55)", filter: "blur(6px)" }}
                    />
                    <img
                      src={elementAsset("Normal-Wall")}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        imageRendering: "pixelated",
                        transform: cap.axis === "v" ? "rotate(90deg)" : undefined,
                      }}
                    />
                  </>
                )}
                {/* Soil cap — corner variant at run ends, wall-capped variant in the middle. */}
                <img
                  src={isMudOnlyJoint ? newAsset("Soil-2") : cap.src}
                  alt=""
                  draggable={false}
                  className="absolute object-cover"
                  style={{
                    ...(isMudOnlyJoint
                      ? {
                          left: "0%",
                          top: "0%",
                          width: "100%",
                          height: "100%",
                        }
                      : cap.style),
                    imageRendering: "pixelated",
                    filter: isMudOnlyJoint ? "drop-shadow(0 2px 3px rgba(0,0,0,0.45))" : "drop-shadow(0 4px 4px rgba(0,0,0,0.55))",
                  }}
                />
                {isMudOnlyJoint && (
                  <>
                    <img
                      src={newAsset("Soil-2")}
                      alt=""
                      draggable={false}
                      className="absolute object-cover"
                      style={{
                        left: "0%",
                        top: "-72%",
                        width: "100%",
                        height: "82%",
                        imageRendering: "pixelated",
                        filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))",
                      }}
                    />
                    {joinsHorizontalLeft && (
                      <img
                        src={elementAsset("Normal-Wall")}
                        alt=""
                        draggable={false}
                        className="absolute object-cover"
                        style={{
                          left: "0%",
                          top: "0%",
                          width: "34%",
                          height: "100%",
                          imageRendering: "pixelated",
                          filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.45))",
                        }}
                      />
                    )}
                    {joinsHorizontalRight && (
                      <img
                        src={elementAsset("Normal-Wall")}
                        alt=""
                        draggable={false}
                        className="absolute object-cover"
                        style={{
                          right: "0%",
                          top: "0%",
                          width: "34%",
                          height: "100%",
                          imageRendering: "pixelated",
                          filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.45))",
                        }}
                      />
                    )}
                  </>
                )}
                {isMudOnlyJoint && (
                  <span
                    aria-hidden
                    className="absolute left-[16%] right-[16%]"
                    style={{
                      top: joinsVerticalUp ? "-34%" : undefined,
                      bottom: joinsVerticalDown ? "-2%" : undefined,
                      height: "46%",
                      backgroundColor: "rgba(55,48,36,0.72)",
                      backgroundImage: `url(${newAsset("Soil-2")})`,
                      backgroundSize: "cover",
                      imageRendering: "pixelated",
                      boxShadow: "inset 0 0 5px rgba(0,0,0,0.35)",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* ------- Interior doors (archways cut through interior wall runs) ------- */}
          {interiorDoors.map((d) => {
            const cap = horizontalInteriorCapFor(d.x, d.y);
            return (
            <div
              key={`id-${d.x}-${d.y}`}
              className="pointer-events-none absolute"
              style={{
                left: d.x * tileW,
                top: d.y * tileH,
                width: tileW,
                height: tileH,
                zIndex: 6,
              }}
            >
              {/* darkened opening behind the door */}
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 65%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, transparent 80%)",
                }}
              />
              {/* door sprite sits in the opening */}
              <img
                src={elementAsset("Door-Closed")}
                alt=""
                draggable={false}
                className="absolute object-contain"
                style={{
                  left: "6%",
                  top: "0%",
                  width: "88%",
                  height: "105%",
                  imageRendering: "pixelated",
                  filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.75))",
                }}
              />
              {/* Soil cap above the door — continues the run's corner/middle pattern. */}
              <img
                src={cap.src}
                alt=""
                draggable={false}
                className="absolute object-cover"
                style={{
                  ...cap.style,
                  imageRendering: "pixelated",
                  filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.55))",
                }}
              />
            </div>
            );
          })}

          {/* ------- Pillars (from generator decor: kind "pillar", occupying top-row interior tiles) ------- */}
          {pillars.map((p) => (
            <img
              key={`pillar-${p.x}-${p.y}`}
              src={elementAsset("Pillar")}
              alt=""
              draggable={false}
              className="pointer-events-none absolute object-contain"
              style={{
                left: (p.x - 0.05) * tileW,
                top: (p.y - 0.45) * tileH,
                width: tileW * 1.1,
                height: tileH * 1.58,
                imageRendering: "pixelated",
                zIndex: 17,
                filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.8))",
              }}
            />
          ))}

          {/* Banners intentionally disabled — user requested they come off for now. */}

          {/* ------- Doors: large archway overlay at door tiles ------- */}
          {room.doors.map((d) => (
            <img
              key={`door-${d.x}-${d.y}`}
              src={
                d.broken
                  ? elementAsset("Broken_door")
                  : d.locked
                    ? elementAsset("locked_door")
                    : elementAsset("Door-Closed")
              }
              alt={d.target === ".." ? "exit archway" : `${d.target} archway`}
              draggable={false}
              className={cn(
                "pointer-events-none",
                state.screenEffect?.kind === "traverse" && "door-open-pulse",
                state.screenEffect?.kind === "create" && "door-create-pulse",
              )}
              style={{
                ...doorOverlayStyle(d.x, d.y, room.width, room.height, tileW, tileH),
                zIndex: 19,
                filter: d.broken
                  ? "sepia(0.7) brightness(0.55) contrast(1.2) drop-shadow(0 6px 6px rgba(0,0,0,0.85))"
                  : d.locked
                    ? "sepia(0.8) brightness(0.65) drop-shadow(0 6px 6px rgba(0,0,0,0.85))"
                    : undefined,
              }}
            />
          ))}

          {/* ------- Floor-feature decor (water / cracks / inscribed floor) ------- */}
          {(room.decor ?? [])
            .filter((decor) => isFloorFeature(decor.kind))
            .map((decor, index) => {
              const style = floorFeatureStyle(decor.kind);
              if (!style) return null;
              return (
                <div
                  key={`ff-${decor.kind}-${decor.x}-${decor.y}-${index}`}
                  className="pointer-events-none absolute flex items-center justify-center"
                  style={{
                    left: decor.x * tileW,
                    top: decor.y * tileH,
                    width: tileW,
                    height: tileH,
                    zIndex: 3,
                  }}
                >
                  {decor.kind === "water" ? (
                    <span aria-hidden style={style} />
                  ) : (
                    <img
                      src={decorSpriteFor(decor.kind, decor.x, decor.y, roomSeed)}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover"
                      style={{ ...style, imageRendering: "pixelated" }}
                    />
                  )}
                </div>
              );
            })}

          {/* ------- Standing decor (barrels / crates / chests / statues / etc.) ------- */}
          {(room.decor ?? [])
            .filter((decor) => !isFloorFeature(decor.kind) && !isWallOnlyDecor(decor.kind))
            .map((decor, index) => (
              <div
                key={`d-${decor.kind}-${decor.x}-${decor.y}-${index}`}
                className="pointer-events-none absolute flex items-end justify-center"
                style={{
                  left: decor.x * tileW,
                  top: decor.y * tileH,
                  width: tileW,
                  height: tileH,
                  zIndex: 7,
                }}
              >
                <span className="ground-shadow" aria-hidden />
                <img
                  src={decorSpriteFor(decor.kind, decor.x, decor.y, roomSeed)}
                  alt=""
                  draggable={false}
                  className={cn(
                    "object-contain drop-shadow-[0_3px_3px_hsl(0_0%_0%/0.7)]",
                    decorSizeClass(decor.kind),
                  )}
                  style={{
                    imageRendering: "pixelated",
                    transform: `translateY(-${tileH * 0.08}px)`,
                  }}
                />
              </div>
            ))}

          {/* ------- VFX overlay (per-cell) ------- */}
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
              if (k === "ls") return <div key={i} className="vfx-ls-glow" />;
              if (k === "find") return (
                <div key={i} className="vfx-trail flex items-center justify-center text-[16px]">
                  <span style={{ color: "hsl(195 90% 65%)", textShadow: "0 0 8px hsl(195 90% 65%)" }}>◉</span>
                </div>
              );
              if (k === "rm") return (
                <div key={i} className="vfx-smoke flex items-center justify-center text-2xl">
                  <span style={{ color: "hsl(280 60% 70%)", textShadow: "0 0 12px hsl(280 60% 70%)" }}>✦</span>
                </div>
              );
              if (k === "manifest") return <div key={i} className="vfx-manifest" style={{ background: "hsl(var(--gold) / 0.25)" }} />;
              if (k === "inspect") return (
                <div key={i} className="vfx-inspect flex items-center justify-center text-xl">
                  <span style={{ color: "hsl(var(--gold))" }}>🔍</span>
                </div>
              );
              if (k === "pwd") return <div key={i} className="vfx-pulse" style={{ background: "hsl(var(--accent) / 0.45)" }} />;
              if (k === "ghost") return (
                <div key={i} className="vfx-trail flex items-center justify-center text-[14px]">
                  <span style={{ color: "hsl(var(--gold))", textShadow: "0 0 10px hsl(var(--gold))" }}>◆</span>
                </div>
              );
              if (k === "combo") return <div key={i} className="vfx-manifest" style={{ background: "hsl(48 96% 58% / 0.38)" }} />;
              return <div key={i} />;
            })}
          </div>

          {/* ------- Door labels ------- */}
          {room.doors.map((d) => (
            <div
              key={`label-${d.x}-${d.y}`}
              className="pointer-events-none absolute label-float"
              style={doorLabelStyle(d.x, d.y, room.width, room.height, tileW, tileH)}
            >
              <span
                className="label-chip breathe text-[10px] font-bold whitespace-nowrap"
                style={{
                  transform: doorLabelTransform(d.x, d.y, room.width, room.height),
                  display: "inline-block",
                }}
              >
                {d.target === ".." ? "../" : `${d.target}/`}
              </span>
            </div>
          ))}

          {/* ------- Files (items on floor) ------- */}
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
                {f.type === "blocker" || f.type === "key" ? (
                  <span
                    className="relative z-[1] text-3xl"
                    style={{
                      filter: f.type === "key" ? "drop-shadow(0 0 8px hsl(var(--gold)))" : "drop-shadow(0 3px 3px rgba(0,0,0,0.7))",
                    }}
                    aria-hidden
                  >
                    {f.glyph ?? (f.type === "key" ? "🗝" : "🪨")}
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

          {/* ------- Warm torch glow wash ------- */}
          {(() => {
            const torches = room.tiles.filter((t) => t.kind === "torch");
            if (torches.length === 0) return null;
            const warmGlow = torches.map((t) => {
              const cx = (t.x + 0.5) * tileW;
              const cy = (t.y + 0.5) * tileH;
              const r = TILE * 3.4;
              return `radial-gradient(circle at ${cx}px ${cy}px, rgba(255,170,80,0.22) 0px, rgba(255,170,80,0.1) ${r * 0.5}px, rgba(255,170,80,0) ${r}px)`;
            });
            return (
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{ background: warmGlow.join(", "), zIndex: 11 }}
                aria-hidden
              />
            );
          })()}

          {/* ------- Vignette ------- */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 72%, rgba(0,0,0,0.38) 100%)",
              zIndex: 13,
            }}
            aria-hidden
          />

          {/* ------- Player ------- */}
          <motion.div
            className="pointer-events-none absolute"
            initial={false}
            animate={{ left: state.player.x * tileW, top: state.player.y * tileH }}
            transition={{ type: "tween", ease: "linear", duration: 0.1 }}
            style={{ width: tileW, height: tileH, zIndex: 20 }}
          >
            <span className="ground-shadow" aria-hidden />
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center overflow-visible"
              style={{ bottom: 0, width: "100%", height: "100%" }}
            >
              <PlayerSprite anim={state.playerAnim} facing={state.playerFacing} size={TILE} />
            </div>
          </motion.div>

          {/* ------- NPCs ------- */}
          {(room.npcs || []).map((npc) => {
            const dist = Math.abs(state.player.x - npc.x) + Math.abs(state.player.y - npc.y);
            const isNear = dist <= 1;
            return (
              <div
                key={npc.id}
                className="pointer-events-none absolute flex items-end justify-center overflow-visible"
                style={{
                  left: npc.x * tileW,
                  top: npc.y * tileH,
                  width: tileW,
                  height: tileH,
                  zIndex: 20,
                }}
              >
                <span className="ground-shadow" aria-hidden />
                {npc.id === "mau" ? (
                  <MauSprite size={TILE} />
                ) : (
                  <div className="h-8 w-8 bg-purple-500 rounded-full" />
                )}
                
                {/* Proximity Prompt */}
                {isNear && (
                  <div 
                    className="absolute -top-10 left-1/2 -translate-x-1/2 label-chip breathe z-30 whitespace-nowrap"
                    style={{ fontSize: "10px" }}
                  >
                    Press [Enter] to Speak
                  </div>
                )}
              </div>
            );
          })}

          {/* ------- Mini-map ------- */}
          {showMinimap && (
            <div className="pointer-events-none absolute right-2 top-2 animate-fade-in" style={{ zIndex: 30 }}>
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

          {state.popup && (
            <ScrollPopup title={state.popup.title} body={state.popup.body} onDismiss={onDismissPopup} />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
