import { Matrix4, Quaternion, Vector3 } from "three";
import { PHOTO } from "@/game/config/photo";
import { useGameStore } from "@/game/stores/gameStore";
import { beginIntroBlend } from "./cameraRig";
import { SHIP_UP } from "./flight";
import { isLandingSequence } from "./landing";
import { clamp } from "./math";
import { runtime } from "./runtime";
import { isWarping } from "./warp";

const _inverse = new Quaternion();
const _local = new Vector3();
const _direction = new Vector3();
const _up = new Vector3();
const _look = new Vector3();
const _matrix = new Matrix4();

/** V / the camera button: open or close photo mode (not mid-warp or mid-landing). */
export function togglePhotoMode(): void {
  const game = useGameStore.getState();
  if (game.phase === "photo") {
    game.closePhoto();
    return;
  }
  if (game.phase !== "playing" || isWarping(runtime.warp) || isLandingSequence(runtime.landing)) return;
  game.openPhoto();
}

/** Starts the photo camera where the chase camera was looking from. */
export function enterPhotoMode(): void {
  const photo = runtime.photo;
  const camera = runtime.camera;
  _inverse.copy(runtime.ship.quaternion).invert();
  _local.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(_inverse);
  photo.pitch = clamp(Math.asin(clamp(_local.y, -1, 1)), -PHOTO.camera.pitchLimit, PHOTO.camera.pitchLimit);
  photo.yaw = Math.atan2(_local.x, -_local.z);
  photo.distance = clamp(camera.position.distanceTo(runtime.ship.position), PHOTO.camera.distance.min, PHOTO.camera.distance.max);
  photo.fov = clamp(camera.fov, PHOTO.camera.fov.min, PHOTO.camera.fov.max);
  photo.captureRequested = false;
  camera.trauma = 0;
  runtime.tutorial.photoOpened = true;
}

/** Glide back to the flight camera instead of snapping. */
export function leavePhotoMode(): void {
  if (runtime.refs.ship) runtime.refs.ship.visible = true;
  beginIntroBlend(runtime.camera);
}

/** Photo camera: behind the ship along the chosen look direction, ship slightly below centre. */
export function updatePhotoCamera(): void {
  const photo = runtime.photo;
  const camera = runtime.camera;
  const ship = runtime.ship;
  const cosPitch = Math.cos(photo.pitch);
  _direction.set(Math.sin(photo.yaw) * cosPitch, Math.sin(photo.pitch), -Math.cos(photo.yaw) * cosPitch).applyQuaternion(ship.quaternion);
  _up.copy(SHIP_UP).applyQuaternion(ship.quaternion);
  camera.position.copy(ship.position).addScaledVector(_direction, -photo.distance).addScaledVector(_up, photo.distance * 0.12);
  _look.copy(camera.position).add(_direction);
  _matrix.lookAt(camera.position, _look, _up);
  camera.quaternion.setFromRotationMatrix(_matrix);
  camera.fov = photo.fov;
  camera.up.copy(_up);
}

/** Drag: turn the view (radians from pixels). */
export function rotatePhotoCamera(dx: number, dy: number): void {
  const photo = runtime.photo;
  photo.yaw -= dx * PHOTO.camera.dragSpeed;
  photo.pitch = clamp(photo.pitch + dy * PHOTO.camera.dragSpeed, -PHOTO.camera.pitchLimit, PHOTO.camera.pitchLimit);
}

/** Wheel / pinch: move the camera closer to or further from the ship. */
export function dollyPhotoCamera(amount: number): void {
  const photo = runtime.photo;
  const { min, max } = PHOTO.camera.distance;
  photo.distance = clamp((photo.distance + 2) * Math.exp(amount * PHOTO.camera.zoomSpeed) - 2, min, max);
}

