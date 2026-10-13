import { Vector3 } from "three";
import type { CrystalFieldParams } from "@/game/data/missions";
import type { AsteroidSpec, PickupSpec } from "./course";
import { createRandom } from "./random";

export interface ObjectiveState {
  /** Per collectible (crystal or pod): already picked up. */
  collected: boolean[];
  collectedAt: number[];
  /** Pod currently towed (delivery missions), or -1. */
  carrying: number;
}

export function createObjectiveState(collectibles: number): ObjectiveState {
  return {
    collected: Array.from({ length: collectibles }, () => false),
    collectedAt: Array.from({ length: collectibles }, () => -Infinity),
    carrying: -1,
  };
}

/** Closest item not collected yet (allocation-free), or null when all are done. */
export function nearestOpen(items: readonly PickupSpec[], collected: readonly boolean[], from: Vector3): Vector3 | null {
  let best: Vector3 | null = null;
  let bestDistance = Infinity;
  for (let index = 0; index < items.length; index++) {
    if (collected[index]) continue;
    const distance = items[index].position.distanceToSquared(from);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = items[index].position;
    }
  }
  return best;
}

/** Crystal pickup sphere radius (u). */
export const CRYSTAL_RADIUS = 2.5;

/**
 * Crystals hugging rocks of a field (pure, deterministic): each sits just
 * off an asteroid's surface, away from the others and from every other rock.
 */
export function generateCrystals(params: CrystalFieldParams, asteroids: readonly AsteroidSpec[], center: Vector3): PickupSpec[] {
  const random = createRandom(params.seed);
  const crystals: PickupSpec[] = [];
  const direction = new Vector3();
  for (let attempt = 0; attempt < params.count * 200 && crystals.length < params.count; attempt++) {
    const rock = asteroids[random.int(0, asteroids.length - 1)];
    if (!rock) break;
    const distance = rock.position.distanceTo(center);
    if (distance < params.minDistance || distance > params.maxDistance) continue;
    direction.set(random.range(-1, 1), random.range(-1, 1), random.range(-1, 1));
    if (direction.lengthSq() < 1e-4) continue;
    direction.normalize();
    const position = rock.position.clone().addScaledVector(direction, rock.radius * 1.2 + params.hugGap + CRYSTAL_RADIUS);
    const buried = asteroids.some(
      (other) => other !== rock && other.position.distanceTo(position) < other.radius * 1.2 + CRYSTAL_RADIUS + 3,
    );
    if (buried) continue;
    if (crystals.some((crystal) => crystal.position.distanceTo(position) < params.spacing)) continue;
    crystals.push({ position });
  }
  return crystals;
}

/** Visiting order that always flies to the nearest unvisited point next; starts with `start`. */
export function greedyRoute(start: Vector3, points: readonly Vector3[]): Vector3[] {
  const route = [start.clone()];
  const left = [...points];
  let current = start;
  while (left.length > 0) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (left[i].distanceTo(current) < left[best].distanceTo(current)) best = i;
    }
    current = left.splice(best, 1)[0];
    route.push(current.clone());
  }
  return route;
}
