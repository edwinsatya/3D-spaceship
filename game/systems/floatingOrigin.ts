import type { Vector3 } from "three";

/**
 * Floating origin: gameplay positions live in universe coordinates (float64 on
 * the CPU). Rendering subtracts `origin`, which is re-centred on the ship when
 * it drifts too far, so the numbers sent to the GPU (float32) stay small.
 */
export function rebaseIfNeeded(shipPosition: Vector3, origin: Vector3, threshold: number): boolean {
  if (shipPosition.distanceToSquared(origin) <= threshold * threshold) return false;
  origin.copy(shipPosition);
  return true;
}

/** Universe → render space. */
export function toRenderSpace(universe: Vector3, origin: Vector3, target: Vector3): Vector3 {
  return target.subVectors(universe, origin);
}
