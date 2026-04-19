import type { CommandResult } from "./types";

type SoundKind =
  | "step"
  | "door"
  | "pickup"
  | "error"
  | "reveal"
  | "find"
  | "inspect"
  | "manifest"
  | "remove"
  | "combo"
  | "win";

type BrowserAudioContext = AudioContext & {
  webkitAudioContext?: never;
};

let ctx: BrowserAudioContext | null = null;
let master: GainNode | null = null;
let lastStepAt = 0;
let ambienceRequested = false;
let ambienceGain: GainNode | null = null;
let ambienceOscillators: OscillatorNode[] = [];
let ambienceTimer: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): BrowserAudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) {
    ctx = new AudioCtor() as BrowserAudioContext;
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockGameAudio() {
  const audio = getAudioContext();
  if (!audio || audio.state !== "suspended") return;
  void audio.resume().then(() => {
    if (ambienceRequested) ensureAmbience();
  });
}

function ensureAmbience() {
  const audio = getAudioContext();
  if (!audio || !ambienceRequested || ambienceGain) return;

  ambienceGain = audio.createGain();
  ambienceGain.gain.setValueAtTime(0.0001, audio.currentTime);
  ambienceGain.gain.exponentialRampToValueAtTime(0.055, audio.currentTime + 1.8);
  ambienceGain.connect(master ?? audio.destination);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(420, audio.currentTime);
  filter.Q.setValueAtTime(0.8, audio.currentTime);
  filter.connect(ambienceGain);

  const voices: Array<{ frequency: number; type: OscillatorType; detune?: number }> = [
    { frequency: 55, type: "sine" },
    { frequency: 82.41, type: "triangle", detune: -8 },
    { frequency: 110, type: "sine", detune: 6 },
  ];

  ambienceOscillators = voices.map((voice) => {
    const osc = audio.createOscillator();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.frequency, audio.currentTime);
    osc.detune.setValueAtTime(voice.detune ?? 0, audio.currentTime);
    osc.connect(filter);
    osc.start();
    return osc;
  });

  ambienceTimer = setInterval(() => {
    if (!ambienceRequested) return;
    const roll = Math.random();
    if (roll < 0.55) {
      tone(146.83 + Math.random() * 18, 0.65, 0.025, "sine", -12);
      tone(220 + Math.random() * 26, 0.9, 0.018, "triangle", 8, 0.16);
    } else {
      noise(0.9, 0.018, 260 + Math.random() * 180);
    }
  }, 6500);
}

export function startGameAmbience() {
  ambienceRequested = true;
  ensureAmbience();
}

export function stopGameAmbience() {
  ambienceRequested = false;
  const audio = getAudioContext();
  if (ambienceTimer) {
    clearInterval(ambienceTimer);
    ambienceTimer = null;
  }
  if (audio && ambienceGain) {
    ambienceGain.gain.cancelScheduledValues(audio.currentTime);
    ambienceGain.gain.setValueAtTime(Math.max(0.0001, ambienceGain.gain.value), audio.currentTime);
    ambienceGain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.6);
  }
  const oldOscillators = ambienceOscillators;
  const oldGain = ambienceGain;
  ambienceOscillators = [];
  ambienceGain = null;
  setTimeout(() => {
    for (const osc of oldOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped or disconnected.
      }
    }
    oldGain?.disconnect();
  }, 700);
}

function connectGain(audio: AudioContext, start: number, duration: number, volume: number) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(master ?? audio.destination);
  return gain;
}

function tone(
  frequency: number,
  duration: number,
  volume = 0.16,
  type: OscillatorType = "sine",
  detune = 0,
  delay = 0,
) {
  const audio = getAudioContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.setValueAtTime(detune, start);
  osc.connect(connectGain(audio, start, duration, volume));
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function sweep(from: number, to: number, duration: number, volume = 0.14, type: OscillatorType = "sine") {
  const audio = getAudioContext();
  if (!audio) return;
  const start = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
  osc.connect(connectGain(audio, start, duration, volume));
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise(duration: number, volume = 0.08, filterFrequency = 900, delay = 0) {
  const audio = getAudioContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const length = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFrequency, start);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(connectGain(audio, start, duration, volume));
  source.start(start);
  source.stop(start + duration + 0.02);
}

export function playGameSound(kind: SoundKind) {
  unlockGameAudio();
  switch (kind) {
    case "step":
      noise(0.055, 0.09, 420);
      tone(82, 0.045, 0.055, "triangle");
      break;
    case "door":
      sweep(95, 52, 0.34, 0.14, "sawtooth");
      noise(0.28, 0.055, 520, 0.05);
      tone(140, 0.08, 0.045, "square", -8, 0.24);
      break;
    case "pickup":
      tone(520, 0.08, 0.12, "sine");
      tone(780, 0.12, 0.11, "sine", 0, 0.07);
      break;
    case "error":
      tone(110, 0.12, 0.15, "sawtooth");
      tone(95, 0.14, 0.12, "sawtooth", 0, 0.035);
      break;
    case "reveal":
      tone(660, 0.08, 0.08, "triangle");
      tone(880, 0.12, 0.07, "triangle", 0, 0.055);
      tone(1174, 0.15, 0.055, "triangle", 0, 0.12);
      break;
    case "find":
      sweep(360, 960, 0.28, 0.095, "sine");
      tone(1200, 0.1, 0.055, "triangle", 0, 0.22);
      break;
    case "inspect":
      noise(0.18, 0.045, 1800);
      tone(420, 0.09, 0.055, "triangle", 0, 0.08);
      break;
    case "manifest":
      sweep(70, 160, 0.28, 0.12, "triangle");
      noise(0.18, 0.05, 360);
      break;
    case "remove":
      noise(0.34, 0.11, 620);
      sweep(180, 55, 0.22, 0.08, "sawtooth");
      break;
    case "combo":
      tone(392, 0.08, 0.08, "triangle");
      tone(587, 0.08, 0.08, "triangle", 0, 0.06);
      tone(784, 0.14, 0.08, "triangle", 0, 0.12);
      break;
    case "win":
      tone(523, 0.12, 0.1, "triangle");
      tone(659, 0.12, 0.1, "triangle", 0, 0.1);
      tone(784, 0.22, 0.11, "triangle", 0, 0.2);
      tone(1046, 0.28, 0.09, "sine", 0, 0.34);
      break;
  }
}

export function playFootstep(stepIndex: number) {
  const now = Date.now();
  if (now - lastStepAt < 70) return;
  lastStepAt = now;
  tone(stepIndex % 2 === 0 ? 74 : 88, 0.04, 0.045, "triangle");
  noise(0.045, 0.08, stepIndex % 2 === 0 ? 380 : 460);
}

export function playCommandSound(input: string, result: CommandResult, failed: boolean) {
  const command = input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (failed) {
    playGameSound("error");
    return;
  }

  if (result.effect?.type === "enterRoom") playGameSound("door");
  if (result.effect?.type === "removeFile") playGameSound("remove");
  if (result.effect?.type === "win") playGameSound("win");

  if (result.vfx?.kind === "ls" || command === "ls") playGameSound("reveal");
  else if (result.vfx?.kind === "find" || command === "find") playGameSound("find");
  else if (result.vfx?.kind === "inspect" || command === "cat" || command === "file") playGameSound("inspect");
  else if (result.vfx?.kind === "manifest" || command === "mkdir" || command === "touch") playGameSound("manifest");
}
