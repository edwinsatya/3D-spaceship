/**
 * Pure mission state (no three.js, no React): countdown, timer and objective
 * progress (rings passed, crystals collected…). The game loop feeds it time
 * and completed objectives; it reports what happened.
 */
export type MissionStatus = "idle" | "countdown" | "running" | "finished";

export interface MissionState {
  status: MissionStatus;
  /** Objectives to complete (rings, crystals, deliveries…). */
  total: number;
  completed: number;
  /** Seconds left in the countdown. */
  countdownRemaining: number;
  /** Last countdown number announced (3, 2, 1, then 0 = GO). */
  countdownShown: number;
  elapsedMs: number;
}

export interface CountdownConfig {
  countdownFrom: number;
  countdownStep: number;
}

export type MissionTick =
  | { type: "none" }
  | { type: "countdown"; value: number }
  | { type: "go" };

export function createMissionState(total: number): MissionState {
  return {
    status: "idle",
    total,
    completed: 0,
    countdownRemaining: 0,
    countdownShown: -1,
    elapsedMs: 0,
  };
}

export function startCountdown(state: MissionState, config: CountdownConfig): MissionTick {
  state.status = "countdown";
  state.completed = 0;
  state.elapsedMs = 0;
  state.countdownRemaining = config.countdownFrom * config.countdownStep;
  state.countdownShown = config.countdownFrom;
  return { type: "countdown", value: config.countdownFrom };
}

/** Advances timers. `dt` must be 0 while paused. */
export function tickMission(state: MissionState, dt: number, config: CountdownConfig): MissionTick {
  if (state.status === "countdown") {
    state.countdownRemaining = Math.max(0, state.countdownRemaining - dt);
    if (state.countdownRemaining <= 0) {
      state.status = "running";
      state.countdownShown = 0;
      return { type: "go" };
    }
    const value = Math.ceil(state.countdownRemaining / config.countdownStep);
    if (value !== state.countdownShown) {
      state.countdownShown = value;
      return { type: "countdown", value };
    }
    return { type: "none" };
  }
  if (state.status === "running") {
    state.elapsedMs += dt * 1000;
  }
  return { type: "none" };
}

/** Missions without a race start (photo missions) begin straight away. */
export function startImmediately(state: MissionState): void {
  state.status = "running";
  state.completed = 0;
  state.elapsedMs = 0;
  state.countdownRemaining = 0;
  state.countdownShown = 0;
}

/** Registers one completed objective (ring passed, crystal collected…). Returns true when finished. */
export function completeObjective(state: MissionState): boolean {
  if (state.status !== "running") return false;
  state.completed += 1;
  if (state.completed >= state.total) {
    state.status = "finished";
    return true;
  }
  return false;
}

export function canFly(state: MissionState): boolean {
  return state.status !== "countdown";
}
