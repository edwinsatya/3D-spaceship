import { describe, expect, it } from "vitest";
import { MISSION_ORDER } from "@/game/data/missions";
import { PAINT_COLORS, TRAIL_COLORS } from "@/game/data/ships";
import { MISSION_UNLOCKS, PAINT_UNLOCKS, TRAIL_UNLOCKS } from "@/game/data/unlocks";
import { colorUnlockStars, missionUnlocked, newlyUnlocked, shipUnlocked, unlockCatalog } from "./unlocks";

const MAX_STARS = MISSION_ORDER.length * 3;

describe("unlocks", () => {
  it("has one requirement per swatch", () => {
    expect(PAINT_UNLOCKS).toHaveLength(PAINT_COLORS.length);
    expect(TRAIL_UNLOCKS).toHaveLength(TRAIL_COLORS.length);
  });

  it("starts with the first mission, the first ship and some colours", () => {
    expect(missionUnlocked("orbit-rings", 0)).toBe(true);
    expect(shipUnlocked("comet", 0)).toBe(true);
    expect(PAINT_UNLOCKS.filter((stars) => stars === 0).length).toBeGreaterThanOrEqual(4);
  });

  it("is reachable: everything unlocks before the last star", () => {
    for (const item of unlockCatalog()) expect(item.stars).toBeLessThanOrEqual(MAX_STARS);
  });

  it("opens missions in order, each one reachable from the stars of the ones before", () => {
    MISSION_ORDER.forEach((id, index) => {
      expect(MISSION_UNLOCKS[id]).toBeLessThanOrEqual(index * 3);
      if (index > 0) expect(MISSION_UNLOCKS[id]).toBeGreaterThanOrEqual(MISSION_UNLOCKS[MISSION_ORDER[index - 1]]);
    });
  });

  it("lists exactly what a star gain crosses", () => {
    const gained = newlyUnlocked(2, 4);
    expect(gained.map((item) => item.stars).every((stars) => stars > 2 && stars <= 4)).toBe(true);
    expect(gained).toContainEqual({ kind: "ship", id: "swift", stars: 3 });
    expect(gained).toContainEqual({ kind: "mission", id: "red-spot-photo", stars: 4 });
    expect(newlyUnlocked(4, 4)).toEqual([]);
  });

  it("treats colours outside the swatch lists as free", () => {
    expect(colorUnlockStars("#123456", "paint")).toBe(0);
    expect(colorUnlockStars(PAINT_COLORS[PAINT_COLORS.length - 1].toUpperCase(), "paint")).toBe(PAINT_UNLOCKS[PAINT_UNLOCKS.length - 1]);
  });
});
