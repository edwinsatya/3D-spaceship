import type { BoostConfig } from "@/game/config/flight";

export interface BoostState {
  /** 0..1 */
  energy: number;
  active: boolean;
  /** Seconds left before regeneration resumes. */
  regenDelay: number;
  /** Boost input on the previous update (for press-edge detection). */
  held: boolean;
}

export type BoostEvent = "started" | "ended" | "denied" | null;

export function createBoostState(): BoostState {
  return { energy: 1, active: false, regenDelay: 0, held: false };
}

/**
 * Boost starts only on a fresh press with enough energy, drains while held,
 * and regenerates after a short delay once released (no stutter at 0 energy).
 */
export function updateBoost(state: BoostState, wantsBoost: boolean, dt: number, config: BoostConfig): BoostEvent {
  const pressed = wantsBoost && !state.held;
  state.held = wantsBoost;
  let event: BoostEvent = null;

  if (!state.active && pressed) {
    if (state.energy >= config.minEnergyToStart) {
      state.active = true;
      event = "started";
    } else {
      event = "denied";
    }
  }

  if (state.active) {
    if (!wantsBoost) {
      state.active = false;
      state.regenDelay = config.regenDelay;
      return "ended";
    }
    state.energy = Math.max(0, state.energy - config.drainPerSecond * dt);
    if (state.energy <= 0) {
      state.active = false;
      state.regenDelay = config.regenDelay;
      return "ended";
    }
    return event;
  }

  if (state.regenDelay > 0) {
    state.regenDelay = Math.max(0, state.regenDelay - dt);
  } else {
    state.energy = Math.min(1, state.energy + config.regenPerSecond * dt);
  }
  return event;
}

export function addBoostEnergy(state: BoostState, amount: number): void {
  state.energy = Math.min(1, Math.max(0, state.energy + amount));
}
