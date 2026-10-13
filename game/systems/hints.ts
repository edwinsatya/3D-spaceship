import type { InputDevice } from "@/game/controls/types";
import type { ObjectiveType } from "@/game/data/missions";
import type { TranslationKey } from "@/game/i18n/types";

/**
 * Contextual onboarding: short hints that appear when they are relevant and
 * disappear as soon as the player performs the action. Pure logic.
 */
export type HintId =
  | "orbit"
  | "land"
  | "map"
  | "steer"
  | "throttle"
  | "ring"
  | "crystal"
  | "cargoPickup"
  | "cargoDock"
  | "photo"
  | "followArrow"
  | "boost"
  | "energy"
  | "collision"
  | "roll"
  | "camera";

export interface HintContext {
  device: InputDevice;
  mode: "mission" | "freeflight";
  /** Player can control the ship (countdown counts: steering works). */
  active: boolean;
  /** Seconds since the race started (GO) or free flight began. */
  timeSinceStart: number;
  /** Objective type of the current mission (null in free flight). */
  objective: ObjectiveType | null;
  objectivesDone: number;
  /** Delivery missions: towing a cargo pod. */
  carrying: boolean;
  /** Photo mode has been opened this run. */
  photoOpened: boolean;
  steerAmount: number;
  throttleRaised: boolean;
  boostUsed: boolean;
  rollUsed: boolean;
  cameraToggled: boolean;
  pickupsCollected: number;
  nearestPickupDistance: number;
  collisions: number;
  targetOffscreenTime: number;
  boostEnergy: number;
  /** A planet is in orbit range (free flight). */
  orbitAvailable: boolean;
  orbited: boolean;
  /** Close enough to the Moon or Mars to land. */
  landAvailable: boolean;
  landed: boolean;
  mapOpened: boolean;
}

interface HintDefinition {
  id: HintId;
  text: Record<InputDevice, TranslationKey>;
  devices?: readonly InputDevice[];
  modes?: readonly HintContext["mode"][];
  trigger: (ctx: HintContext) => boolean;
  /** Done when the player has performed the action. */
  done: (ctx: HintContext, shownFor: number) => boolean;
  minShow: number;
  maxShow: number;
  /** Describes a state, not an action: never auto-complete before showing. */
  stateBased?: boolean;
}

export const HINTS: readonly HintDefinition[] = [
  {
    id: "steer",
    text: { desktop: "hints.steerDesktop", touch: "hints.steerTouch" },
    trigger: (c) => c.active,
    done: (c) => c.steerAmount > 0.8,
    minShow: 1.2,
    maxShow: 9,
  },
  {
    id: "followArrow",
    text: { desktop: "hints.followArrow", touch: "hints.followArrow" },
    trigger: (c) => c.timeSinceStart > 1 && c.targetOffscreenTime > 2.5,
    done: (c) => c.targetOffscreenTime === 0,
    minShow: 1.5,
    maxShow: 8,
    stateBased: true,
  },
  {
    id: "throttle",
    text: { desktop: "hints.throttleDesktop", touch: "hints.throttleTouch" },
    trigger: (c) => c.timeSinceStart > 0.4,
    done: (c) => c.throttleRaised,
    minShow: 1.2,
    maxShow: 9,
  },
  {
    id: "ring",
    text: { desktop: "hints.ring", touch: "hints.ring" },
    modes: ["mission"],
    trigger: (c) => c.objective === "rings" && c.timeSinceStart > 2 && c.objectivesDone === 0,
    done: (c) => c.objectivesDone > 0,
    minShow: 1,
    maxShow: 8,
  },
  {
    id: "crystal",
    text: { desktop: "hints.crystal", touch: "hints.crystal" },
    modes: ["mission"],
    trigger: (c) => c.objective === "collect" && c.timeSinceStart > 2 && c.objectivesDone === 0,
    done: (c) => c.objectivesDone > 0,
    minShow: 1,
    maxShow: 8,
  },
  {
    id: "cargoPickup",
    text: { desktop: "hints.cargoPickup", touch: "hints.cargoPickup" },
    modes: ["mission"],
    trigger: (c) => c.objective === "delivery" && c.timeSinceStart > 2 && !c.carrying && c.objectivesDone === 0,
    done: (c) => c.carrying || c.objectivesDone > 0,
    minShow: 1,
    maxShow: 8,
  },
  {
    id: "photo",
    text: { desktop: "hints.photoDesktop", touch: "hints.photoTouch" },
    modes: ["mission"],
    trigger: (c) => c.objective === "photo" && c.timeSinceStart > 1.5,
    done: (c) => c.photoOpened,
    minShow: 1,
    maxShow: 12,
  },
  {
    id: "cargoDock",
    text: { desktop: "hints.cargoDock", touch: "hints.cargoDock" },
    modes: ["mission"],
    trigger: (c) => c.objective === "delivery" && c.carrying && c.objectivesDone === 0,
    done: (c) => c.objectivesDone > 0,
    minShow: 1,
    maxShow: 9,
  },
  {
    id: "boost",
    text: { desktop: "hints.boostDesktop", touch: "hints.boostTouch" },
    trigger: (c) => (c.mode === "freeflight" ? c.timeSinceStart > 8 : c.objectivesDone >= 1) && c.boostEnergy > 0.5,
    done: (c) => c.boostUsed,
    minShow: 1.2,
    maxShow: 9,
  },
  {
    id: "energy",
    text: { desktop: "hints.energy", touch: "hints.energy" },
    trigger: (c) => c.nearestPickupDistance < 70,
    done: (c) => c.pickupsCollected > 0,
    minShow: 1.5,
    maxShow: 7,
  },
  {
    id: "collision",
    text: { desktop: "hints.collision", touch: "hints.collision" },
    trigger: (c) => c.collisions > 0,
    done: (_c, shownFor) => shownFor >= 3.5,
    minShow: 3.5,
    maxShow: 4,
    stateBased: true,
  },
  {
    id: "roll",
    text: { desktop: "hints.rollDesktop", touch: "hints.rollDesktop" },
    devices: ["desktop"],
    trigger: (c) => (c.mode === "freeflight" ? c.timeSinceStart > 20 : c.objectivesDone >= 4),
    done: (c) => c.rollUsed,
    minShow: 1.2,
    maxShow: 7,
  },
  {
    id: "orbit",
    text: { desktop: "hints.orbitDesktop", touch: "hints.orbitTouch" },
    modes: ["freeflight"],
    trigger: (c) => c.orbitAvailable && c.timeSinceStart > 6,
    done: (c) => c.orbited,
    minShow: 1.5,
    maxShow: 8,
  },
  {
    id: "land",
    text: { desktop: "hints.landDesktop", touch: "hints.landTouch" },
    modes: ["freeflight"],
    trigger: (c) => c.landAvailable,
    done: (c) => c.landed,
    minShow: 1.5,
    maxShow: 8,
  },
  {
    id: "map",
    text: { desktop: "hints.mapDesktop", touch: "hints.mapTouch" },
    modes: ["freeflight"],
    trigger: (c) => c.timeSinceStart > 40,
    done: (c) => c.mapOpened,
    minShow: 1.5,
    maxShow: 8,
  },
  {
    id: "camera",
    text: { desktop: "hints.cameraDesktop", touch: "hints.cameraTouch" },
    trigger: (c) => (c.mode === "freeflight" ? c.timeSinceStart > 30 : c.objectivesDone >= 7),
    done: (c) => c.cameraToggled,
    minShow: 1.2,
    maxShow: 7,
  },
];

export interface HintState {
  active: HintId | null;
  shownFor: number;
  /** Seconds before another hint may appear. */
  cooldown: number;
  completed: Set<HintId>;
  /** Hints that timed out wait this long (s) before they may show again. */
  retryAt: Map<HintId, number>;
  clock: number;
}

export const HINT_GAP = 0.7;
export const HINT_RETRY_DELAY = 15;

export function createHintState(completed: Iterable<HintId> = []): HintState {
  return { active: null, shownFor: 0, cooldown: 0, completed: new Set(completed), retryAt: new Map(), clock: 0 };
}

function applies(def: HintDefinition, ctx: HintContext): boolean {
  if (def.devices && !def.devices.includes(ctx.device)) return false;
  if (def.modes && !def.modes.includes(ctx.mode)) return false;
  return true;
}

export interface HintUpdate {
  /** Active hint changed (show/hide). */
  changed: boolean;
  /** Hint completed this tick (to persist). */
  completed: HintId | null;
}

const NO_CHANGE: HintUpdate = { changed: false, completed: null };

export function getHintText(id: HintId, device: InputDevice): TranslationKey {
  const def = HINTS.find((hint) => hint.id === id);
  return def ? def.text[device] : "hints.steerDesktop";
}

export function updateHints(state: HintState, ctx: HintContext, dt: number): HintUpdate {
  state.clock += dt;
  if (state.active) {
    const def = HINTS.find((hint) => hint.id === state.active);
    state.shownFor += dt;
    if (!def) {
      state.active = null;
      return { changed: true, completed: null };
    }
    if (def.done(ctx, state.shownFor) && state.shownFor >= def.minShow) {
      state.completed.add(def.id);
      state.active = null;
      state.cooldown = HINT_GAP;
      return { changed: true, completed: def.id };
    }
    if (state.shownFor >= def.maxShow) {
      state.retryAt.set(def.id, state.clock + HINT_RETRY_DELAY);
      state.active = null;
      state.cooldown = HINT_GAP;
      return { changed: true, completed: null };
    }
    return NO_CHANGE;
  }

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    return NO_CHANGE;
  }
  if (!ctx.active) return NO_CHANGE;

  for (const def of HINTS) {
    if (state.completed.has(def.id) || !applies(def, ctx)) continue;
    // Player already did it before we had to explain: complete silently.
    if (!def.stateBased && def.done(ctx, 0)) {
      state.completed.add(def.id);
      return { changed: false, completed: def.id };
    }
    if ((state.retryAt.get(def.id) ?? 0) > state.clock) continue;
    if (def.trigger(ctx)) {
      state.active = def.id;
      state.shownFor = 0;
      return { changed: true, completed: null };
    }
  }
  return NO_CHANGE;
}
