import { Quaternion, Vector3 } from "three";
import { EXPLORATION } from "@/game/config/exploration";
import { BODIES } from "@/game/data/planets";
import { isSurfaceId, SURFACES, type SurfaceId } from "@/game/data/surfaces";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { addTrauma, updateChaseCamera } from "./cameraRig";
import { buildEnvironment, buildSurfaceEnvironment, type BodyCollider } from "./environment";
import { EMPTY_PAYLOAD, gameEvents } from "./events";
import { getShipForward, orientationFromForwardUp, type ShipState } from "./flight";
import { beginAscent, beginDescent, landingHeat, tickLanding } from "./landing";
import { damp, dampFactor } from "./math";
import type { MissionLayout } from "./missionLayout";
import { endOrbit } from "./orbitControl";
import { currentPickups, resetPickups } from "./pickups";
import { runtime } from "./runtime";
import { createTerrain, type Terrain } from "./terrain";

const terrains = new Map<SurfaceId, Terrain>();

/** Landing-site heightfields are generated once and reused. */
export function terrainFor(surface: SurfaceId): Terrain {
  let terrain = terrains.get(surface);
  if (!terrain) {
    terrain = createTerrain(SURFACES[surface]);
    terrains.set(surface, terrain);
  }
  return terrain;
}

/** Closest body low enough to try landing on (landable or not), or null. */
export function landingCandidate(position: Vector3, colliders: readonly BodyCollider[]): BodyCollider | null {
  let best: BodyCollider | null = null;
  let bestAltitude = Infinity;
  for (const collider of colliders) {
    if (!collider.id) continue;
    const altitude = position.distanceTo(collider.center) - collider.surfaceRadius;
    if (altitude > collider.surfaceRadius * EXPLORATION.landing.promptAltitude) continue;
    if (altitude < bestAltitude) {
      bestAltitude = altitude;
      best = collider;
    }
  }
  return best;
}

const _target = new Vector3();
const _forward = new Vector3();
const _desired = new Vector3();
const _up = new Vector3();
const _quaternion = new Quaternion();
const WORLD_UP = new Vector3(0, 1, 0);
const _landingCenter = new Vector3();
let landingRadius = 0;

/** L: land (Moon/Mars), explain why not (other bodies), or take off from a surface. */
export function requestLanding(): void {
  const landing = runtime.landing;
  if (landing.phase === "surface") {
    if (beginAscent(landing)) gameEvents.emit("takeOffStart", EMPTY_PAYLOAD);
    return;
  }
  if (landing.phase !== "idle") return;
  const candidate = landingCandidate(runtime.ship.position, runtime.environment.colliders);
  if (!candidate?.id) return;
  if (!BODIES[candidate.id].landing.landable || !isSurfaceId(candidate.id)) {
    gameEvents.emit("landingRefused", { body: candidate.id });
    return;
  }
  endOrbit();
  _landingCenter.copy(candidate.center);
  landingRadius = candidate.surfaceRadius;
  beginDescent(landing, candidate.id);
  gameEvents.emit("landingStart", { body: candidate.id });
}

/** Steers the ship's nose towards `direction` and moves it forward at `speed`. */
function flyTowards(ship: ShipState, direction: Vector3, up: Vector3, speed: number, dt: number): void {
  orientationFromForwardUp(direction, up, _quaternion);
  ship.quaternion.slerp(_quaternion, dampFactor(1.6, dt));
  ship.speed = damp(ship.speed, speed, 1.8, dt);
  getShipForward(ship, _forward);
  ship.previousPosition.copy(ship.position);
  ship.velocity.copy(_forward).multiplyScalar(ship.speed);
  ship.position.addScaledVector(ship.velocity, dt);
  ship.knockback.set(0, 0, 0);
  ship.angularVelocity.set(0, 0, 0);
}

function flyDescent(dt: number): void {
  const ship = runtime.ship;
  const config = EXPLORATION.landing;
  _up.subVectors(ship.position, _landingCenter).normalize();
  getShipForward(ship, _forward);
  _desired.copy(_up).negate().multiplyScalar(0.7).addScaledVector(_forward, 0.5).normalize();
  flyTowards(ship, _desired, _up, config.descentSpeed, dt);
  const floor = landingRadius * config.descentFloor;
  if (ship.position.distanceTo(_landingCenter) < floor) {
    ship.position.copy(_landingCenter).addScaledVector(_up, floor);
  }
  addTrauma(runtime.camera, landingHeat(runtime.landing, config) * 0.9 * dt);
}

function flyAscent(dt: number): void {
  const ship = runtime.ship;
  getShipForward(ship, _forward);
  _desired.copy(_forward).multiplyScalar(0.35).addScaledVector(WORLD_UP, 0.95).normalize();
  _up.copy(_forward).negate().addScaledVector(WORLD_UP, 0.2).normalize();
  flyTowards(ship, _desired, _up, EXPLORATION.landing.ascentSpeed, dt);
  addTrauma(runtime.camera, 0.35 * dt);
}

/** Slower hover flight near the ground. */
function applySurfaceTuning(): void {
  const scale = EXPLORATION.surface.speedScale;
  runtime.flight = { ...runtime.flight, maxSpeed: runtime.flight.maxSpeed * scale, boostSpeed: runtime.flight.boostSpeed * scale };
}

function placeShip(position: Vector3, forward: Vector3, up: Vector3, speed: number): void {
  const ship = runtime.ship;
  ship.position.copy(position);
  ship.previousPosition.copy(position);
  orientationFromForwardUp(forward, up, ship.quaternion);
  ship.knockback.set(0, 0, 0);
  ship.angularVelocity.set(0, 0, 0);
  ship.speed = speed;
  runtime.origin.copy(position);
  runtime.camera.intro = 1;
  updateChaseCamera(runtime.camera, ship, 0, true);
}

function enterSurface(surface: SurfaceId, restoreShip: () => void): void {
  const terrain = terrainFor(surface);
  const definition = SURFACES[surface];
  runtime.terrain = terrain;
  const environment = buildSurfaceEnvironment(runtime.environment.location, surface, terrain);
  runtime.environment = environment;
  runtime.sun.direction.copy(environment.sunDirection);
  runtime.sun.size = environment.sunSize;
  runtime.sun.intensity = environment.sunIntensity;
  restoreShip();
  applySurfaceTuning();

  const [x, z] = definition.spawn;
  const position = new Vector3(x, terrain.heightAt(x, z) + EXPLORATION.surface.spawnAltitude, z);
  const firstPoi = terrain.pointsOfInterest[0]?.position ?? new Vector3(0, 0, 0);
  const forward = new Vector3(firstPoi.x - x, 0, firstPoi.z - z).normalize();
  placeShip(position, forward, WORLD_UP, EXPLORATION.surface.entrySpeed);
  resetPickups(terrain.pickups);
  runtime.prompts.pointOfInterest = null;
  useGameStore.getState().setSurface(surface);
}

function leaveSurface(surface: SurfaceId, layout: MissionLayout, restoreShip: () => void): void {
  runtime.terrain = null;
  const environment = buildEnvironment(runtime.environment.location);
  runtime.environment = environment;
  runtime.sun.direction.copy(environment.sunDirection);
  runtime.sun.size = environment.sunSize;
  runtime.sun.intensity = environment.sunIntensity;
  restoreShip();

  const body = environment.colliders.find((collider) => collider.id === surface) ?? environment.colliders[0];
  const direction = environment.sunDirection.clone().addScaledVector(WORLD_UP, 0.5).normalize();
  const position = body.center.clone().addScaledVector(direction, body.surfaceRadius * EXPLORATION.landing.exitDistance);
  const forward = new Vector3().crossVectors(direction, WORLD_UP);
  if (forward.lengthSq() < 1e-4) forward.set(1, 0, 0);
  forward.normalize();
  placeShip(position, forward, direction, EXPLORATION.landing.ascentSpeed * 0.6);
  resetPickups(currentPickups(layout));
  useGameStore.getState().setSurface(null);
}

/**
 * Runs the scripted parts of landing/take-off. Returns true while the
 * sequence owns the ship (no player control).
 */
export function stepLandingFlow(dt: number, layout: MissionLayout, restoreShip: () => void): boolean {
  const landing = runtime.landing;
  const body = landing.body;
  const event = tickLanding(landing, dt, EXPLORATION.landing);
  if (body && event === "enterSurface") enterSurface(body, restoreShip);
  else if (body && event === "landed") {
    const first = useProgressStore.getState().markLanded(body);
    gameEvents.emit("landed", { body, first });
  } else if (body && event === "enterSpace") leaveSurface(body, layout, restoreShip);

  switch (landing.phase) {
    case "descent":
    case "fadeToSurface":
      flyDescent(dt);
      return true;
    case "ascent":
    case "fadeToSpace":
      flyAscent(dt);
      return true;
    default:
      return false;
  }
}

/** Hover flight: stay above the ground, under the ceiling and inside the crater rim. */
export function applyTerrain(ship: ShipState, dt: number): number {
  const terrain = runtime.terrain;
  if (!terrain) return 0;
  const config = EXPLORATION.surface;
  const ground = terrain.heightAt(ship.position.x, ship.position.z) + config.clearance;
  let impact = 0;
  if (ship.position.y < ground) {
    ship.position.y = ground;
    const falling = -ship.velocity.y;
    if (falling > 0) {
      ship.knockback.y += falling * (1 + config.bounce);
      impact = Math.min(1, falling / 40);
    }
  }
  if (ship.position.y > config.ceiling) {
    ship.position.y = config.ceiling;
    if (ship.velocity.y > 0) ship.knockback.y -= ship.velocity.y;
  }
  const fromCentre = Math.hypot(ship.position.x, ship.position.z);
  if (fromCentre > config.boundary) {
    const push = (fromCentre - config.boundary) * 2.5 * dt;
    ship.knockback.x -= (ship.position.x / fromCentre) * push;
    ship.knockback.z -= (ship.position.z / fromCentre) * push;
  }
  return impact;
}

/** Visits points of interest you fly over; keeps the closest one for its card. */
export function handlePointsOfInterest(): void {
  const terrain = runtime.terrain;
  const prompts = runtime.prompts;
  // Only while flying around the site (not while lifting off over it).
  if (!terrain || runtime.landing.phase !== "surface") {
    prompts.pointOfInterest = null;
    return;
  }
  const ship = runtime.ship.position;
  let current: string | null = null;
  for (const poi of terrain.pointsOfInterest) {
    if (Math.hypot(ship.x - poi.position.x, ship.z - poi.position.z) <= poi.radius) current = poi.id;
  }
  if (current === prompts.pointOfInterest) return;
  prompts.pointOfInterest = current;
  if (current) {
    const first = useProgressStore.getState().visitPointOfInterest(current);
    gameEvents.emit("pointOfInterest", { id: current, first });
  }
}

/** Closest unvisited point of interest (for the HUD target marker), or null. */
export function nextPointOfInterest(target: Vector3): boolean {
  const terrain = runtime.terrain;
  if (!terrain) return false;
  const visited = useProgressStore.getState().pointsOfInterest;
  let best = Infinity;
  for (const poi of terrain.pointsOfInterest) {
    if (visited.includes(poi.id)) continue;
    const distance = runtime.ship.position.distanceTo(poi.position);
    if (distance < best) {
      best = distance;
      _target.copy(poi.position);
    }
  }
  if (best === Infinity) return false;
  target.copy(_target).y += 8;
  return true;
}
