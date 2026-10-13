import { describe, expect, it } from "vitest";
import { LOCATION_ORDER, BODIES } from "@/game/data/planets";
import { arrivalFor, buildEnvironment, locationPickups, moonletPosition } from "./environment";

describe("location environments", () => {
  it.each(LOCATION_ORDER)("builds %s with its planet as the primary collider", (location) => {
    const environment = buildEnvironment(location);
    expect(environment.primary.id).toBe(location);
    expect(environment.colliders[0].id).toBe(location);
    expect(environment.sunDirection.length()).toBeCloseTo(1);
  });

  it("keeps Earth's Moon in the Earth scene only", () => {
    expect(buildEnvironment("earth").bodies.map((body) => body.id)).toEqual(["earth", "moon"]);
    expect(buildEnvironment("mars").bodies.map((body) => body.id)).toEqual(["mars"]);
  });

  it("adds decorative moons as colliders", () => {
    const jupiter = buildEnvironment("jupiter");
    expect(jupiter.colliders.length).toBe(1 + (BODIES.jupiter.moonlets?.length ?? 0));
  });

  it.each(LOCATION_ORDER)("drops the ship outside %s, facing roughly towards it", (location) => {
    const { position, forward, up } = arrivalFor(location);
    const environment = buildEnvironment(location);
    for (const collider of environment.colliders) {
      expect(position.distanceTo(collider.center)).toBeGreaterThan(collider.radius + 5);
    }
    for (const asteroid of environment.asteroids) {
      expect(position.distanceTo(asteroid.position)).toBeGreaterThan(asteroid.radius + 8);
    }
    const toPlanet = environment.colliders[0].center.clone().sub(position).normalize();
    expect(forward.dot(toPlanet)).toBeGreaterThan(0.8);
    expect(Math.abs(up.dot(forward))).toBeLessThan(1e-6);
  });

  it.each(LOCATION_ORDER)("keeps %s energy stars clear of the planet", (location) => {
    const environment = buildEnvironment(location);
    for (const pickup of locationPickups(location)) {
      for (const collider of environment.colliders) {
        expect(pickup.position.distanceTo(collider.center)).toBeGreaterThan(collider.radius);
      }
    }
  });

  it("tilts moon orbits with the planet", () => {
    const flat = moonletPosition({ ...BODIES.uranus, axialTilt: 0 }, 0);
    const tilted = moonletPosition(BODIES.uranus, 0);
    expect(flat.length()).toBeCloseTo(tilted.length());
    expect(flat.y).not.toBeCloseTo(tilted.y);
  });
});
