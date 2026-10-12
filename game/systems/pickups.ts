import type { PickupSpec } from "./course";
import type { MissionLayout } from "./missionLayout";
import { runtime } from "./runtime";

/** Energy stars of the current place (Earth's space scene reuses the mission's stars). */
export function currentPickups(layout: MissionLayout): readonly PickupSpec[] {
  const environment = runtime.environment;
  if (environment.surface) return environment.pickups;
  return environment.location === "earth" ? layout.energyStars : environment.pickups;
}

export function resetPickups(pickups: readonly PickupSpec[]): void {
  runtime.pickups.active = pickups.map(() => true);
  runtime.pickups.respawnIn = pickups.map(() => 0);
  runtime.pickups.collectedAt = pickups.map(() => -Infinity);
}
