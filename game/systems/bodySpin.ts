import type { CelestialBody } from "@/game/data/planets";
import { runtime } from "./runtime";

/**
 * A body's spin angle about its pole, from the simulation clock (so it freezes
 * with pause and photo mode, and gameplay can work out where its features are).
 */
export function spinAngle(body: CelestialBody): number {
  return (runtime.spinOffsets[body.id] ?? 0) + body.rotationSpeed * runtime.clock;
}
