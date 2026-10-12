import { Vector3 } from "three";
import type { CollisionConfig } from "@/game/config/flight";
import type { ShipState } from "./flight";
import { clamp01 } from "./math";

const _normal = new Vector3();

export function spheresOverlap(a: Vector3, radiusA: number, b: Vector3, radiusB: number): boolean {
  const reach = radiusA + radiusB;
  return a.distanceToSquared(b) < reach * reach;
}

/**
 * Pushes the ship out of a static sphere and bounces it.
 * Returns impact strength 0..1 (0 = no contact). No game over: just a bump.
 */
export function resolveShipSphere(
  ship: ShipState,
  shipRadius: number,
  center: Vector3,
  radius: number,
  config: CollisionConfig,
  referenceSpeed: number,
): number {
  _normal.subVectors(ship.position, center);
  const minDistance = radius + shipRadius;
  const distanceSq = _normal.lengthSq();
  if (distanceSq >= minDistance * minDistance) return 0;

  const distance = Math.sqrt(distanceSq);
  if (distance < 1e-6) _normal.set(0, 1, 0);
  else _normal.divideScalar(distance);

  ship.position.copy(center).addScaledVector(_normal, minDistance + 0.01);

  const normalSpeed = ship.velocity.dot(_normal);
  if (normalSpeed >= 0) return 0;

  // Cancel the knockback that still points into the body, then bounce outwards.
  const knockInto = ship.knockback.dot(_normal);
  if (knockInto < 0) ship.knockback.addScaledVector(_normal, -knockInto);
  const bounce = Math.max(config.minBounceSpeed, -normalSpeed * (1 + config.restitution));
  ship.knockback.addScaledVector(_normal, bounce);
  ship.speed *= config.speedRetention;

  return Math.max(0.2, clamp01(-normalSpeed / referenceSpeed));
}
