import { describe, expect, it } from "vitest";
import { COLLISION, FLIGHT } from "@/game/config/flight";
import { ORBIT_RINGS_COURSE } from "@/game/data/missions";
import { EARTH } from "@/game/data/planets";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { distanceToPolyline, generateCourse } from "./course";
import { locationAsteroids } from "./scenery";
import { stationLayout } from "./station";

describe("orbital station", () => {
  const station = stationLayout();

  it("leaves the docking gate open to fly through", () => {
    for (const sphere of station.spheres) {
      const gap = sphere.center.distanceTo(station.dock.position) - sphere.radius;
      expect(gap).toBeGreaterThan(FLIGHT.collisionRadius + 2);
    }
    expect(station.dock.normal.length()).toBeCloseTo(1);
  });

  it("stays clear of Earth, its asteroids and the Orbit Rings course", () => {
    const earthCollider = EARTH.radius * (EARTH.atmosphere?.scale ?? 1) + COLLISION.planetMargin;
    const course = generateCourse(ORBIT_RINGS_COURSE, sunDirectionFor("earth"));
    for (const sphere of station.spheres) {
      expect(sphere.center.length() - sphere.radius).toBeGreaterThan(earthCollider + 100);
      expect(distanceToPolyline(sphere.center, course.path) - sphere.radius).toBeGreaterThan(40);
      for (const asteroid of locationAsteroids("earth")) {
        expect(sphere.center.distanceTo(asteroid.position) - sphere.radius - asteroid.radius).toBeGreaterThan(10);
      }
    }
  });
});
