import type { MissionId } from "./missions";
import type { LocationId } from "./planets";
import type { DecalId, ShipId } from "./ships";

/**
 * Total stars (best stars summed over all missions, 21 max) needed to unlock
 * each item. 0 = available from the start. A ship's own default paint is
 * always allowed, and choices saved before an item got locked are kept.
 */
export const MISSION_UNLOCKS: Record<MissionId, number> = {
  "orbit-rings": 0,
  "station-delivery": 2,
  "red-spot-photo": 4,
  "belt-slalom": 6,
  "crystal-hunt": 8,
  "saturn-ring-run": 10,
  "saturn-portrait": 12,
};

export const SHIP_UNLOCKS: Record<ShipId, number> = { comet: 0, swift: 3, nova: 7, titan: 11 };

/** Per entry of PAINT_COLORS (body and accent). */
export const PAINT_UNLOCKS: readonly number[] = [0, 0, 0, 0, 0, 0, 5, 9, 14, 18];

/** Per entry of TRAIL_COLORS. */
export const TRAIL_UNLOCKS: readonly number[] = [0, 0, 0, 4, 10, 16, 20];

export const DECAL_UNLOCKS: Record<DecalId, number> = { none: 0, stripe: 0, chevron: 6, star: 12 };

/** Warp destinations that open with a route: the asteroid belt opens with its first mission. */
export const LOCATION_UNLOCKS: Partial<Record<LocationId, number>> = { ceres: MISSION_UNLOCKS["belt-slalom"] };
