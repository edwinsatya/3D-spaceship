import { Quaternion, Vector3 } from "three";
import { EXPLORATION } from "@/game/config/exploration";
import type { ControlInput } from "@/game/controls/types";
import type { BoostEvent } from "./boost";
import { EMPTY_PAYLOAD, gameEvents } from "./events";
import { getShipForward, orientationFromForwardUp } from "./flight";
import { damp, dampFactor } from "./math";
import { advanceOrbit, disengageOrbit, engageOrbit, orbitCandidate, orbitPose } from "./orbit";
import { runtime } from "./runtime";

const _forward = new Vector3();
const _position = new Vector3();
const _tangent = new Vector3();
const _up = new Vector3();
const _quaternion = new Quaternion();

export function endOrbit(): void {
  if (!runtime.orbit.active) return;
  disengageOrbit(runtime.orbit);
  gameEvents.emit("orbitEnd", EMPTY_PAYLOAD);
}

/** F: start orbiting the closest body in range, or leave the current orbit. */
export function toggleOrbit(): void {
  if (runtime.orbit.active) {
    endOrbit();
    return;
  }
  const candidate = orbitCandidate(runtime.ship.position, runtime.environment.colliders, EXPLORATION.orbit);
  if (!candidate?.id) return;
  getShipForward(runtime.ship, _forward);
  engageOrbit(runtime.orbit, runtime.ship.position, _forward, candidate, EXPLORATION.orbit);
  runtime.tutorial.orbited = true;
  gameEvents.emit("orbitStart", { body: candidate.id });
}

/** Autopilot: ease onto the orbit path, face along it, belly to the planet. */
export function flyOrbit(control: ControlInput, dt: number): BoostEvent {
  const orbit = runtime.orbit;
  const ship = runtime.ship;
  const config = EXPLORATION.orbit;
  const steering = Math.max(Math.abs(control.pitch), Math.abs(control.yaw));
  orbit.breakout = steering > config.breakoutInput ? orbit.breakout + dt : 0;
  if (orbit.breakout > config.breakoutTime || control.boost) {
    endOrbit();
    return null;
  }
  advanceOrbit(orbit, dt, config);
  orbitPose(orbit, _position, _tangent);
  _up.subVectors(_position, orbit.center).normalize();
  ship.previousPosition.copy(ship.position);
  const follow = orbit.blend < 1 ? dampFactor(1.8 + orbit.blend * 4, dt) : 1;
  ship.position.lerp(_position, follow);
  orientationFromForwardUp(_tangent, _up, _quaternion);
  ship.quaternion.slerp(_quaternion, dampFactor(3, dt));
  ship.speed = damp(ship.speed, orbit.speed, 2, dt);
  ship.velocity.copy(_tangent).multiplyScalar(ship.speed);
  ship.angularVelocity.set(0, 0, 0);
  ship.bank = damp(ship.bank, 0, 3, dt);
  ship.visualPitch = damp(ship.visualPitch, 0, 3, dt);
  return null;
}
