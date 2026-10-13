import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { COLLISION } from "@/game/config/flight";
import { CRYSTAL_HUNT, STATION_DELIVERY } from "@/game/data/missions";
import { EARTH } from "@/game/data/planets";
import { getMissionLayout } from "./missionLayout";
import { CRYSTAL_RADIUS, greedyRoute, nearestOpen } from "./objectives";
import { locationAsteroids } from "./scenery";
import { stationLayout } from "./station";

describe("crystal hunt", () => {
  const layout = getMissionLayout("crystal-hunt");
  const asteroids = locationAsteroids("ceres");
  const { count, spacing, maxDistance } = CRYSTAL_HUNT.objective.type === "collect" ? CRYSTAL_HUNT.objective.crystals : { count: 0, spacing: 0, maxDistance: 0 };

  it("places every crystal, spread out across the belt", () => {
    expect(layout.collectibles).toHaveLength(count);
    for (const [i, crystal] of layout.collectibles.entries()) {
      expect(crystal.position.length()).toBeLessThan(maxDistance + 30);
      for (const other of layout.collectibles.slice(i + 1)) expect(crystal.position.distanceTo(other.position)).toBeGreaterThanOrEqual(spacing);
    }
  });

  it("hugs a rock without being buried in one", () => {
    for (const crystal of layout.collectibles) {
      const gaps = asteroids.map((rock) => crystal.position.distanceTo(rock.position) - rock.radius * 1.2 - CRYSTAL_RADIUS);
      expect(Math.min(...gaps)).toBeGreaterThan(0);
      expect(Math.min(...gaps)).toBeLessThan(15);
    }
  });
});

describe("station delivery", () => {
  const layout = getMissionLayout("station-delivery");
  const earthCollider = EARTH.radius * (EARTH.atmosphere?.scale ?? 1) + COLLISION.planetMargin;
  const closestToEarth = (a: Vector3, b: Vector3) => {
    const ab = b.clone().sub(a);
    const t = Math.max(0, Math.min(1, -a.dot(ab) / ab.lengthSq()));
    return a.clone().addScaledVector(ab, t).length();
  };

  it("has one pod per delivery and the station's docking gate", () => {
    expect(layout.collectibles).toHaveLength(STATION_DELIVERY.objective.type === "delivery" ? STATION_DELIVERY.objective.pods.length : 0);
    expect(layout.gates).toEqual([stationLayout().dock]);
  });

  it("never asks you to fly through Earth", () => {
    for (let i = 1; i < layout.path.length; i++) {
      expect(closestToEarth(layout.path[i - 1], layout.path[i])).toBeGreaterThan(earthCollider + 20);
    }
  });

  it("keeps pods clear of rocks and the station", () => {
    for (const pod of layout.collectibles) {
      for (const rock of locationAsteroids("earth")) expect(pod.position.distanceTo(rock.position) - rock.radius).toBeGreaterThan(20);
      for (const sphere of stationLayout().spheres) expect(pod.position.distanceTo(sphere.center) - sphere.radius).toBeGreaterThan(40);
    }
  });
});

describe("route helpers", () => {
  it("visits the nearest point first", () => {
    const route = greedyRoute(new Vector3(0, 0, 0), [new Vector3(10, 0, 0), new Vector3(1, 0, 0), new Vector3(5, 0, 0)]);
    expect(route.map((point) => point.x)).toEqual([0, 1, 5, 10]);
  });

  it("skips collected items when looking for the nearest one", () => {
    const items = [{ position: new Vector3(1, 0, 0) }, { position: new Vector3(3, 0, 0) }];
    expect(nearestOpen(items, [true, false], new Vector3())?.x).toBe(3);
    expect(nearestOpen(items, [true, true], new Vector3())).toBeNull();
  });
});
