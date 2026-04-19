import { useCallback, useEffect, useRef, useState } from "react";
import { runCommand } from "@/game/commands";
import {
  createDefaultRooms,
  INVENTORY_PATH,
  START_PATH,
  TARGET_FILE,
  getRoom,
  pathfind,
} from "@/game/dungeon";
import { askDungeonMaster, classifyTerminalInput } from "@/game/aiDungeonMasterService";
import { type GeneratedLevel, levelToStatePatch } from "@/game/aiLevelService";
import {
  createCommandStats,
  commandFromInput,
  recordCommandAttempt,
  rememberMistake,
} from "@/game/adaptiveDungeon";
import { teachingForCommandInput, type TeachingTip } from "@/game/commandTeaching";
import { magicLineForCommandInput } from "@/game/commandMagic";
import { runCommandEffect } from "@/game/commandEffects";
import { roomFlavor } from "@/game/roomFlavor";
import { levelCompletionLine } from "@/game/levelCompletion";
import {
  appendRun,
  baseCommand,
  clearActiveRun,
  countCommands,
  saveActiveRun,
  type ActiveRunRecord,
  type RunRecord,
} from "@/game/progressStats";
import { generateMauQuiz } from "@/game/mauQuizService";
import { mauKeyQuizForDoor, mauQuizForMechanic } from "@/game/difficultyMechanics";
import {
  createPerformanceSummary,
  personalityReaction,
  updatePerformanceSummary,
  type PerformanceSummary,
} from "@/game/dungeonMasterPersonality";
import type {
  CommandResult,
  GameState,
  LinuxCommand,
  PlayerFacing,
  TerminalLine,
} from "@/game/types";

const STEP_MS = 110;
const PICKUP_MS = 800;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RunTracker {
  difficulty: string;
  startedAt: number;
  commands: string[];
  mistakes: string[];
  visitedRooms: Set<string>;
  keysFound: number;
  lockedDoorsUnlocked: number;
  completed: boolean;
}

interface UseGameStateOptions {
  onOpenProfile?: () => void;
}

function createRunTracker(difficulty = "default"): RunTracker {
  return {
    difficulty,
    startedAt: Date.now(),
    commands: [],
    mistakes: [],
    visitedRooms: new Set([START_PATH]),
    keysFound: 0,
    lockedDoorsUnlocked: 0,
    completed: false,
  };
}

function activeRunFromTracker(tracker: RunTracker, targetFile = TARGET_FILE): ActiveRunRecord {
  return {
    difficulty: tracker.difficulty,
    startedAt: tracker.startedAt,
    updatedAt: Date.now(),
    totalCommands: tracker.commands.length,
    commands: [...tracker.commands],
    commandCounts: countCommands(tracker.commands),
    mistakes: [...tracker.mistakes],
    roomsVisited: tracker.visitedRooms.size,
    lockedDoorsUnlocked: tracker.lockedDoorsUnlocked,
    keysFound: tracker.keysFound,
    targetFile,
  };
}

function initialState(): GameState {
  const rooms = createDefaultRooms();
  const startRoom = rooms[START_PATH];
  // Confirm lock is in the live React state, not just in the module-level constant
  const antechamberDoor = rooms["/home/user/hallway/antechamber"]?.doors.find((d) => d.target === "vault");
  console.log("[initialState] vault door in React state:", JSON.stringify(antechamberDoor));
  return {
    cwd: START_PATH,
    rooms,
    inventory: [],
    inventoryPath: INVENTORY_PATH,
    targetFile: TARGET_FILE,
    player: { ...startRoom.spawn },
    playerAnim: "idle",
    playerFacing: "down",
    history: [
      { id: 1, kind: "system", text: "Terminal Quest v1.0 - type `help` to begin." },
      { id: 2, kind: "system", text: `You stand in ${startRoom.name}. ${startRoom.description}` },
    ],
    commandHistory: [],
    commandStats: createCommandStats(),
    recentMistakes: [],
    won: false,
    animating: false,
    transitioning: false,
    vfx: [],
    screenEffect: null,
    popup: null,
    goal: `Find ${TARGET_FILE} and move it into your inventory.`,
    requiredCommands: ["ls", "cd", "find", "mv"],
    winCondition: `mv ${TARGET_FILE} ~/inventory`,
    completionMessage: null,
    lockedCommands: [],
    mauSecretKnown: false,
  };
}

function facingFor(dx: number, dy: number): PlayerFacing | null {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function isNear(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;
}

export function useGameState(options: UseGameStateOptions = {}) {
  const { onOpenProfile } = options;
  const [state, setState] = useState<GameState>(initialState);
  const [teachingTip, setTeachingTip] = useState<TeachingTip | null>(null);
  const [roomSubtitle, setRoomSubtitle] = useState<string | null>(null);
  const idRef = useRef(100);
  const performanceRef = useRef<PerformanceSummary>(createPerformanceSummary());
  const taughtCommandsRef = useRef(new Set<string>());
  const magicCommandsRef = useRef(new Set<string>());
  const teachingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomSubtitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTrackerRef = useRef<RunTracker>(createRunTracker());
  const stateRef = useRef(state);
  stateRef.current = state;

  const nextId = () => ++idRef.current;

  const completeRun = useCallback((targetFile: string) => {
    const tracker = runTrackerRef.current;
    if (tracker.completed) return;
    tracker.completed = true;
    const completedAt = Date.now();
    const run: RunRecord = {
      id: `${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
      difficulty: tracker.difficulty,
      startedAt: tracker.startedAt,
      completedAt,
      durationMs: completedAt - tracker.startedAt,
      totalCommands: tracker.commands.length,
      commands: [...tracker.commands],
      commandCounts: countCommands(tracker.commands),
      mistakes: [...tracker.mistakes],
      roomsVisited: tracker.visitedRooms.size,
      lockedDoorUnlocked: tracker.lockedDoorsUnlocked > 0,
      lockedDoorsUnlocked: tracker.lockedDoorsUnlocked,
      keysFound: tracker.keysFound,
      targetFile,
    };
    appendRun(run);
    clearActiveRun();
  }, []);

  const appendLines = useCallback((lines: Omit<TerminalLine, "id">[]) => {
    if (!lines.length) return;
    setState((s) => ({
      ...s,
      history: [...s.history, ...lines.map((l) => ({ ...l, id: nextId() }))],
    }));
  }, []);

  const triggerScreenEffect = useCallback((kind: NonNullable<GameState["screenEffect"]>["kind"], durationMs = 650) => {
    const id = nextId();
    setState((s) => ({ ...s, screenEffect: { id, kind } }));
    setTimeout(() => {
      setState((s) => (s.screenEffect?.id === id ? { ...s, screenEffect: null } : s));
    }, durationMs);
  }, []);

  const dismissTeaching = useCallback(() => {
    if (teachingTimerRef.current) {
      clearTimeout(teachingTimerRef.current);
      teachingTimerRef.current = null;
    }
    setTeachingTip(null);
  }, []);

  const triggerTeaching = useCallback((commandInput: string) => {
    const tip = teachingForCommandInput(commandInput);
    if (!tip || taughtCommandsRef.current.has(tip.command)) return;
    taughtCommandsRef.current.add(tip.command);
    setTeachingTip(tip);
    if (teachingTimerRef.current) clearTimeout(teachingTimerRef.current);
    teachingTimerRef.current = setTimeout(() => {
      setTeachingTip(null);
      teachingTimerRef.current = null;
    }, 5200);
  }, []);

  const dismissRoomSubtitle = useCallback(() => {
    if (roomSubtitleTimerRef.current) {
      clearTimeout(roomSubtitleTimerRef.current);
      roomSubtitleTimerRef.current = null;
    }
    setRoomSubtitle(null);
  }, []);

  const showRoomSubtitle = useCallback((room: NonNullable<ReturnType<typeof getRoom>>) => {
    setRoomSubtitle(roomFlavor(room));
    if (roomSubtitleTimerRef.current) clearTimeout(roomSubtitleTimerRef.current);
    roomSubtitleTimerRef.current = setTimeout(() => {
      setRoomSubtitle(null);
      roomSubtitleTimerRef.current = null;
    }, 5000);
  }, []);

  const animateWalk = useCallback(
    (target: { x: number; y: number }): Promise<void> => {
      return new Promise((resolve) => {
        const s = stateRef.current;
        const room = getRoom(s.rooms, s.cwd);
        if (!room) return resolve();
        const path = pathfind(room, s.player, target);
        if (!path || path.length === 0) {
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
      console.log("[applyEffect] called with effect:", JSON.stringify(effect));
      if (effect.type === "enterRoom") {
        const next = getRoom(stateRef.current.rooms, effect.path);
        if (next) showRoomSubtitle(next);
      }

      setState((s) => {
        if (effect.type === "enterRoom") {
          const next = getRoom(s.rooms, effect.path);
          if (!next) return s;

          // Belt-and-suspenders: re-check locked door against live state.
          const targetSegment = effect.path.split("/").pop() ?? "";
          console.log("[applyEffect] effect.wasLocked=", effect.wasLocked);
          console.log("[applyEffect] effect.requiredKey=", effect.requiredKey);
          console.log("[applyEffect] inventory=", s.inventory.map((f) => f.name));
          if (effect.wasLocked && effect.requiredKey) {
            const hasKey = s.inventory.some((f) => f.name === effect.requiredKey);
            console.log(`[applyEffect enterRoom] lock re-check for "${targetSegment}": hasKey=${hasKey}, inventory=[${s.inventory.map((f) => f.name).join(",")}]`);
            if (!hasKey) {
              console.warn(`[applyEffect enterRoom] blocked entry to "${effect.path}" — key "${effect.requiredKey}" not in inventory`);
              return s;
            }
            runTrackerRef.current.lockedDoorsUnlocked += 1;
          }

          const spawn = effect.from === "child" && next.returnSpawn ? next.returnSpawn : next.spawn;
          runTrackerRef.current.visitedRooms.add(next.path);
          saveActiveRun(activeRunFromTracker(runTrackerRef.current, s.targetFile));
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
          if (file.type === "key") runTrackerRef.current.keysFound += 1;
          saveActiveRun(activeRunFromTracker(runTrackerRef.current, s.targetFile));
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
        if (effect.type === "removeFile") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          const file = room.files.find((f) => f.name === effect.fileName);
          if (!file) return s;
          const newRoom = { ...room, files: room.files.filter((f) => f.name !== effect.fileName) };
          return {
            ...s,
            rooms: { ...s.rooms, [room.path]: newRoom },
          };
        }
        if (effect.type === "repairDoor") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          return {
            ...s,
            rooms: {
              ...s.rooms,
              [room.path]: {
                ...room,
                doors: room.doors.map((door) =>
                  door.target === effect.target ? { ...door, broken: false } : door,
                ),
              },
            },
          };
        }
        if (effect.type === "chmodFile") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          return {
            ...s,
            rooms: {
              ...s.rooms,
              [room.path]: {
                ...room,
                files: room.files.map((file) =>
                  file.name === effect.fileName ? { ...file, permissions: "readable" } : file,
                ),
              },
            },
          };
        }
        if (effect.type === "releaseMau") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          const mau = (room.npcs ?? []).find((npc) => npc.id === "mau" && npc.blocksDoorTarget === effect.target);
          if (!mau) return s;
          const candidates = [
            { x: mau.x - 1, y: mau.y },
            { x: mau.x + 1, y: mau.y },
            { x: mau.x, y: mau.y + 1 },
            { x: mau.x, y: mau.y - 1 },
          ];
          const open = candidates.find((candidate) => {
            const tile = room.tiles.find((t) => t.x === candidate.x && t.y === candidate.y);
            return (
              tile?.kind === "floor" &&
              !(s.player.x === candidate.x && s.player.y === candidate.y) &&
              !room.files.some((file) => file.x === candidate.x && file.y === candidate.y) &&
              !(room.npcs ?? []).some((npc) => npc.id !== "mau" && npc.x === candidate.x && npc.y === candidate.y)
            );
          }) ?? { x: mau.x, y: mau.y };
          return {
            ...s,
            rooms: {
              ...s.rooms,
              [room.path]: {
                ...room,
                npcs: (room.npcs ?? []).map((npc) =>
                  npc.id === "mau" ? { ...npc, x: open.x, y: open.y, blocksDoorTarget: undefined } : npc,
                ),
              },
            },
          };
        }
        if (effect.type === "win") {
          const room = getRoom(s.rooms, s.cwd);
          if (!room) return s;
          console.log(`[applyEffect win] triggeredBy="${effect.fileName}" targetFile="${s.targetFile}"`);
          if (effect.fileName !== TARGET_FILE || s.targetFile !== TARGET_FILE) return s;
          if (effect.fileName !== s.targetFile) return s;
          const file = room.files.find((f) => f.name === effect.fileName);
          if (!file) return s;
          if (file.type === "key") return s;
          completeRun(effect.fileName);
          const newRoom = { ...room, files: room.files.filter((f) => f.name !== effect.fileName) };
          const completionMessage = levelCompletionLine(effect.fileName, s.goal);
          return {
            ...s,
            rooms: { ...s.rooms, [room.path]: newRoom },
            inventory: [...s.inventory, file],
            won: true,
            completionMessage,
            history: [
              ...s.history,
              {
                id: nextId(),
                kind: "victory",
                text: `You seize ${effect.fileName}. ${completionMessage}`,
              },
            ],
          };
        }
        return s;
      });
    },
    [completeRun, showRoomSubtitle],
  );

  const submit = useCallback(
    async (raw: string) => {
      const s = stateRef.current;
      if (s.animating || s.won) return;

      appendLines([{ kind: "input", text: `user@dungeon:${s.cwd}$ ${raw}` }]);

      if (!raw.trim()) {
        const room = getRoom(s.rooms, s.cwd);
        const npc = (room?.npcs || []).find(n => n.id === "mau" && isNear(s.player, n));
        if (npc) {
          if (s.mechanic === "chmod" && npc.blocksDoorTarget) {
            if (s.mauSecretKnown) {
              startMauQuiz(mauKeyQuizForDoor(npc.blocksDoorTarget));
              appendLines([
                { kind: "npc", text: "Mau studies the opened scroll in your paws." },
                { kind: "npc", text: "Mau: \"Speak the key the scroll revealed.\"" },
              ]);
              return;
            }
            if (!(s.lockedCommands ?? []).includes("chmod")) {
              appendLines([
                { kind: "npc", text: "Mau guards the way." },
                { kind: "npc", text: "Mau: \"Read the scroll, then tell me its key.\"" },
              ]);
              return;
            }
          }
          const depth = s.cwd.split("/").filter(Boolean).length;
          const dungeonDifficulty = Math.min(100, Math.max(0, depth * 20));
          const quiz = s.mechanic ? mauQuizForMechanic(s.mechanic) : await generateMauQuiz(dungeonDifficulty);
          startMauQuiz(quiz);
          appendLines([
            { kind: "npc", text: "Mau's eyes glow with ancient knowledge." },
            { kind: "npc", text: "Mau: \"Show me your command of the shell, little fox.\"" },
          ]);
        }
        return;
      }

      setState((cur) => ({
        ...cur,
        commandHistory: [...cur.commandHistory, raw],
      }));

      const result = await runCommand(raw, s, { 
        startMauQuiz, 
        submitMauQuiz, 
        closeMauQuiz,
        openScroll,
        closeScroll
      });
      const failed = Boolean(result.unknown || result.lines.some((line) => line.kind === "error"));
      const commandName = baseCommand(raw);
      if (commandName) {
        runTrackerRef.current.commands.push(raw.trim());
        if (failed) runTrackerRef.current.mistakes.push(raw.trim());
        saveActiveRun(activeRunFromTracker(runTrackerRef.current, s.targetFile));
      }
      const commandEffect = runCommandEffect(raw, result, failed);
      const shouldRememberMistake =
        failed &&
        (Boolean(commandFromInput(raw)) ||
          Boolean(result.unknown && classifyTerminalInput(result.unknown) === "command-like"));

      setState((cur) => ({
        ...cur,
        commandStats: recordCommandAttempt(cur.commandStats, raw, failed),
        recentMistakes: shouldRememberMistake ? rememberMistake(cur.recentMistakes, raw) : cur.recentMistakes,
      }));
      performanceRef.current = updatePerformanceSummary(performanceRef.current, raw, failed);
      const reaction = personalityReaction(performanceRef.current, raw);
      performanceRef.current = reaction.summary;

      if (result.clear) {
        setState((cur) => ({ ...cur, history: [] }));
        return;
      }

      if (result.unknown) {
        if (commandEffect.screen) triggerScreenEffect(commandEffect.screen, 450);
        const room = getRoom(s.rooms, s.cwd);
        const message = await askDungeonMaster(result.unknown, {
          goal: s.goal,
          requiredCommands: s.requiredCommands,
          winCondition: s.winCondition,
          currentRoom: room?.name ?? s.cwd.split("/").filter(Boolean).pop() ?? "home",
        });
        appendLines([{ kind: "dm", text: `Dungeon Master: ${message}` }]);
        if (reaction.line) appendLines([reaction.line]);
        return;
      }

      if (!failed) {
        triggerTeaching(raw);
      }

      if (result.patch) {
        setState((cur) => ({ ...cur, ...result.patch }));
      }

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

      if (result.popup) {
        const id = nextId();
        setState((cur) => ({ ...cur, popup: { id, ...result.popup! } }));
      }

      const magicLine = magicLineForCommandInput(raw);
      const magicCommand = raw.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      const shouldShowMagic = magicLine && !magicCommandsRef.current.has(magicCommand);
      if (shouldShowMagic) magicCommandsRef.current.add(magicCommand);

      if (commandEffect.screen) {
        triggerScreenEffect(commandEffect.screen, failed ? 450 : 650);
      }

      appendLines([
        ...(shouldShowMagic && magicLine ? [magicLine] : []),
        ...result.lines,
        ...(commandEffect.feedback ? [commandEffect.feedback] : []),
        ...(reaction.line ? [reaction.line] : []),
      ]);

      if (result.openProfile) {
        onOpenProfile?.();
        return;
      }

      if (result.walkTo) {
        setState((cur) => ({ ...cur, animating: true }));
        await animateWalk(result.walkTo);
        if (result.effect && (result.effect.type === "pickup" || result.effect.type === "win")) {
          await animatePickup();
          if (commandEffect.delayedStateMs) await delay(Math.max(0, commandEffect.delayedStateMs - PICKUP_MS));
        }
        if (result.effect) {
          if (result.effect.type === "enterRoom") {
            const isDifferentRoom = result.effect.path !== s.cwd;
            if (isDifferentRoom) {
              setState((cur) => ({ ...cur, transitioning: true }));
              await delay(260);
              applyEffect(result.effect);
              await delay(80);
              setState((cur) => ({ ...cur, transitioning: false }));
            } else {
              applyEffect(result.effect);
            }
          } else {
            applyEffect(result.effect);
          }
        }
        setState((cur) => ({ ...cur, animating: false }));
      } else if (result.effect) {
        if (commandEffect.delayedStateMs) {
          setState((cur) => ({ ...cur, animating: true }));
          await delay(commandEffect.delayedStateMs);
        }
        applyEffect(result.effect);
        if (commandEffect.delayedStateMs) {
          setState((cur) => ({ ...cur, animating: false }));
        }
      }
    },
    [animateWalk, animatePickup, appendLines, applyEffect, onOpenProfile, triggerTeaching, triggerScreenEffect],
  );

  const dismissPopup = useCallback(() => {
    setState((cur) => ({ ...cur, popup: null }));
  }, []);

  const reset = useCallback(() => {
    idRef.current = 100;
    runTrackerRef.current = createRunTracker();
    performanceRef.current = createPerformanceSummary();
    taughtCommandsRef.current.clear();
    magicCommandsRef.current.clear();
    dismissTeaching();
    dismissRoomSubtitle();
    clearActiveRun();
    setState(initialState());
  }, [dismissTeaching, dismissRoomSubtitle]);

  const loadLevel = useCallback((level: GeneratedLevel, label: string, adaptation?: string | null) => {
    const patch = levelToStatePatch(level);
    idRef.current = 100;
    const difficulty = label.split(/\s+/)[0]?.toLowerCase() || "default";
    runTrackerRef.current = createRunTracker(difficulty);
    saveActiveRun(activeRunFromTracker(runTrackerRef.current, level.targetFile));
    dismissRoomSubtitle();
    const intro: TerminalLine[] = adaptation
      ? [{ id: 1, kind: "dm", text: `Dungeon Master: ${adaptation}` }]
      : [];
    const offset = intro.length;
    setState((s) => ({
      ...s,
      ...patch,
      animating: false,
      transitioning: false,
      playerAnim: "idle",
      playerFacing: "down",
      vfx: [],
      screenEffect: null,
      popup: null,
      commandHistory: [],
      history: [
        ...intro,
        { id: offset + 1, kind: "system", text: `Dungeon loaded: ${label}` },
        { id: offset + 2, kind: "system", text: `Goal: ${level.goal}` },
        { id: offset + 3, kind: "system", text: `Required: ${level.required.join(", ")}` },
        { id: offset + 4, kind: "system", text: `Win: mv ${level.targetFile} ~/inventory` },
        { id: offset + 5, kind: "system", text: level.hint ? `Hint: ${level.hint}` : "Type `ls` to look around." },
      ],
    }));
  }, [dismissRoomSubtitle]);

  useEffect(() => {
    // no-op
  }, []);

  const startMauQuiz = useCallback((quiz: MauQuiz) => {
    setState((s) => ({ ...s, activeMauQuiz: quiz }));
  }, []);

  const closeMauQuiz = useCallback(() => {
    setState((s) => ({ ...s, activeMauQuiz: undefined }));
  }, []);

  const openScroll = useCallback((name: string, contents: string) => {
    setState((s) => ({ ...s, activeScroll: { name, contents } }));
  }, []);

  const closeScroll = useCallback(() => {
    setState((s) => ({ ...s, activeScroll: undefined }));
  }, []);

  const submitMauQuiz = useCallback((answer: string) => {
    const s = stateRef.current;
    if (!s.activeMauQuiz) return;

    const isCorrect = answer.trim().toLowerCase() === s.activeMauQuiz.answer.toLowerCase();
    appendLines([{ kind: "input", text: `> ${answer}` }]);
    
    if (isCorrect) {
      const reward = s.activeMauQuiz.rewardCommand;
      const releaseMauTarget = s.activeMauQuiz.releaseMauTarget;
      const successMessage =
        s.activeMauQuiz.successMessage ??
        (reward === "chmod"
          ? "Mau: I grant you the power of chmod"
          : `Mau: I grant you the power of ${reward ?? "wisdom"}`);
      const nextLocked = reward
        ? (s.lockedCommands ?? []).filter((command) => command !== reward)
        : s.lockedCommands;
      const mechanicMessages: Partial<Record<LinuxCommand, string>> = {
        rm: "The stone blocking the vault can now be removed.",
        mkdir: "You can now repair the broken door.",
        chmod: "There is a scroll nearby. Use chmod +r scroll to read it.",
      };
      saveActiveRun(activeRunFromTracker(runTrackerRef.current, s.targetFile));

      setState(cur => ({
        ...cur,
        lockedCommands: nextLocked,
        activeMauQuiz: {
          ...s.activeMauQuiz!,
          completedMessage: successMessage,
        }
      }));

      appendLines([
        {
          kind: "npc",
          text: successMessage,
        },
        ...(reward ? [{ kind: "output" as const, text: mechanicMessages[reward] ?? `${reward} is now usable.` }] : []),
      ]);
      if (releaseMauTarget) applyEffect({ type: "releaseMau", target: releaseMauTarget });
      triggerScreenEffect("aware", 1200);
      
      const id = nextId();
      setState(cur => ({
        ...cur,
        vfx: [...cur.vfx, { id, kind: "manifest", cells: [{ x: s.player.x, y: s.player.y }], expiresAt: Date.now() + 1500 }]
      }));
      setTimeout(() => {
        setState((s) => ({ ...s, vfx: s.vfx.filter((v) => v.id !== id) }));
      }, 1500);

    } else {
      appendLines([{ kind: "npc", text: "Mau: \"Not quite. Try again, little fox.\"" }]);
      triggerScreenEffect("error", 800);
    }
  }, [appendLines, triggerScreenEffect]);

  return { 
    state, 
    submit, 
    reset, 
    dismissPopup, 
    loadLevel, 
    teachingTip, 
    dismissTeaching, 
    roomSubtitle,
    submitMauQuiz,
    closeMauQuiz,
    openScroll,
    closeScroll
  };
}
