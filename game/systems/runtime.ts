import { Quaternion, Vector3, type Group } from "three";
import { BOOST, FLIGHT, type BoostConfig, type FlightConfig } from "@/game/config/flight";
import type { CursorState } from "@/game/controls/keyboardMouse";
import type { BodyId } from "@/game/data/planets";
import { SHIPS_BY_ID, DEFAULT_SHIP, type ShipDesign } from "@/game/data/ships";
import type { InputManager } from "@/game/controls/inputManager";
import { buildEnvironment } from "./environment";
import { createShipState } from "./flight";
import { createHintState, type HintContext, type HintState } from "./hints";
import { createMissionState } from "./mission";
import { createLandingState } from "./landing";
import { createOrbitState } from "./orbit";
import type { Terrain } from "./terrain";
import { createWarpState } from "./warp";
import type { MissionLayout } from "./missionLayout";

export type TargetKind = "ring" | "body" | "poi";

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
  /** Body being pointed at (null for rings). */
  bodyId: BodyId | null;
  /** Far from the location's planet: guide the player back. */
  returning: boolean;
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
const initialEnvironment = buildEnvironment("earth");

export const runtime = {
  ship: createShipState(),
  /** Current location (bodies, colliders, lighting). Swapped on warp. */
  environment: initialEnvironment,
  /**
   * Shared sun state. Materials hold a reference to `direction`, so copying a
   * new value into it relights every shader at once.
   */
  sun: {
    direction: initialEnvironment.sunDirection.clone(),
    size: initialEnvironment.sunSize,
    intensity: initialEnvironment.sunIntensity,
  },
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
  warp: createWarpState(),
  /** Gameplay actions (orbit, land) queued by input, consumed by the simulation. */
  pendingActions: new Set<"orbit" | "land">(),
  orbit: createOrbitState(),
  landing: createLandingState(),
  /** Heightfield of the landing site while on a surface. */
  terrain: null as Terrain | null,
  /** Mirror of the persisted discoveries for the per-frame check. */
  discovered: new Set<BodyId>(),
  /** What the contextual HUD prompts can offer this frame. */
  prompts: {
    orbit: null as BodyId | null,
    land: null as BodyId | null,
    takeOff: false,
    /** Point of interest you are standing at (for its fact card). */
    pointOfInterest: null as string | null,
  },
  /** Clock in (scaled) seconds since the page started simulating. */
  clock: 0,
  timeScale: 1,
  /** Real seconds left until the result screen (after finishing). */
  finishTimer: 0,
  freeFlightTime: 0,
  collisionCooldown: 0,
  /** Clock time each mission gate was passed (-1 = not yet), for the gate visuals. */
  gatePassedAt: [] as number[],
  /** Layout of the mission being flown (null outside missions). */
  layout: null as MissionLayout | null,
  pickups: { active: [], respawnIn: [], collectedAt: [] } as PickupRuntime,
  target: {
    visible: false,
    onScreen: false,
    x: 0,
    y: 0,
    angle: 0,
    distance: 0,
    kind: "ring",
    bodyId: null,
    returning: false,
  } as TargetIndicator,
  targetOffscreenTime: 0,
  tutorial: {
    device: "desktop",
    mode: "mission",
    active: false,
    timeSinceStart: 0,
    objective: null,
    objectivesDone: 0,
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
    orbitAvailable: false,
    orbited: false,
    landAvailable: false,
    landed: false,
    mapOpened: false,
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
