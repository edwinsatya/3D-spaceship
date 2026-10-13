import { MISSION_ORDER, type MissionId } from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";
import { DECALS, PAINT_COLORS, SHIPS, TRAIL_COLORS, type DecalId, type ShipId } from "@/game/data/ships";
import {
  DECAL_UNLOCKS,
  LOCATION_UNLOCKS,
  MISSION_UNLOCKS,
  PAINT_UNLOCKS,
  SHIP_UNLOCKS,
  TRAIL_UNLOCKS,
} from "@/game/data/unlocks";

export type UnlockItem =
  | { kind: "mission"; id: MissionId; stars: number }
  | { kind: "ship"; id: ShipId; stars: number }
  | { kind: "paint"; color: string; stars: number }
  | { kind: "trail"; color: string; stars: number }
  | { kind: "decal"; id: DecalId; stars: number }
  | { kind: "location"; id: LocationId; stars: number };

/** Every unlockable thing with its star requirement (from-the-start items left out). */
export function unlockCatalog(): UnlockItem[] {
  const items: UnlockItem[] = [];
  for (const id of MISSION_ORDER) items.push({ kind: "mission", id, stars: MISSION_UNLOCKS[id] });
  for (const ship of SHIPS) items.push({ kind: "ship", id: ship.id, stars: SHIP_UNLOCKS[ship.id] });
  PAINT_COLORS.forEach((color, index) => items.push({ kind: "paint", color, stars: PAINT_UNLOCKS[index] ?? 0 }));
  TRAIL_COLORS.forEach((color, index) => items.push({ kind: "trail", color, stars: TRAIL_UNLOCKS[index] ?? 0 }));
  for (const id of DECALS) items.push({ kind: "decal", id, stars: DECAL_UNLOCKS[id] });
  for (const [id, stars] of Object.entries(LOCATION_UNLOCKS) as [LocationId, number][]) items.push({ kind: "location", id, stars });
  return items.filter((item) => item.stars > 0);
}

/** What a star total that rose from `before` to `after` has just unlocked (pure). */
export function newlyUnlocked(before: number, after: number): UnlockItem[] {
  if (after <= before) return [];
  return unlockCatalog().filter((item) => item.stars > before && item.stars <= after);
}

export function missionUnlocked(id: MissionId, stars: number): boolean {
  return stars >= MISSION_UNLOCKS[id];
}

export function shipUnlocked(id: ShipId, stars: number): boolean {
  return stars >= SHIP_UNLOCKS[id];
}

export function decalUnlocked(id: DecalId, stars: number): boolean {
  return stars >= DECAL_UNLOCKS[id];
}

/** Stars a swatch needs (0 when free); colours not in the list are always allowed. */
export function colorUnlockStars(color: string, group: "paint" | "trail"): number {
  const list = group === "paint" ? PAINT_COLORS : TRAIL_COLORS;
  const table = group === "paint" ? PAINT_UNLOCKS : TRAIL_UNLOCKS;
  const index = list.findIndex((entry) => entry.toLowerCase() === color.toLowerCase());
  return index < 0 ? 0 : (table[index] ?? 0);
}

export function locationUnlocked(id: LocationId, stars: number): boolean {
  return stars >= (LOCATION_UNLOCKS[id] ?? 0);
}

/** Stars a location needs (0 when it is always open). */
export function locationUnlockStars(id: LocationId): number {
  return LOCATION_UNLOCKS[id] ?? 0;
}
