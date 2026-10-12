import { Matrix4, Quaternion, Vector3 } from "three";
import { CAMERA } from "@/game/config/camera";
import { HANGAR } from "@/game/config/hangar";
import { SHIP_FORWARD, SHIP_RIGHT, SHIP_UP, type ShipState } from "./flight";
import { clamp01, damp, dampFactor, easeInOutCubic } from "./math";
import { runtime, type CameraRuntime } from "./runtime";

const _offset = new Vector3();
const _forward = new Vector3();
const _up = new Vector3();
const _right = new Vector3();
const _look = new Vector3();
const _matrix = new Matrix4();
const _quat = new Quaternion();
const _targetPosition = new Vector3();
const _targetQuaternion = new Quaternion();
const _bankAxis = new Vector3(0, 0, 1);

function lookAt(position: Vector3, target: Vector3, up: Vector3, out: Quaternion): Quaternion {
  _matrix.lookAt(position, target, up);
  return out.setFromRotationMatrix(_matrix);
}

/** Third-person camera with rotational lag and a boost pull-back. */
export function updateChaseCamera(camera: CameraRuntime, ship: ShipState, dt: number, snap = false): void {
  const { maxSpeed, boostSpeed } = runtime.flight;
  const boost01 = clamp01((ship.speed - maxSpeed) / (boostSpeed - maxSpeed));
  const [ox, oy, oz] = CAMERA.chaseOffset;
  _offset.set(ox, oy, oz + CAMERA.chaseBoostPullback * boost01).applyQuaternion(ship.quaternion);
  _up.copy(SHIP_UP).applyQuaternion(ship.quaternion);
  if (snap) {
    camera.offset.copy(_offset);
    camera.up.copy(_up);
  } else {
    camera.offset.lerp(_offset, dampFactor(CAMERA.chaseRotationResponse, dt));
    camera.up.lerp(_up, dampFactor(CAMERA.chaseUpResponse, dt)).normalize();
  }
  camera.position.copy(ship.position).add(camera.offset);
  _forward.copy(SHIP_FORWARD).applyQuaternion(ship.quaternion);
  _look
    .copy(ship.position)
    .addScaledVector(_forward, CAMERA.lookAhead)
    .addScaledVector(camera.up, -CAMERA.chaseLookDrop);
  lookAt(camera.position, _look, camera.up, camera.quaternion);
}

/** First-person view locked to the ship, including its visual bank. */
export function updateCockpitCamera(camera: CameraRuntime, ship: ShipState): void {
  const [ox, oy, oz] = runtime.shipDesign.cockpit;
  _offset.set(ox, oy, oz).applyQuaternion(ship.quaternion);
  camera.position.copy(ship.position).add(_offset);
  _quat.setFromAxisAngle(_bankAxis, ship.bank * 0.5);
  camera.quaternion.copy(ship.quaternion).multiply(_quat);
  camera.offset.copy(camera.position).sub(ship.position);
  camera.up.copy(SHIP_UP).applyQuaternion(ship.quaternion);
}

/** Title-screen framing: in front of the ship, Earth's limb behind it, slow sway. */
export function updateMenuCamera(camera: CameraRuntime, ship: ShipState, time: number): void {
  const { distance, height, lookDrop, sideOffset, swayAngle, swaySpeed } = CAMERA.menu;
  _forward.copy(SHIP_FORWARD).applyQuaternion(ship.quaternion);
  _up.copy(SHIP_UP).applyQuaternion(ship.quaternion);
  _right.copy(SHIP_RIGHT).applyQuaternion(ship.quaternion);
  const sway = Math.sin(time * swaySpeed * Math.PI * 2) * swayAngle + 0.75;
  _offset
    .copy(_forward)
    .multiplyScalar(Math.cos(sway) * distance)
    .addScaledVector(_right, Math.sin(sway) * distance)
    .addScaledVector(_up, height);
  camera.position.copy(ship.position).add(_offset);
  _look.copy(ship.position).addScaledVector(_right, -sideOffset).addScaledVector(_up, -lookDrop);
  lookAt(camera.position, _look, _up, camera.quaternion);
  camera.offset.copy(_offset);
  camera.up.copy(_up);
}

/** Fixed 3/4 top view of the hovering ship (it spins; the camera stays put). */
export function updateHangarCamera(
  camera: CameraRuntime,
  spawn: { position: Vector3; forward: Vector3; up: Vector3 },
): void {
  const { distance, height, angle, lookDrop } = HANGAR.camera;
  _right.crossVectors(spawn.forward, spawn.up).normalize();
  _offset
    .copy(spawn.forward)
    .multiplyScalar(Math.cos(angle) * distance)
    .addScaledVector(_right, Math.sin(angle) * distance)
    .addScaledVector(spawn.up, height);
  camera.position.copy(spawn.position).add(_offset);
  _look.copy(spawn.position).addScaledVector(spawn.up, -lookDrop);
  lookAt(camera.position, _look, spawn.up, camera.quaternion);
  camera.offset.copy(_offset);
  camera.up.copy(spawn.up);
}

/** Slow orbit around the ship while the result screen is shown. */
export function updateResultCamera(camera: CameraRuntime, ship: ShipState, dt: number): void {
  const { distance, height, orbitSpeed } = CAMERA.result;
  camera.orbitAngle += dt * orbitSpeed;
  _forward.copy(SHIP_FORWARD).applyQuaternion(ship.quaternion);
  _up.copy(SHIP_UP).applyQuaternion(ship.quaternion);
  _right.copy(SHIP_RIGHT).applyQuaternion(ship.quaternion);
  _targetPosition
    .copy(ship.position)
    .addScaledVector(_forward, -Math.cos(camera.orbitAngle) * distance)
    .addScaledVector(_right, Math.sin(camera.orbitAngle) * distance)
    .addScaledVector(_up, height);
  camera.position.lerp(_targetPosition, dampFactor(2, dt));
  camera.up.lerp(_up, dampFactor(2, dt)).normalize();
  lookAt(camera.position, ship.position, camera.up, _targetQuaternion);
  camera.quaternion.slerp(_targetQuaternion, dampFactor(4, dt));
  camera.offset.copy(camera.position).sub(ship.position);
}

export function beginIntroBlend(camera: CameraRuntime): void {
  camera.intro = 0;
  camera.introFromPosition.copy(camera.position);
  camera.introFromQuaternion.copy(camera.quaternion);
}

/** Blends from the captured menu pose to the freshly computed gameplay pose. */
export function applyIntroBlend(camera: CameraRuntime, dt: number): void {
  if (camera.intro >= 1) return;
  camera.intro = Math.min(1, camera.intro + dt / CAMERA.introBlendDuration);
  const t = easeInOutCubic(camera.intro);
  camera.position.lerpVectors(camera.introFromPosition, camera.position, t);
  camera.quaternion.slerpQuaternions(camera.introFromQuaternion, camera.quaternion, t);
}

export function updateFov(camera: CameraRuntime, ship: ShipState, dt: number): void {
  const speed01 = clamp01(ship.speed / runtime.flight.maxSpeed);
  const target = ship.boost.active ? CAMERA.boostFov : CAMERA.fov + speed01 * 3;
  camera.fov = damp(camera.fov, target, CAMERA.fovResponse, dt);
}

export function addTrauma(camera: CameraRuntime, amount: number): void {
  camera.trauma = Math.min(1, camera.trauma + amount);
}

function wobble(t: number, seed: number): number {
  return Math.sin(t + seed) * 0.5 + Math.sin(t * 2.31 + seed * 1.7) * 0.3 + Math.sin(t * 4.13 + seed * 2.9) * 0.2;
}

/**
 * Writes the final (shaken) pose into `outPosition`/`outQuaternion` without
 * disturbing the smoothed camera state.
 */
export function resolveShake(
  camera: CameraRuntime,
  dt: number,
  outPosition: Vector3,
  outQuaternion: Quaternion,
): void {
  camera.trauma = Math.max(0, camera.trauma - CAMERA.shakeDecay * dt);
  camera.shakeTime += dt * CAMERA.shakeFrequency;
  outPosition.copy(camera.position);
  outQuaternion.copy(camera.quaternion);
  if (camera.trauma <= 0) return;
  const shake = camera.trauma * camera.trauma;
  const t = camera.shakeTime;
  _offset
    .set(wobble(t, 1.1), wobble(t, 7.3), 0)
    .multiplyScalar(shake * CAMERA.shakeMaxOffset)
    .applyQuaternion(camera.quaternion);
  outPosition.add(_offset);
  _quat.setFromAxisAngle(_bankAxis, wobble(t, 3.7) * shake * CAMERA.shakeMaxRoll);
  outQuaternion.multiply(_quat);
}
