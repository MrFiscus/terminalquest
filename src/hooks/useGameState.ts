import { useCallback, useEffect, useRef, useState } from "react";
import { runCommand } from "@/game/commands";
import {
  DEFAULT_ROOMS,
  INVENTORY_PATH,
  START_PATH,
  TARGET_FILE,
  getRoom,
  pathfind,
} from "@/game/dungeon";
import type {
  CommandResult,
  GameState,
  PlayerFacing,
  TerminalLine,
} from "@/game/types";

const STEP_MS = 110;
const PICKUP_MS = 520;

function initialState(): GameState {
  const startRoom = DEFAULT_ROOMS[START_PATH];
  return {
    cwd: START_PATH,
    rooms: DEFAULT_ROOMS,
    inventory: [],
    inventoryPath: INVENTORY_PATH,
    targetFile: TARGET_FILE,
    player: { ...startRoom.spawn },
    playerAnim: "idle",
    playerFacing: "down",
    history: [
      { id: 1, kind: "system", text: "Terminal Quest v1.0 — type `help` to begin." },
      { id: 2, kind: "system", text: `You stand in ${startRoom.name}. ${startRoom.description}` },
    ],
    commandHistory: [],
    won: false,
    animating: false,
    transitioning: false,
    vfx: [],
    popup: null,
  };
}

function facingFor(dx: number, dy: number): PlayerFacing | null {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const idRef = useRef(100);
  const stateRef = useRef(state);
  stateRef.current = state;

  const nextId = () => ++idRef.current;

  const appendLines = useCallback((lines: Omit<TerminalLine, "id">[]) => {
    if (!lines.length) return;
    setState((s) => ({
      ...s,
      history: [...s.history, ...lines.map((l) => ({ ...l, id: nextId() }))],
    }));
  }, []);

  const animateWalk = useCallback(
    (target: { x: number; y: number }): Promise<void> => {
      return new Promise((resolve) => {
        const s = stateRef.current;
        const room = getRoom(s.rooms, s.cwd);
        if (!room) return resolve();
        const path = pathfind(room, s.player, target);
        if (!path || path.length === 0) {
          setState((cur) => ({ ...cur, player: { ...target } }));
          return resolve();
        }
        setState((cur) => ({ ...cur, playerAnim: "walking" }));
        let i = 0;
        const step = () => {
          if (i >= path.length) {
            setState((cur) => ({ ...cur, playerAnim: "idle" }));
            return resolve();
          }
          const tile = path[i++];
          setState((cur) => {
            const dx = tile.x - cur.player.x;
            const dy = tile.y - cur.player.y;
            const f = facingFor(dx, dy);
            return {
              ...cur,
              player: { x: tile.x, y: tile.y },
              playerFacing: f ?? cur.playerFacing,
            };
          });
          setTimeout(step, STEP_MS);
        };
        step();
      });
    },
    [],
  );

  const animatePickup = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      setState((cur) => ({ ...cur, playerAnim: "pickingUp" }));
      setTimeout(() => {
        setState((cur) => ({ ...cur, playerAnim: "idle" }));
        resolve();
      }, PICKUP_MS);
    });
  }, []);

  const applyEffect = useCallback(
    (effect: NonNullable<CommandResult["effect"]>) => {
      setState((s) => {
        if (effect.type === "enterRoom") {
          const next = getRoom(s.rooms, effect.path);
          if (!next) return s;
          const spawn = effect.from === "child" && next.returnSpawn ? next.returnSpawn : next.spawn;
          return {
            ...s,
            cwd: next.path,
            player: { ...spawn },
            history: [
              ...s.history,
              {
                id: nextId(),
                kind: "system",
                text: `You enter ${next.name}. ${next.description}`,
              },
            ],
          };
        }
        if (effect.type === "pickup") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          const file = room.files.find((f) => f.name === effect.fileName);
          if (!file) return s;
          const newRoom = { ...room, files: room.files.filter((f) => f.name !== effect.fileName) };
          return {
            ...s,
            rooms: { ...s.rooms, [room.path]: newRoom },
            inventory: [...s.inventory, file],
            history: [
              ...s.history,
              { id: nextId(), kind: "output", text: `'${file.name}' is now in ~/inventory.` },
            ],
          };
        }
        if (effect.type === "win") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          const file = room.files.find((f) => f.name === TARGET_FILE);
          if (!file) return s;
          const newRoom = { ...room, files: room.files.filter((f) => f.name !== TARGET_FILE) };
          return {
            ...s,
            rooms: { ...s.rooms, [room.path]: newRoom },
            inventory: [...s.inventory, file],
            won: true,
            history: [
              ...s.history,
              {
                id: nextId(),
                kind: "victory",
                text: "✦ You seize victory.jpg. The dungeon trembles. You have escaped! ✦",
              },
            ],
          };
        }
        return s;
      });
    },
    [],
  );

  const submit = useCallback(
    async (raw: string) => {
      const s = stateRef.current;
      if (s.animating || s.won) return;

      appendLines([{ kind: "input", text: `user@dungeon:${s.cwd}$ ${raw}` }]);

      if (!raw.trim()) return;

      setState((cur) => ({
        ...cur,
        commandHistory: [...cur.commandHistory, raw],
      }));

      const result = runCommand(raw, s);

      if (result.clear) {
        setState((cur) => ({ ...cur, history: [] }));
        return;
      }

      if (result.patch) {
        setState((cur) => ({ ...cur, ...result.patch }));
      }

      // VFX: add then expire
      if (result.vfx) {
        const id = nextId();
        const dur = result.vfx.durationMs ?? 1000;
        const vfx = {
          id,
          kind: result.vfx.kind,
          cells: result.vfx.cells,
          expiresAt: Date.now() + dur,
        };
        setState((cur) => ({ ...cur, vfx: [...cur.vfx, vfx] }));
        setTimeout(() => {
          setState((cur) => ({ ...cur, vfx: cur.vfx.filter((v) => v.id !== id) }));
        }, dur);
      }

      // Popup (cat)
      if (result.popup) {
        const id = nextId();
        setState((cur) => ({ ...cur, popup: { id, ...result.popup! } }));
      }

      appendLines(result.lines);

      if (result.walkTo) {
        setState((cur) => ({ ...cur, animating: true }));
        await animateWalk(result.walkTo);
        if (result.effect && (result.effect.type === "pickup" || result.effect.type === "win")) {
          await animatePickup();
        }
        if (result.effect) applyEffect(result.effect);
        setState((cur) => ({ ...cur, animating: false }));
      } else if (result.effect) {
        applyEffect(result.effect);
      }
    },
    [animateWalk, animatePickup, appendLines, applyEffect],
  );

  const dismissPopup = useCallback(() => {
    setState((cur) => ({ ...cur, popup: null }));
  }, []);

  const reset = useCallback(() => {
    idRef.current = 100;
    setState(initialState());
  }, []);

  useEffect(() => {
    // no-op
  }, []);

  return { state, submit, reset, dismissPopup };
}
