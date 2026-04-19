import type { CommandResult, ScreenEffect, TerminalLine } from "./types";

export interface CommandEffectPlan {
  feedback?: Omit<TerminalLine, "id">;
  screen?: ScreenEffect["kind"];
  delayedStateMs?: number;
}

const commandName = (input: string) => input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

const feedback: Record<string, string> = {
  ls: "You reveal the contents of the chamber.",
  cd: "You step through the archway...",
  mv: "You lift the relic and carry it with purpose.",
  rm: "The object crumbles into dust.",
  mkdir: "A new passage forms before you.",
  pwd: "You sense your position in the dungeon.",
  find: "A faint trail reveals itself...",
  cat: "The scroll yields its words.",
  file: "You study the object closely.",
  touch: "A blank file takes shape on the stone.",
  cp: "A careful copy is etched into place.",
  grep: "The matching words glimmer briefly.",
  echo: "Your words echo through the chamber.",
  help: "The old command list opens before you.",
  hint: "The Dungeon Master offers a quiet nudge.",
  man: "A manual page rises from the dust.",
};

const screenEffects: Record<string, ScreenEffect["kind"]> = {
  cd: "traverse",
  mkdir: "create",
  pwd: "aware",
  find: "track",
};

export function runCommandEffect(input: string, result: CommandResult, failed: boolean): CommandEffectPlan {
  if (failed) return { screen: "error" };

  const command = commandName(input);
  const plan: CommandEffectPlan = {};
  const text = feedback[command];
  if (text) plan.feedback = { kind: "dm", text: `Dungeon Master: ${text}` };
  if (screenEffects[command]) plan.screen = screenEffects[command];

  if (result.effect?.type === "pickup" || result.effect?.type === "win") {
    plan.delayedStateMs = 800;
  }
  if (result.effect?.type === "removeFile") {
    plan.delayedStateMs = 650;
  }

  return plan;
}
