import { Matrix4, Quaternion, Vector3 } from "three";
import { BOOST, FLIGHT, type FlightConfig } from "@/game/config/flight";
import type { ControlInput } from "@/game/controls/types";
import { createBoostState, updateBoost, type BoostEvent, type BoostState } from "./boost";
import { clamp01, damp, lerp } from "./math";

export interface ShipState {
  /** Universe coordinates (float64 on the CPU; see floatingOrigin). */
  position: Vector3;
  previousPosition: Vector3;
  quaternion: Quaternion;
  velocity: Vector3;
  /** Extra velocity from collisions; decays over time. */
  knockback: Vector3;
  speed: number;
  /** Local angular velocity (x = pitch, y = yaw, z = roll) in rad/s. */
  angularVelocity: Vector3;
  boost: BoostState;
  /** Visual-only banking/pitch of the mesh. */
  bank: number;
  visualPitch: number;
}

export interface FlightContext {
  canMove: boolean;
  /** Direction considered "up" for auto-level (radial from nearest planet). */
  referenceUp: Vector3 | null;
}

export const SHIP_FORWARD = new Vector3(0, 0, -1);
export const SHIP_UP = new Vector3(0, 1, 0);
export const SHIP_RIGHT = new Vector3(1, 0, 0);

export function createShipState(): ShipState {
  return {
    position: new Vector3(),
    previousPosition: new Vector3(),
    quaternion: new Quaternion(),
    velocity: new Vector3(),
    knockback: new Vector3(),
    speed: 0,
    angularVelocity: new Vector3(),
    boost: createBoostState(),
    bank: 0,
    visualPitch: 0,
  };
}

const _basisX = new Vector3();
const _basisY = new Vector3();
const _basisZ = new Vector3();
const _basisMatrix = new Matrix4();

/** Orients a quaternion so local -Z faces `forward` and local +Y is close to `up`. */
export function orientationFromForwardUp(forward: Vector3, up: Vector3, target: Quaternion): Quaternion {
  _basisZ.copy(forward).normalize().negate();
  _basisX.crossVectors(up, _basisZ);
  if (_basisX.lengthSq() < 1e-8) _basisX.set(1, 0, 0);
  _basisX.normalize();
  _basisY.crossVectors(_basisZ, _basisX);
  _basisMatrix.makeBasis(_basisX, _basisY, _basisZ);
  return target.setFromRotationMatrix(_basisMatrix);
}

export function resetShip(ship: ShipState, position: Vector3, forward: Vector3, up: Vector3): void {
  ship.position.copy(position);
  ship.previousPosition.copy(position);
  orientationFromForwardUp(forward, up, ship.quaternion);
  ship.velocity.set(0, 0, 0);
  ship.knockback.set(0, 0, 0);
  ship.speed = 0;
  ship.angularVelocity.set(0, 0, 0);
  ship.boost.energy = 1;
  ship.boost.active = false;
  ship.boost.regenDelay = 0;
  ship.boost.held = false;
  ship.bank = 0;
  ship.visualPitch = 0;
}

const _fwd = new Vector3();
const _up = new Vector3();
const _right = new Vector3();
const _desired = new Vector3();
const _axis = new Vector3();
const _deltaRotation = new Quaternion();

/** Roll rate (rad/s) that levels the ship's up vector towards `referenceUp`. */
export function autoLevelRollRate(quaternion: Quaternion, referenceUp: Vector3, config: FlightConfig): number {
  _fwd.copy(SHIP_FORWARD).applyQuaternion(quaternion);
  _up.copy(SHIP_UP).applyQuaternion(quaternion);
  _right.copy(SHIP_RIGHT).applyQuaternion(quaternion);
  _desired.copy(referenceUp).addScaledVector(_fwd, -referenceUp.dot(_fwd));
  const weight = _desired.length();
  // Nose pointing (almost) straight up/down: "level" is undefined, don't fight the player.
  if (weight < 0.15) return 0;
  _desired.divideScalar(weight);
  const error = Math.atan2(_right.dot(_desired), _up.dot(_desired));
  return -error * config.autoLevelRate * weight;
}

export function getShipForward(ship: ShipState, target: Vector3): Vector3 {
  return target.copy(SHIP_FORWARD).applyQuaternion(ship.quaternion);
}

/**
 * Arcade flight integration. Mutates `ship`, allocates nothing.
 * Ship forward is local -Z; positive pitch input = nose up, positive yaw = right.
 */
export function updateFlight(
  ship: ShipState,
  input: ControlInput,
  dt: number,
  context: FlightContext,
  config: FlightConfig = FLIGHT,
): BoostEvent {
  const boostEvent = updateBoost(ship.boost, input.boost && context.canMove, dt, BOOST);
  const boosting = ship.boost.active;

  const targetSpeed = !context.canMove
    ? 0
    : boosting
      ? config.boostSpeed
      : lerp(config.minSpeed, config.maxSpeed, input.throttle);
  const speedRate = boosting
    ? config.boostResponse
    : targetSpeed > ship.speed
      ? config.accelResponse
      : config.decelResponse;
  ship.speed = damp(ship.speed, targetSpeed, speedRate, dt);

  const turnScale = lerp(1, config.highSpeedTurnScale, clamp01(ship.speed / config.boostSpeed));
  const targetPitch = input.pitch * config.pitchRate * turnScale;
  const targetYaw = -input.yaw * config.yawRate * turnScale;
  let targetRoll = -input.roll * config.rollRate;
  if (Math.abs(input.roll) < config.rollInputDeadzone && context.referenceUp) {
    targetRoll += autoLevelRollRate(ship.quaternion, context.referenceUp, config);
  }

  const w = ship.angularVelocity;
  w.x = damp(w.x, targetPitch, config.angularResponse, dt);
  w.y = damp(w.y, targetYaw, config.angularResponse, dt);
  w.z = damp(w.z, targetRoll, config.angularResponse, dt);

  const angle = w.length() * dt;
  if (angle > 1e-7) {
    _axis.copy(w).normalize();
    _deltaRotation.setFromAxisAngle(_axis, angle);
    ship.quaternion.multiply(_deltaRotation).normalize();
  }

  getShipForward(ship, _fwd);
  ship.velocity.copy(_fwd).multiplyScalar(ship.speed).add(ship.knockback);
  ship.previousPosition.copy(ship.position);
  ship.position.addScaledVector(ship.velocity, dt);

  ship.bank = damp(ship.bank, (w.y / config.yawRate) * config.visualBankMax, config.visualResponse, dt);
  ship.visualPitch = damp(ship.visualPitch, (w.x / config.pitchRate) * config.visualPitchMax, config.visualResponse, dt);

  return boostEvent;
}

export function decayKnockback(ship: ShipState, decayRate: number, dt: number): void {
  ship.knockback.multiplyScalar(Math.exp(-decayRate * dt));
}
