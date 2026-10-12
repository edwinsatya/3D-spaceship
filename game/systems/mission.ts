/**
 * Pure mission state for the ring race (no three.js, no React).
 * The game loop feeds it time and ring passes; it reports what happened.
 */
export type MissionStatus = "idle" | "countdown" | "running" | "finished";

export interface MissionState {
  status: MissionStatus;
  totalRings: number;
  nextRing: number;
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

export function createMissionState(totalRings: number): MissionState {
  return {
    status: "idle",
    totalRings,
    nextRing: 0,
    countdownRemaining: 0,
    countdownShown: -1,
    elapsedMs: 0,
  };
}

export function startCountdown(state: MissionState, config: CountdownConfig): MissionTick {
  state.status = "countdown";
  state.nextRing = 0;
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

/** Registers a pass through the current target ring. Returns true when finished. */
export function passRing(state: MissionState): boolean {
  if (state.status !== "running") return false;
  state.nextRing += 1;
  if (state.nextRing >= state.totalRings) {
    state.status = "finished";
    return true;
  }
  return false;
}

export function canFly(state: MissionState): boolean {
  return state.status !== "countdown";
}
