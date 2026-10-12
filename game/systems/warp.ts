import type { LocationId } from "@/game/data/planets";
import { clamp01, smoothstep } from "./math";

/**
 * Warp sequence (pure): charge (ship speeds up, FOV widens) → tunnel (the
 * scene switches while hidden) → arrive (tunnel fades, ship slows down).
 */
export type WarpPhase = "idle" | "charge" | "tunnel" | "arrive";

export interface WarpTimings {
  charge: number;
  tunnel: number;
  arrive: number;
  /** Fraction of the tunnel at which the location switches. */
  switchAt: number;
}

export interface WarpState {
  phase: WarpPhase;
  /** Seconds spent in the current phase. */
  time: number;
  target: LocationId | null;
  switched: boolean;
}

export type WarpEvent = "switch" | "done" | null;

export function createWarpState(): WarpState {
  return { phase: "idle", time: 0, target: null, switched: false };
}

export function startWarp(state: WarpState, target: LocationId): boolean {
  if (state.phase !== "idle") return false;
  state.phase = "charge";
  state.time = 0;
  state.target = target;
  state.switched = false;
  return true;
}

export function isWarping(state: WarpState): boolean {
  return state.phase !== "idle";
}

export function tickWarp(state: WarpState, dt: number, timings: WarpTimings): WarpEvent {
  if (state.phase === "idle") return null;
  state.time += dt;
  if (state.phase === "charge" && state.time >= timings.charge) {
    state.phase = "tunnel";
    state.time = 0;
  }
  if (state.phase === "tunnel") {
    if (!state.switched && state.time >= timings.tunnel * timings.switchAt) {
      state.switched = true;
      return "switch";
    }
    if (state.time >= timings.tunnel) {
      state.phase = "arrive";
      state.time = 0;
    }
  }
  if (state.phase === "arrive" && state.time >= timings.arrive) {
    state.phase = "idle";
    state.time = 0;
    state.target = null;
    return "done";
  }
  return null;
}

/** 0..1 strength of the tunnel overlay. */
export function warpIntensity(state: WarpState, timings: WarpTimings): number {
  switch (state.phase) {
    case "charge":
      return smoothstep(0.4, 1, state.time / timings.charge) * 0.35;
    case "tunnel":
      return 0.35 + 0.65 * smoothstep(0, 0.25, state.time / timings.tunnel);
    case "arrive":
      return 1 - smoothstep(0, 1, clamp01(state.time / timings.arrive));
    default:
      return 0;
  }
}
