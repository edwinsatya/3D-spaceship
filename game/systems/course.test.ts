import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { COLLISION, FLIGHT } from "@/game/config/flight";
import { WORLD } from "@/game/config/world";
import { ORBIT_RINGS } from "@/game/data/missions";
import { EARTH } from "@/game/data/planets";
import {
  distanceToPolyline,
  generateAsteroids,
  generateCourse,
  generateEnergyStars,
  segmentCrossesDisc,
} from "./course";

describe("segmentCrossesDisc", () => {
  const center = new Vector3(0, 0, 0);
  const normal = new Vector3(0, 0, -1);

  it("detects a pass through the opening", () => {
    expect(segmentCrossesDisc(new Vector3(1, 1, 2), new Vector3(1, 1, -2), center, normal, 5)).toBe(true);
  });

  it("detects passes in the opposite direction too", () => {
    expect(segmentCrossesDisc(new Vector3(0, 0, -2), new Vector3(0, 0, 2), center, normal, 5)).toBe(true);
  });

  it("ignores segments that cross the plane outside the ring", () => {
    expect(segmentCrossesDisc(new Vector3(6, 0, 2), new Vector3(6, 0, -2), center, normal, 5)).toBe(false);
  });

  it("ignores segments that stay on one side", () => {
    expect(segmentCrossesDisc(new Vector3(0, 0, 3), new Vector3(0, 0, 1), center, normal, 5)).toBe(false);
  });

  it("does not tunnel at very high speed", () => {
    expect(segmentCrossesDisc(new Vector3(0, 0, 500), new Vector3(0, 0, -500), center, normal, 5)).toBe(true);
  });
});

describe("orbit ring course", () => {
  const layout = generateCourse(ORBIT_RINGS.course, WORLD.sunDirection);

  it("has 12 rings whose openings clear the planet's collision sphere", () => {
    expect(layout.rings).toHaveLength(12);
    const planetCollider = EARTH.radius * (EARTH.atmosphere?.scale ?? 1) + COLLISION.planetMargin + FLIGHT.collisionRadius;
    for (const ring of layout.rings) {
      expect(ring.position.length() - ring.radius).toBeGreaterThan(planetCollider);
      expect(ring.normal.length()).toBeCloseTo(1);
      expect(Math.abs(ring.normal.dot(ring.up))).toBeLessThan(1e-6);
    }
  });

  it("is deterministic", () => {
    const again = generateCourse(ORBIT_RINGS.course, WORLD.sunDirection);
    expect(again.rings[5].position.toArray()).toEqual(layout.rings[5].position.toArray());
  });

  it("starts on the day side heading away from the sun", () => {
    const sun = new Vector3(...WORLD.sunDirection).normalize();
    expect(layout.spawn.position.clone().normalize().dot(sun)).toBeGreaterThan(0.3);
    expect(layout.spawn.forward.dot(sun)).toBeLessThan(0);
  });

  it("keeps asteroids out of the racing corridor", () => {
    const asteroids = generateAsteroids(ORBIT_RINGS.asteroids, ORBIT_RINGS.course, layout, WORLD.sunDirection);
    expect(asteroids.length).toBeGreaterThan(ORBIT_RINGS.asteroids.count * 0.8);
    for (const asteroid of asteroids) {
      const gap = distanceToPolyline(asteroid.position, layout.path) - asteroid.radius;
      expect(gap).toBeGreaterThanOrEqual(ORBIT_RINGS.asteroids.corridorClearance);
    }
  });

  it("places energy stars near the racing line", () => {
    const stars = generateEnergyStars(ORBIT_RINGS.energyStars, ORBIT_RINGS.course, WORLD.sunDirection);
    expect(stars).toHaveLength(ORBIT_RINGS.energyStars.afterRings.length);
    for (const star of stars) {
      expect(distanceToPolyline(star.position, layout.path)).toBeLessThan(ORBIT_RINGS.energyStars.sideOffset + 2);
    }
  });
});
