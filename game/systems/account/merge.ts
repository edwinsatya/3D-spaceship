import { MISSIONS, type MissionId } from "@/game/data/missions";
import type { MissionProgress, ProgressData } from "@/game/stores/progressStore";

/** Items of `a` in their order, then the ones only `b` has. */
function union<T>(a: readonly T[], b: readonly T[]): T[] {
  return [...a, ...b.filter((item) => !a.includes(item))];
}

function mergeMission(id: MissionId, a: MissionProgress | undefined, b: MissionProgress | undefined): MissionProgress | undefined {
  if (!a || !b) return a ?? b;
  const lowerIsBetter = MISSIONS[id].rating.kind === "time";
  const best =
    a.best === null ? b.best : b.best === null ? a.best : lowerIsBetter ? Math.min(a.best, b.best) : Math.max(a.best, b.best);
  return {
    best,
    bestStars: Math.max(a.bestStars, b.bestStars) as MissionProgress["bestStars"],
    // max, not sum: merging the same two saves again must not change anything.
    completions: Math.max(a.completions, b.completions),
  };
}

/**
 * Combines this device's progress with the account's (pure; unit-tested).
 * Records, discoveries and badges keep the best of both; the newer ship
 * loadout wins. (Device settings live in the settings store and never sync.)
 * Idempotent: merging a result again with either input changes nothing.
 */
export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  const missions: ProgressData["missions"] = {};
  const ids = union(Object.keys(local.missions), Object.keys(remote.missions)) as MissionId[];
  for (const id of ids) {
    const merged = mergeMission(id, local.missions[id], remote.missions[id]);
    if (merged) missions[id] = merged;
  }
  const newer = remote.ships.updatedAt > local.ships.updatedAt ? remote.ships : local.ships;
  const older = newer === remote.ships ? local.ships : remote.ships;
  return {
    missions,
    onboarding: { completedHints: union(local.onboarding.completedHints, remote.onboarding.completedHints) },
    ships: { selected: newer.selected, paint: { ...older.paint, ...newer.paint }, updatedAt: newer.updatedAt },
    discovered: union(local.discovered, remote.discovered),
    landed: union(local.landed, remote.landed),
    pointsOfInterest: union(local.pointsOfInterest, remote.pointsOfInterest),
    badges: union(local.badges, remote.badges),
    photosTaken: Math.max(local.photosTaken, remote.photosTaken),
  };
}

/** True when two saves hold the same progress (skip pointless uploads). */
export function sameProgress(a: ProgressData, b: ProgressData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
