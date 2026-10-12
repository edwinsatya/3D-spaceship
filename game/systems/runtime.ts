import { Quaternion, Vector3, type Group } from "three";
import { BOOST, FLIGHT, type BoostConfig, type FlightConfig } from "@/game/config/flight";
import type { CursorState } from "@/game/controls/keyboardMouse";
import { SHIPS_BY_ID, DEFAULT_SHIP, type ShipDesign } from "@/game/data/ships";
import type { InputManager } from "@/game/controls/inputManager";
import { createShipState } from "./flight";
import { createHintState, type HintContext, type HintState } from "./hints";
import { createMissionState } from "./mission";

export type TargetKind = "ring" | "moon" | "earth";

export interface TargetIndicator {
  visible: boolean;
  onScreen: boolean;
  /** NDC (-1..1), y up. Clamped to the screen margin when off-screen. */
  x: number;
  y: number;
  /** Direction from screen center (radians) for the edge arrow. */
  angle: number;
  /** World units to the target surface. */
  distance: number;
  kind: TargetKind;
}

export interface CameraRuntime {
  /** Universe coordinates. */
  position: Vector3;
  quaternion: Quaternion;
  /** Smoothed chase offset (world space) → rotational lag. */
  offset: Vector3;
  up: Vector3;
  fov: number;
  trauma: number;
  shakeTime: number;
  /** 0..1 progress of the menu → gameplay camera blend (1 = done). */
  intro: number;
  introFromPosition: Vector3;
  introFromQuaternion: Quaternion;
  /** Result-screen orbit angle. */
  orbitAngle: number;
}

export interface PickupRuntime {
  active: boolean[];
  respawnIn: number[];
  /** Runtime clock when collected (for the burst animation). */
  collectedAt: number[];
}

/**
 * Per-frame mutable game state. Lives outside React: systems mutate it in the
 * single GameLoop and components read it in useFrame / HUD listeners.
 */
export const runtime = {
  ship: createShipState(),
  /** Tuning of the ship currently flown (base FLIGHT/BOOST × ship modifiers). */
  flight: { ...FLIGHT } as FlightConfig,
  boost: { ...BOOST } as BoostConfig,
  shipDesign: SHIPS_BY_ID[DEFAULT_SHIP].design as ShipDesign,
  /** Hangar turntable: yaw angle (rad) and drag-imparted spin (rad/s). */
  hangar: { angle: 0, spin: 0 },
  /** Seconds left in a hangar test flight. */
  testFlightRemaining: 0,
  origin: new Vector3(),
  camera: {
    position: new Vector3(),
    quaternion: new Quaternion(),
    offset: new Vector3(),
    up: new Vector3(0, 1, 0),
    fov: 62,
    trauma: 0,
    shakeTime: 0,
    intro: 1,
    introFromPosition: new Vector3(),
    introFromQuaternion: new Quaternion(),
    orbitAngle: 0,
  } satisfies CameraRuntime,
  mission: createMissionState(0),
  /** Clock in (scaled) seconds since the page started simulating. */
  clock: 0,
  timeScale: 1,
  /** Real seconds left until the result screen (after finishing). */
  finishTimer: 0,
  freeFlightTime: 0,
  collisionCooldown: 0,
  ringPassedAt: [] as number[],
  pickups: { active: [], respawnIn: [], collectedAt: [] } as PickupRuntime,
  target: { visible: false, onScreen: false, x: 0, y: 0, angle: 0, distance: 0, kind: "ring" } as TargetIndicator,
  targetOffscreenTime: 0,
  tutorial: {
    device: "desktop",
    mode: "mission",
    active: false,
    timeSinceStart: 0,
    ringsPassed: 0,
    steerAmount: 0,
    throttleRaised: false,
    boostUsed: false,
    rollUsed: false,
    cameraToggled: false,
    pickupsCollected: 0,
    nearestPickupDistance: Infinity,
    collisions: 0,
    targetOffscreenTime: 0,
    boostEnergy: 1,
  } as HintContext,
  hints: createHintState() as HintState,
  startThrottle: 0,
  /** Set once by GameApp; null before the input layer exists (SSR, tests). */
  input: null as InputManager | null,
  cursor: null as CursorState | null,
  refs: {
    worldRoot: null as Group | null,
    ship: null as Group | null,
  },
};

export type Runtime = typeof runtime;

/** HUD writers run right after each simulated frame (no React re-render). */
const hudListeners = new Set<() => void>();

export function subscribeHud(listener: () => void): () => void {
  hudListeners.add(listener);
  return () => hudListeners.delete(listener);
}

export function notifyHud(): void {
  for (const listener of hudListeners) listener();
}
