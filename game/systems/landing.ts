import type { SurfaceId } from "@/game/data/surfaces";
import { clamp01 } from "./math";

/**
 * Landing / take-off sequence (pure). Not a seamless landing: the descent
 * fades out, the small surface scene loads, and it fades back in.
 */
export type LandingPhase = "idle" | "descent" | "fadeToSurface" | "revealSurface" | "surface" | "ascent" | "fadeToSpace" | "revealSpace";

export interface LandingTimings {
  descent: number;
  fade: number;
  ascent: number;
}

export interface LandingState {
  phase: LandingPhase;
  time: number;
  body: SurfaceId | null;
}

export type LandingEvent = "enterSurface" | "landed" | "enterSpace" | "tookOff" | null;

export function createLandingState(): LandingState {
  return { phase: "idle", time: 0, body: null };
}

export function beginDescent(state: LandingState, body: SurfaceId): boolean {
  if (state.phase !== "idle") return false;
  state.phase = "descent";
  state.time = 0;
  state.body = body;
  return true;
}

export function beginAscent(state: LandingState): boolean {
  if (state.phase !== "surface") return false;
  state.phase = "ascent";
  state.time = 0;
  return true;
}

/** True while the player has no control (any transition). */
export function isLandingSequence(state: LandingState): boolean {
  return state.phase !== "idle" && state.phase !== "surface";
}

export function onSurface(state: LandingState): boolean {
  return state.phase === "surface" || state.phase === "revealSurface" || state.phase === "ascent" || state.phase === "fadeToSpace";
}

function advance(state: LandingState, next: LandingPhase): void {
  state.phase = next;
  state.time = 0;
}

export function tickLanding(state: LandingState, dt: number, timings: LandingTimings): LandingEvent {
  if (state.phase === "idle" || state.phase === "surface") return null;
  state.time += dt;
  switch (state.phase) {
    case "descent":
      if (state.time >= timings.descent) advance(state, "fadeToSurface");
      return null;
    case "fadeToSurface":
      if (state.time >= timings.fade) {
        advance(state, "revealSurface");
        return "enterSurface";
      }
      return null;
    case "revealSurface":
      if (state.time >= timings.fade) {
        advance(state, "surface");
        return "landed";
      }
      return null;
    case "ascent":
      if (state.time >= timings.ascent) advance(state, "fadeToSpace");
      return null;
    case "fadeToSpace":
      if (state.time >= timings.fade) {
        advance(state, "revealSpace");
        return "enterSpace";
      }
      return null;
    case "revealSpace":
      if (state.time >= timings.fade) {
        state.body = null;
        advance(state, "idle");
        return "tookOff";
      }
      return null;
  }
}

/** Black overlay opacity 0..1 for the fades. */
export function landingFade(state: LandingState, timings: LandingTimings): number {
  const t = clamp01(state.time / timings.fade);
  switch (state.phase) {
    case "fadeToSurface":
    case "fadeToSpace":
      return t;
    case "revealSurface":
    case "revealSpace":
      return 1 - t;
    default:
      return 0;
  }
}

/** 0..1 heat glow / shake strength during descent and ascent. */
export function landingHeat(state: LandingState, timings: LandingTimings): number {
  if (state.phase === "descent") return clamp01(state.time / timings.descent) ** 1.5;
  if (state.phase === "fadeToSurface") return 1;
  if (state.phase === "ascent") return clamp01(state.time / timings.ascent) * 0.6;
  return 0;
}
