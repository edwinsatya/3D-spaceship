import { describe, expect, it } from "vitest";
import { WORLD } from "@/game/config/world";
import { LOCALES } from "@/game/i18n/types";
import { BODIES, BODY_ORDER, LOCATION_ORDER, type BodyId } from "./planets";
import { LOCATION_BODIES, MAP_LAYOUT, sunDirectionFor, sunlightFor } from "./solarSystem";

const bodies = BODY_ORDER.map((id) => BODIES[id]);

describe("solar system data", () => {
  it("has the Sun, eight planets and the Moon", () => {
    expect(bodies.filter((body) => body.kind === "planet")).toHaveLength(8);
    expect(BODY_ORDER).toHaveLength(10);
  });

  it("has every fact in every language", () => {
    for (const body of bodies) {
      for (const locale of LOCALES) {
        expect(body.name[locale]).toBeTruthy();
        for (const fact of Object.values(body.facts)) expect(fact[locale].length).toBeGreaterThan(3);
        if (!body.landing.landable) expect(body.landing.reason[locale].length).toBeGreaterThan(20);
      }
    }
  });

  it("only allows landing on the Moon and Mars", () => {
    const landable = bodies.filter((body) => body.landing.landable).map((body) => body.id);
    expect(landable.sort()).toEqual(["mars", "moon"]);
  });

  it("keeps the artistic sizes in the same order as the real diameters", () => {
    const byArt = [...bodies].sort((a, b) => a.radius - b.radius).map((body) => body.id);
    const byReal = [...bodies].sort((a, b) => a.diameterKm - b.diameterKm).map((body) => body.id);
    expect(byArt).toEqual(byReal);
  });

  it("orders the map orbits by real distance from the Sun", () => {
    const planets = LOCATION_ORDER.filter((id) => id !== "sun");
    const radii = planets.map((id) => MAP_LAYOUT[id].orbitRadius);
    const distances = planets.map((id) => BODIES[id].distanceAu);
    expect([...radii].sort((a, b) => a - b)).toEqual(radii);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it("lights Earth exactly like Phase 1 so the ring course is unchanged", () => {
    const [x, y, z] = sunDirectionFor("earth");
    const [sx, sy, sz] = WORLD.sunDirection;
    const length = Math.hypot(sx, sy, sz);
    expect(x).toBeCloseTo(sx / length);
    expect(y).toBeCloseTo(sy / length);
    expect(z).toBeCloseTo(sz / length);
  });

  it("makes the Sun look smaller and dimmer further out", () => {
    expect(sunlightFor("mercury").size).toBeGreaterThan(sunlightFor("earth").size);
    expect(sunlightFor("neptune").size).toBeLessThan(sunlightFor("jupiter").size);
    expect(sunlightFor("neptune").intensity).toBeLessThan(sunlightFor("earth").intensity);
  });

  it("puts every body in exactly one location", () => {
    const placed = Object.values(LOCATION_BODIES).flat();
    expect([...placed].sort()).toEqual([...BODY_ORDER].sort() as BodyId[]);
  });
});
