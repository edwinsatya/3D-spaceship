import type { Vector3 } from "three";
import type { BodyId } from "@/game/data/planets";
import type { BodyCollider } from "./environment";

/**
 * First body (not yet discovered) whose surface is within `factor` radii of
 * the ship, or null. Pure; called every frame while exploring.
 */
export function findDiscovery(
  position: Vector3,
  colliders: readonly BodyCollider[],
  discovered: ReadonlySet<BodyId>,
  factor: number,
  minDistance = 0,
): BodyId | null {
  for (const collider of colliders) {
    if (!collider.id || discovered.has(collider.id)) continue;
    if (position.distanceTo(collider.center) <= Math.max(collider.surfaceRadius * factor, minDistance)) return collider.id;
  }
  return null;
}
