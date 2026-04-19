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
import {
  askCommandFlavor,
  askDungeonMaster,
  askHintLadder,
  askLevelIntro,
  askLiveDungeonMasterReaction,
  askMistakeCoach,
  askRunReportFeedback,
  classifyTerminalInput,
  sanitizeDungeonMasterReply,
  stripDungeonMasterPrefix,
} from "@/game/aiDungeonMasterService";
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
import { detectCommandCombo } from "@/game/commandCombos";
import { buildVictoryReport, liveMentorReaction } from "@/game/liveMentor";
import { roomFlavor } from "@/game/roomFlavor";
import { levelCompletionLine } from "@/game/levelCompletion";
import { playCommandSound, playFootstep, playGameSound, unlockGameAudio } from "@/game/audio";
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
import { mauKeyQuizForDoor } from "@/game/difficultyMechanics";
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
  PlayMode,
  PlayerFacing,
  TerminalLine,
} from "@/game/types";

const STEP_MS = 180;
const PICKUP_MS = 800;
export const DEMO_CONTEXT = `This is a guided demo dungeon.
The player must complete these steps in order:
1. Type ls to see the room contents
2. When they reach the room with mau type: find mau to locate Mau the cat
5. Mau will ask a quiz question about mkdir
6. Player must answer: mkdir
7. Mau grants mkdir power and tells player about broken door
8. Player navigates to the broken door room using cd
9. Player types: mkdir door to repair the broken door
10. Player cd's through the repaired door
11. Player finds relic.txt inside
12. Player types: mv relic.txt ~/inventory to win
Available commands: ls, cd, cat, mv, mkdir, find, pwd
The target file is relic.txt.
The key NPC is Mau who gives mkdir privilege after quiz.
The obstacle is a broken door that needs mkdir to repair.
If the player has just entered or has not surveyed the room, tell them to type ls first.
Once the player is searching for Mau or reaches Mau's room, tell them to type find mau.
Guide the player toward the next step they need to take.
Be helpful, medieval in tone, and concise.`;

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

interface LoadLevelOptions {
  showcaseMode?: boolean;
  weakCommands?: string[];
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
    completionReport: null,
    playMode: "guided",
    showcaseMode: false,
    hintStage: 0,
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

function isDemoState(state: GameState) {
  return Boolean(state.showcaseMode || state.difficultyValue === 0);
}

export function useGameState(options: UseGameStateOptions = {}) {
  const { onOpenProfile } = options;
  const [state, setState] = useState<GameState>(initialState);
  const [teachingTip, setTeachingTip] = useState<TeachingTip | null>(null);
  const [dungeonMasterTip, setDungeonMasterTip] = useState<string | null>(null);
  const [roomSubtitle, setRoomSubtitle] = useState<string | null>(null);
  const idRef = useRef(100);
  const performanceRef = useRef<PerformanceSummary>(createPerformanceSummary());
  const taughtCommandsRef = useRef(new Set<string>());
  const magicCommandsRef = useRef(new Set<string>());
  const comboRef = useRef(new Set<string>());
  const mentorShownRef = useRef(new Set<string>());
  const mistakeCoachShownRef = useRef(new Set<string>());
  const teachingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomSubtitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTrackerRef = useRef<RunTracker>(createRunTracker());
  const aiReportFeedbackRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const nextId = () => ++idRef.current;

  const completeRun = useCallback((targetFile: string, title = "Dungeon Trial", aiFeedback?: string | null) => {
    const tracker = runTrackerRef.current;
    if (tracker.completed) return null;
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
    const report = buildVictoryReport({
      title,
      durationMs: run.durationMs,
      commands: run.commands,
      mistakes: run.mistakes,
      roomsVisited: run.roomsVisited,
      keysFound: run.keysFound,
      lockedDoorsUnlocked: run.lockedDoorsUnlocked,
    });
    appendRun(run);
    clearActiveRun();
    return aiFeedback ? { ...report, feedback: aiFeedback } : report;
  }, []);

  const showDungeonMasterTip = useCallback((text: string) => {
    const clean = sanitizeDungeonMasterReply(text);
    if (!clean) return;
    setDungeonMasterTip(clean);
  }, []);

  const appendLines = useCallback((lines: Omit<TerminalLine, "id">[]) => {
    if (!lines.length) return;
    const terminalLines = lines.filter((line) => line.kind !== "dm");
    const dmLines = lines.filter((line) => line.kind === "dm");
    if (dmLines.length) {
      showDungeonMasterTip(dmLines.map((line) => stripDungeonMasterPrefix(line.text)).join("\n"));
    }
    if (!terminalLines.length) return;
    setState((s) => ({
      ...s,
      history: [...s.history, ...terminalLines.map((l) => ({ ...l, id: nextId() }))],
    }));
  }, [showDungeonMasterTip]);

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

  const dismissDungeonMasterTip = useCallback(() => {
    setDungeonMasterTip(null);
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
          playFootstep(i);
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
      playGameSound("pickup");
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
        if (next) {
          showRoomSubtitle(next);
          playGameSound("room");
          showDungeonMasterTip(`You enter ${next.name}. ${next.description}`);
          if (stateRef.current.showcaseMode && next.files.some((file) => file.name === stateRef.current.targetFile)) {
            showDungeonMasterTip("Almost there! Type: mv relic.txt ~/inventory");
          }
          const mauIsHere =
            (next.npcs ?? []).some((npc) => npc.id === "mau" || npc.name.toLowerCase() === "mau") ||
            next.files.some((file) => file.name.toLowerCase() === "mau");
          const hasUsedCatMau = stateRef.current.commandHistory.some((command) => command.trim().toLowerCase() === "cat mau");
          if (isDemoState(stateRef.current) && mauIsHere && !hasUsedCatMau) {
            showDungeonMasterTip("A presence stirs nearby. Type: find mau");
          }
        }
      }
      if (effect.type === "pickup") {
        showDungeonMasterTip(`${effect.fileName} is now in ~/inventory.`);
      }
      if (effect.type === "win") {
        showDungeonMasterTip(`You seize ${effect.fileName}.`);
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
            history: s.history,
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
            history: s.history,
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
          if (effect.fileName !== s.targetFile) return s;
          const file = room.files.find((f) => f.name === effect.fileName);
          if (!file) return s;
          if (file.type === "key") return s;
          const report = completeRun(effect.fileName, room.name, aiReportFeedbackRef.current);
          aiReportFeedbackRef.current = null;
          const newRoom = { ...room, files: room.files.filter((f) => f.name !== effect.fileName) };
          const completionMessage = levelCompletionLine(effect.fileName, s.goal);
          return {
            ...s,
            rooms: { ...s.rooms, [room.path]: newRoom },
            inventory: [...s.inventory, file],
            won: true,
            completionMessage,
            completionReport: report,
            history: s.history,
          };
        }
        return s;
      });
    },
    [completeRun, showDungeonMasterTip, showRoomSubtitle],
  );

  const submit = useCallback(
    async (raw: string) => {
      const s = stateRef.current;
      if (s.animating || s.won) return;
      unlockGameAudio();

      appendLines([{ kind: "input", text: `user@dungeon:${s.cwd}$ ${raw}` }]);

      if (!raw.trim()) {
        const room = getRoom(s.rooms, s.cwd);
        const npc = (room?.npcs || []).find(n => n.id === "mau" && isNear(s.player, n));
        if (npc) {
          playGameSound("quiz");
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
          const dungeonDifficulty = s.difficultyValue ?? Math.min(100, Math.max(0, depth * 20));
          const quiz = await generateMauQuiz(dungeonDifficulty, s.mechanic);
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
      const previousCommands = [...runTrackerRef.current.commands];
      const commandName = baseCommand(raw);
      if (commandName) {
        runTrackerRef.current.commands.push(raw.trim());
        if (failed) runTrackerRef.current.mistakes.push(raw.trim());
        saveActiveRun(activeRunFromTracker(runTrackerRef.current, s.targetFile));
      }
      const commandEffect = runCommandEffect(raw, result, failed);
      playCommandSound(raw, result, failed);
      const currentRoom = getRoom(s.rooms, s.cwd);
      const isDemoMode = isDemoState(s);
      const demoScript = isDemoMode ? DEMO_CONTEXT : undefined;
      const sharedAiContext = {
        goal: s.goal,
        requiredCommands: s.requiredCommands,
        winCondition: s.winCondition,
        currentRoom: currentRoom?.name ?? s.cwd.split("/").filter(Boolean).pop() ?? "home",
        currentPath: s.cwd,
        inventory: s.inventory.map((file) => file.name),
        roomFiles: currentRoom?.files.map((file) => file.name) ?? [],
        roomDoors: currentRoom?.doors.map((door) =>
          door.locked ? `${door.target}(locked)` : door.target,
        ) ?? [],
        commandsUsed: Object.keys(s.commandStats ?? {}),
        mistakeCount: s.recentMistakes?.length ?? 0,
        demoScript,
      };
      const brokenDoorFailure =
        failed &&
        commandName === "cd" &&
        result.lines.some((line) => /broken door/i.test(line.text));
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
      const guided = s.playMode !== "real";
      const useAiGuidance = guided;
      const mentorLine = useAiGuidance && !brokenDoorFailure
        ? liveMentorReaction({
            state: s,
            raw,
            failed,
            result,
            commands: runTrackerRef.current.commands,
            mistakes: runTrackerRef.current.mistakes,
            shown: mentorShownRef.current,
          })
        : null;
      const combo = !failed ? detectCommandCombo(previousCommands, raw, result) : null;
      const shouldShowCombo = Boolean(combo && !comboRef.current.has(combo.id));
      if (combo && shouldShowCombo) comboRef.current.add(combo.id);

      if (result.clear) {
        setState((cur) => ({ ...cur, history: [] }));
        return;
      }

      if (result.unknown) {
        if (commandEffect.screen) triggerScreenEffect(commandEffect.screen, 450);
        appendLines([{ kind: "error", text: `command not found: ${result.unknown}` }]);
        const message = await askDungeonMaster(result.unknown, {
          ...sharedAiContext,
        });
        appendLines([{ kind: "dm", text: `Dungeon Master: ${message}` }]);
        if (reaction.line) appendLines([reaction.line]);
        return;
      }

      if (!failed && guided) {
        triggerTeaching(raw);
      }

      if (result.patch) {
        setState((cur) => ({ ...cur, ...result.patch }));
      }

      if (result.vfx && (guided || ["rm", "manifest", "inspect"].includes(result.vfx.kind))) {
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
      const shouldShowMagic =
        guided && !brokenDoorFailure && magicLine && !magicCommandsRef.current.has(magicCommand);
      if (shouldShowMagic) magicCommandsRef.current.add(magicCommand);

      if (commandEffect.screen) {
        triggerScreenEffect(commandEffect.screen, failed ? 450 : 650);
      }

      const aiContext = {
        ...sharedAiContext,
        command: commandName,
        recentCommands: runTrackerRef.current.commands.slice(-8),
        mistakes: runTrackerRef.current.mistakes.slice(-8),
      };
      const resultSummary = result.lines.map((line) => line.text).join(" ").slice(0, 160);
      const isHintCommand = commandName === "hint";
      const aiResultLines =
        guided && isHintCommand && result.lines[0]?.kind === "dm"
          ? [
              {
                ...result.lines[0],
                text: `Dungeon Master: ${await askHintLadder(
                  raw,
                  {
                    ...aiContext,
                    resultSummary,
                    hintStage: (s.hintStage ?? 0) + 1,
                  },
                  result.lines[0].text,
                )}`,
              },
              ...result.lines.slice(1),
            ]
          : result.lines;
      const aiCommandFeedback =
        useAiGuidance && isHintCommand
          ? null
          : useAiGuidance && commandEffect.feedback
          ? {
              ...commandEffect.feedback,
              text: `Dungeon Master: ${await askCommandFlavor(
                raw,
                { ...aiContext, resultSummary },
                commandEffect.feedback.text,
              )}`,
            }
          : commandEffect.feedback;
      const shouldCoachMistake =
        useAiGuidance &&
        failed &&
        !brokenDoorFailure &&
        !isHintCommand &&
        Boolean(commandName) &&
        !mistakeCoachShownRef.current.has(commandName) &&
        result.lines.some((line) => line.kind === "error");
      if (shouldCoachMistake) mistakeCoachShownRef.current.add(commandName);
      const aiMistakeLine = brokenDoorFailure
        ? {
            kind: "dm" as const,
            text: "Dungeon Master: The path is still sealed. Repair the broken door before trying to enter.",
          }
        : shouldCoachMistake
        ? {
            kind: "dm" as const,
            text: `Dungeon Master: ${await askMistakeCoach(
              raw,
              {
                ...aiContext,
                resultSummary,
                eventKind: "failed-command",
              },
              resultSummary || "That command did not match what the dungeon expected.",
            )}`,
          }
        : null;
      const aiMentorLine =
        mentorLine
          ? {
              ...mentorLine,
              text: `Dungeon Master: ${await askLiveDungeonMasterReaction(
                raw,
                {
                  ...aiContext,
                  resultSummary,
                  eventKind: mentorLine.text.replace(/^Dungeon Master:\s*/i, "").slice(0, 80),
                },
                mentorLine.text,
              )}`,
            }
          : null;
      const wizardPrompt =
        s.showcaseMode && !failed
          ? commandName === "ls" || (commandName === "find" && raw.toLowerCase().includes("mau"))
            ? (currentRoom?.npcs ?? []).some((npc) => npc.id === "mau")
              ? "Mau's eyes glimmer. Speak with Mau by typing: cat mau"
              : "A faint pawprint trail appears. Try: find mau"
            : null
          : null;
      if (wizardPrompt) showDungeonMasterTip(wizardPrompt);

      aiReportFeedbackRef.current = null;
      if (guided && result.effect?.type === "win") {
        const completedAt = Date.now();
        const previewReport = buildVictoryReport({
          title: currentRoom?.name ?? "Dungeon Trial",
          durationMs: completedAt - runTrackerRef.current.startedAt,
          commands: runTrackerRef.current.commands,
          mistakes: runTrackerRef.current.mistakes,
          roomsVisited: runTrackerRef.current.visitedRooms.size,
          keysFound: runTrackerRef.current.keysFound,
          lockedDoorsUnlocked: runTrackerRef.current.lockedDoorsUnlocked,
        });
        aiReportFeedbackRef.current = await askRunReportFeedback(
          raw,
          {
            ...aiContext,
            reportFacts: {
              title: previewReport.title,
              time: previewReport.time,
              commandsUsed: previewReport.commandsUsed,
              mistakesMade: previewReport.mistakesMade,
              strongestCommand: previewReport.strongestCommand,
              weakestCommand: previewReport.weakestCommand,
              skillUnlocked: previewReport.skillUnlocked,
              nextLesson: previewReport.nextLesson,
            },
          },
          previewReport.feedback,
        );
      }

      appendLines([
        ...(shouldShowMagic && magicLine ? [magicLine] : []),
        ...aiResultLines,
        ...(useAiGuidance && aiCommandFeedback ? [aiCommandFeedback] : []),
        ...(aiMistakeLine ? [aiMistakeLine] : []),
        ...(shouldShowCombo && combo ? [combo.line] : []),
        ...(aiMentorLine ? [aiMentorLine] : []),
        ...(useAiGuidance && !brokenDoorFailure && reaction.line ? [reaction.line] : []),
      ]);

      if (guided && shouldShowCombo) {
        playGameSound("combo");
        const id = nextId();
        const cells = [{ x: s.player.x, y: s.player.y }];
        setState((cur) => ({ ...cur, vfx: [...cur.vfx, { id, kind: "combo", cells, expiresAt: Date.now() + 1500 }] }));
        setTimeout(() => {
          setState((cur) => ({ ...cur, vfx: cur.vfx.filter((v) => v.id !== id) }));
        }, 1500);
      }

      if (result.openProfile) {
        playGameSound("profile");
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
              applyEffect(result.effect);
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
    comboRef.current.clear();
    mentorShownRef.current.clear();
    mistakeCoachShownRef.current.clear();
    setDungeonMasterTip(null);
    dismissTeaching();
    dismissRoomSubtitle();
    clearActiveRun();
    setState(initialState());
  }, [dismissTeaching, dismissRoomSubtitle]);

  const loadLevel = useCallback((
    level: GeneratedLevel,
    label: string,
    adaptation?: string | null,
    playMode: PlayMode = "guided",
    options: LoadLevelOptions = {},
  ) => {
    const patch = levelToStatePatch(level);
    playGameSound("room");
    idRef.current = 100;
    const difficulty = label.split(/\s+/)[0]?.toLowerCase() || "default";
    runTrackerRef.current = createRunTracker(difficulty);
    saveActiveRun(activeRunFromTracker(runTrackerRef.current, level.targetFile));
    dismissRoomSubtitle();
    if (adaptation) showDungeonMasterTip(adaptation);
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
      completionReport: null,
      playMode,
      showcaseMode: options.showcaseMode ?? false,
      hintStage: 0,
      history: [],
    }));
    if (playMode === "guided") {
      const fallbackIntro =
        options.showcaseMode
          ? "The dungeon whispers: type ls to survey your surroundings."
          : adaptation || "This dungeon adapts to your command history. Start with ls.";
      if (options.showcaseMode) {
        showDungeonMasterTip(fallbackIntro);
      } else {
        void askLevelIntro(
          label,
          {
            goal: level.goal,
            requiredCommands: level.required,
            winCondition: `mv ${level.targetFile} ~/inventory`,
            weakCommands: options.weakCommands ?? [],
            eventKind: "adaptive-level",
          },
          fallbackIntro,
        ).then((message) => {
          appendLines([{ kind: "dm", text: `Dungeon Master: ${message}` }]);
        });
      }
    }
  }, [appendLines, dismissRoomSubtitle, showDungeonMasterTip]);

  useEffect(() => {
    // no-op
  }, []);

  const startMauQuiz = useCallback((quiz: MauQuiz) => {
    playGameSound("quiz");
    setState((s) => ({ ...s, activeMauQuiz: quiz }));
  }, []);

  const closeMauQuiz = useCallback(() => {
    playGameSound("clear");
    setState((s) => ({ ...s, activeMauQuiz: undefined }));
  }, []);

  const openScroll = useCallback((name: string, contents: string) => {
    playGameSound("scroll");
    setState((s) => ({ ...s, activeScroll: { name, contents } }));
  }, []);

  const closeScroll = useCallback(() => {
    playGameSound("clear");
    setState((s) => ({ ...s, activeScroll: undefined }));
  }, []);

  const submitMauQuiz = useCallback((answer: string) => {
    const s = stateRef.current;
    if (!s.activeMauQuiz) return;

    const isCorrect = answer.trim().toLowerCase() === s.activeMauQuiz.answer.toLowerCase();
    appendLines([{ kind: "input", text: `> ${answer}` }]);
    
    if (isCorrect) {
      playGameSound("unlock");
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
        ...(reward
          ? [{ kind: "dm" as const, text: `Dungeon Master: ${mechanicMessages[reward] ?? `${reward} is now usable.`}` }]
          : []),
      ]);
      if (s.showcaseMode && reward === "mkdir") {
        showDungeonMasterTip("The stones listen: type mkdir door to mend the doorway.");
      }
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
      playGameSound("error");
      appendLines([{ kind: "npc", text: "Mau: \"Not quite. Try again, little fox.\"" }]);
      triggerScreenEffect("error", 800);
    }
  }, [appendLines, applyEffect, showDungeonMasterTip, triggerScreenEffect]);

  return { 
    state, 
    submit, 
    reset, 
    dismissPopup, 
    loadLevel, 
    teachingTip, 
    dismissTeaching, 
    dungeonMasterTip,
    dismissDungeonMasterTip,
    roomSubtitle,
    submitMauQuiz,
    closeMauQuiz,
    openScroll,
    closeScroll
  };
}
