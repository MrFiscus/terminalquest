import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getRoom } from "@/game/dungeon";
import type { GameState } from "@/game/types";

interface GameWorldProps {
  state: GameState;
}

const TILE = 44;

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
              isEdge && !door ? "bg-wall" : "bg-floor",
              isEdge && !door && "shadow-[inset_0_-2px_0_hsl(var(--wall-edge))]",
              !isEdge && (x + y) % 2 === 0 && "bg-floor-alt",
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
    <div className="relative flex h-full flex-col bg-background">
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
        {/* Pure black surround = unvisited darkness */}
        <div
          className="relative"
          style={{
            width: boardW,
            height: boardH,
            boxShadow: "var(--shadow-room)",
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

          {/* Files (items) */}
          {room.files.map((f) => (
            <div
              key={f.name}
              className="pointer-events-none absolute flex items-center justify-center item-float"
              style={{
                left: f.x * TILE,
                top: f.y * TILE,
                width: TILE,
                height: TILE,
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
          ))}

          {/* Player */}
          <div
            className="pointer-events-none absolute flex items-center justify-center transition-[left,top] duration-100 ease-linear player-bob"
            style={{
              left: state.player.x * TILE,
              top: state.player.y * TILE,
              width: TILE,
              height: TILE,
            }}
          >
            <div
              className="h-7 w-7 rounded-sm border-2 border-stone-dark bg-player shadow-[0_0_10px_hsl(var(--player)/0.7)]"
              aria-label="player"
            />
          </div>

          {/* Vignette glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 35%, hsl(var(--background) / 0.85) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
