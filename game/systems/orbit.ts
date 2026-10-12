import { Vector3 } from "three";
import type { BodyId } from "@/game/data/planets";
import type { BodyCollider } from "./environment";
import { clamp } from "./math";

export interface OrbitConfig {
  range: number;
  minRadius: number;
  maxRadius: number;
  speedFactor: number;
  minSpeed: number;
  maxSpeed: number;
  blendIn: number;
}

/**
 * Orbit autopilot (pure math, no three.js scene): a circle around the body in
 * the plane spanned by the ship's position and heading when it engaged.
 */
export interface OrbitState {
  active: boolean;
  body: BodyId | null;
  center: Vector3;
  radius: number;
  /** In-plane basis: e1 = radial at engage time, e2 = travel direction. */
  e1: Vector3;
  e2: Vector3;
  normal: Vector3;
  angle: number;
  speed: number;
  /** 0 → 1 while easing from free flight into the orbit path. */
  blend: number;
  /** Seconds of strong steering input (breaks out of orbit). */
  breakout: number;
}

export function createOrbitState(): OrbitState {
  return {
    active: false,
    body: null,
    center: new Vector3(),
    radius: 0,
    e1: new Vector3(1, 0, 0),
    e2: new Vector3(0, 0, 1),
    normal: new Vector3(0, 1, 0),
    angle: 0,
    speed: 0,
    blend: 0,
    breakout: 0,
  };
}

/** Closest body you could orbit right now (within range of its surface), or null. */
export function orbitCandidate(position: Vector3, colliders: readonly BodyCollider[], config: OrbitConfig): BodyCollider | null {
  let best: BodyCollider | null = null;
  let bestAltitude = Infinity;
  for (const collider of colliders) {
    if (!collider.id) continue;
    const distance = position.distanceTo(collider.center);
    if (distance > collider.surfaceRadius * config.range) continue;
    const altitude = distance - collider.surfaceRadius;
    if (altitude < bestAltitude) {
      bestAltitude = altitude;
      best = collider;
    }
  }
  return best;
}

const _radial = new Vector3();
const _fallback = new Vector3(0, 1, 0);

export function engageOrbit(
  state: OrbitState,
  position: Vector3,
  forward: Vector3,
  collider: BodyCollider,
  config: OrbitConfig,
): void {
  _radial.subVectors(position, collider.center);
  const distance = _radial.length();
  _radial.divideScalar(distance || 1);
  state.normal.crossVectors(_radial, forward);
  if (state.normal.lengthSq() < 1e-4) state.normal.crossVectors(_radial, _fallback);
  if (state.normal.lengthSq() < 1e-4) state.normal.set(1, 0, 0);
  state.normal.normalize();
  state.e1.copy(_radial);
  state.e2.crossVectors(state.normal, state.e1).normalize();
  state.center.copy(collider.center);
  state.radius = clamp(distance, collider.surfaceRadius * config.minRadius, collider.surfaceRadius * config.maxRadius);
  state.speed = clamp(state.radius * config.speedFactor, config.minSpeed, config.maxSpeed);
  state.angle = 0;
  state.blend = 0;
  state.breakout = 0;
  state.body = collider.id;
  state.active = true;
}

export function disengageOrbit(state: OrbitState): void {
  state.active = false;
  state.body = null;
  state.breakout = 0;
}

export function advanceOrbit(state: OrbitState, dt: number, config: OrbitConfig): void {
  if (!state.active) return;
  state.angle += (state.speed / state.radius) * dt;
  state.blend = Math.min(1, state.blend + dt / config.blendIn);
}

/** Point on the orbit and the travel direction at the current angle. */
export function orbitPose(state: OrbitState, position: Vector3, tangent: Vector3): void {
  const c = Math.cos(state.angle);
  const s = Math.sin(state.angle);
  position.copy(state.center).addScaledVector(state.e1, c * state.radius).addScaledVector(state.e2, s * state.radius);
  tangent.copy(state.e1).multiplyScalar(-s).addScaledVector(state.e2, c);
}
