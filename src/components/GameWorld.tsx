import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getRoom } from "@/game/dungeon";
import type { GameState } from "@/game/types";

interface GameWorldProps {
  state: GameState;
}

const TILE = 44;

/** Chebyshev distance — square radius torchlight. */
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** Brightness by distance: ≤2 → 1.0, 3 → 0.5, >3 → 0.1 */
function brightnessFor(d: number): number {
  if (d <= 2) return 1;
  if (d === 3) return 0.5;
  return 0.1;
}

export function GameWorld({ state }: GameWorldProps) {
  const room = getRoom(state.rooms, state.cwd);

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
              isEdge && !door ? "wall-tex" : (x + y) % 2 === 0 ? "floor-tex-alt" : "floor-tex",
              isEdge && !door && "shadow-[inset_0_-2px_0_hsl(var(--wall-edge))]",
            )}
            style={{ width: TILE, height: TILE }}
          >
            {door && (
              <div className="absolute inset-1 flex items-center justify-center bg-door border-2 border-door-frame">
                <span className="font-pixel text-[8px] text-parchment/90">
                  {door.target === ".." ? "◄" : "►"}
                </span>
              </div>
            )}
            {torch && (
              <span
                className="absolute inset-0 flex items-center justify-center text-torch torch-flicker text-lg"
                aria-hidden
              >
                ✦
              </span>
            )}
          </div>,
        );
      }
    }
    return cells;
  }, [room]);

  if (!room) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">The void.</div>;
  }

  const boardW = room.width * TILE;
  const boardH = room.height * TILE;

  return (
    <div className="relative flex h-full flex-col bg-background stone-tex">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-dark border-b border-border">
        <div className="flex flex-col">
          <span className="font-pixel text-[10px] text-primary">{room.name}</span>
          <span className="font-mono-pixel text-xs text-muted-foreground">{room.path}</span>
        </div>
        <span className="font-pixel text-[9px] text-parchment/60">TERMINAL · QUEST</span>
      </div>

      {/* Stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
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
              gridTemplateColumns: `repeat(${room.width}, ${TILE}px)`,
              gridTemplateRows: `repeat(${room.height}, ${TILE}px)`,
            }}
          >
            {grid}
          </div>

          {/* Door labels (above doors, floating) */}
          {room.doors.map((d) => (
            <div
              key={`label-${d.x}-${d.y}`}
              className="pointer-events-none absolute label-float"
              style={{
                left: d.x * TILE + TILE / 2,
                top: d.y * TILE - 14,
                opacity: brightnessFor(dist(state.player.x, state.player.y, d.x, d.y)),
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
                  left: f.x * TILE,
                  top: f.y * TILE,
                  width: TILE,
                  height: TILE,
                  opacity: b,
                }}
                title={f.name}
              >
                <span className="text-xl drop-shadow-[0_0_6px_hsl(var(--item)/0.6)]">
                  {f.glyph ?? "▣"}
                </span>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 font-pixel text-[7px] text-item whitespace-nowrap">
                  {f.name}
                </span>
              </div>
            );
          })}

          {/* Torchlight darkness overlay — per-tile mask */}
          <div
            className="pointer-events-none absolute inset-0 grid light-flicker"
            style={{
              gridTemplateColumns: `repeat(${room.width}, ${TILE}px)`,
              gridTemplateRows: `repeat(${room.height}, ${TILE}px)`,
            }}
            aria-hidden
          >
            {Array.from({ length: room.width * room.height }).map((_, i) => {
              const x = i % room.width;
              const y = Math.floor(i / room.width);
              const d = dist(state.player.x, state.player.y, x, y);
              const b = brightnessFor(d);
              const dark = 1 - b; // 0..0.9
              return (
                <div
                  key={i}
                  style={{
                    background: `hsl(var(--background) / ${dark})`,
                    transition: "background 200ms linear",
                  }}
                />
              );
            })}
          </div>

          {/* Player */}
          <div
            className="pointer-events-none absolute flex items-center justify-center transition-[left,top] duration-100 ease-linear player-bob"
            style={{
              left: state.player.x * TILE,
              top: state.player.y * TILE,
              width: TILE,
              height: TILE,
              zIndex: 10,
            }}
          >
            <div
              className="h-7 w-7 rounded-sm border-2 border-stone-dark bg-player shadow-[0_0_18px_hsl(var(--torch-glow)/0.85)]"
              aria-label="player"
            />
          </div>

          {/* Soft torch vignette around player */}
          <div
            className="pointer-events-none absolute inset-0 light-flicker"
            style={{
              background: `radial-gradient(circle at ${
                (state.player.x + 0.5) * TILE
              }px ${(state.player.y + 0.5) * TILE}px, hsl(var(--torch-glow) / 0.18) 0px, transparent ${
                TILE * 2.5
              }px)`,
              transition: "background 200ms linear",
              zIndex: 11,
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
