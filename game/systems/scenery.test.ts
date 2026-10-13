import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { COLLISION } from "@/game/config/flight";
import {
  BELT_ASTEROID_FIELD,
  BELT_SLALOM_COURSE,
  SATURN_BOULDER_FIELD,
  SATURN_RUN_COURSE,
  type AsteroidFieldParams,
  type RingCourseParams,
} from "@/game/data/missions";
import { BODIES, SATURN, type LocationId } from "@/game/data/planets";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { distanceToPolyline, generateCourse } from "./course";
import { locationAsteroids } from "./scenery";

const cases: [LocationId, AsteroidFieldParams, RingCourseParams][] = [
  ["ceres", BELT_ASTEROID_FIELD, BELT_SLALOM_COURSE],
  ["saturn", SATURN_BOULDER_FIELD, SATURN_RUN_COURSE],
];

describe.each(cases)("%s scenery", (location, field, courseParams) => {
  const asteroids = locationAsteroids(location);
  const course = generateCourse(courseParams, sunDirectionFor(location));
  const primary = BODIES[location];

  it("is crowded enough to be a challenge", () => {
    expect(asteroids.length).toBeGreaterThan(field.count * 0.8);
  });

  it("keeps the race corridor clear", () => {
    for (const asteroid of asteroids) {
      expect(distanceToPolyline(asteroid.position, course.path) - asteroid.radius).toBeGreaterThanOrEqual(field.corridorClearance);
    }
  });

  it("never buries a rock inside the planet", () => {
    const planetCollider = primary.radius * (primary.atmosphere?.scale ?? 1) + COLLISION.planetMargin;
    for (const asteroid of asteroids) {
      expect(asteroid.position.length() - asteroid.radius).toBeGreaterThan(planetCollider);
    }
  });

  it("is deterministic and cached", () => {
    expect(locationAsteroids(location)).toBe(asteroids);
  });
});

describe("Saturn ring run", () => {
  const course = generateCourse(SATURN_RUN_COURSE, sunDirectionFor("saturn"));
  const pole = new Vector3(...SATURN_RUN_COURSE.planeNormal).normalize();
  const rings = SATURN.rings!.bands;
  const inner = rings[0].from * SATURN.radius;
  const outer = rings[rings.length - 1].to * SATURN.radius;

  it("skims just above the rings, over the ring disc", () => {
    for (const ring of course.rings) {
      const height = ring.position.dot(pole);
      const radial = ring.position.clone().addScaledVector(pole, -height).length();
      expect(height).toBeGreaterThan(ring.radius + 5);
      expect(height).toBeLessThan(60);
      expect(radial).toBeGreaterThan(inner);
      expect(radial).toBeLessThan(outer);
    }
  });
});
