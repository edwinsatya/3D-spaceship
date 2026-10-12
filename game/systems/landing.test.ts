import { describe, expect, it } from "vitest";
import { MARS_SURFACE, MOON_SURFACE } from "@/game/data/surfaces";
import {
  beginAscent,
  beginDescent,
  createLandingState,
  isLandingSequence,
  landingFade,
  onSurface,
  tickLanding,
} from "./landing";
import { createTerrain } from "./terrain";

const timings = { descent: 1, fade: 0.5, ascent: 1 };

function run(state: ReturnType<typeof createLandingState>, seconds: number) {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += 0.05) {
    const event = tickLanding(state, 0.05, timings);
    if (event) events.push(event);
  }
  return events;
}

describe("landing sequence", () => {
  it("descends, swaps scenes behind a fade, and lands", () => {
    const state = createLandingState();
    expect(beginDescent(state, "mars")).toBe(true);
    expect(isLandingSequence(state)).toBe(true);
    expect(run(state, 1.3)).toEqual([]);
    expect(landingFade(state, timings)).toBeGreaterThan(0);
    expect(run(state, 1)).toEqual(["enterSurface", "landed"]);
    expect(state.phase).toBe("surface");
    expect(isLandingSequence(state)).toBe(false);
    expect(onSurface(state)).toBe(true);
  });

  it("takes off back to space and resets", () => {
    const state = createLandingState();
    beginDescent(state, "moon");
    run(state, 3);
    expect(beginAscent(state)).toBe(true);
    expect(run(state, 3)).toEqual(["enterSpace", "tookOff"]);
    expect(state.phase).toBe("idle");
    expect(state.body).toBeNull();
  });

  it("only takes off from the surface", () => {
    expect(beginAscent(createLandingState())).toBe(false);
  });
});

describe("terrain", () => {
  it.each([MOON_SURFACE, MARS_SURFACE])("is deterministic for $id", (surface) => {
    const a = createTerrain(surface);
    const b = createTerrain(surface);
    expect(a.heightAt(123, -456)).toBe(b.heightAt(123, -456));
  });

  it.each([MOON_SURFACE, MARS_SURFACE])("keeps the $id landing pad flat", (surface) => {
    const terrain = createTerrain(surface);
    const [x, z] = surface.spawn;
    expect(Math.abs(terrain.heightAt(x, z))).toBeLessThan(0.5);
  });

  it.each([MOON_SURFACE, MARS_SURFACE])("rises into hills at the $id map edge", (surface) => {
    const terrain = createTerrain(surface);
    const edge = surface.terrain.rimRadius * 1.4;
    expect(terrain.heightAt(edge, 0)).toBeGreaterThan(surface.terrain.rimHeight * 0.5);
  });

  it.each([MOON_SURFACE, MARS_SURFACE])("puts $id energy stars above the ground", (surface) => {
    const terrain = createTerrain(surface);
    for (const pickup of terrain.pickups) {
      expect(pickup.position.y).toBeGreaterThan(terrain.heightAt(pickup.position.x, pickup.position.z) + 10);
    }
  });
});
