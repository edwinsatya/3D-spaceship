import type { PickupSpec } from "./course";
import { runtime } from "./runtime";

/** Energy stars of the current place: the mission's own, or the location's in free flight. */
export function currentPickups(): readonly PickupSpec[] {
  const environment = runtime.environment;
  const layout = runtime.layout;
  if (layout && !environment.surface && layout.mission.location === environment.location) return layout.energyStars;
  return environment.pickups;
}

export function resetPickups(pickups: readonly PickupSpec[]): void {
  runtime.pickups.active = pickups.map(() => true);
  runtime.pickups.respawnIn = pickups.map(() => 0);
  runtime.pickups.collectedAt = pickups.map(() => -Infinity);
}
