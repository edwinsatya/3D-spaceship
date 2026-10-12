import { describe, expect, it } from "vitest";
import { createWarpState, isWarping, startWarp, tickWarp, warpIntensity } from "./warp";

const timings = { charge: 1, tunnel: 2, arrive: 1, switchAt: 0.5 };

function run(state: ReturnType<typeof createWarpState>, seconds: number, dt = 0.05) {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += dt) {
    const event = tickWarp(state, dt, timings);
    if (event) events.push(event);
  }
  return events;
}

describe("warp sequence", () => {
  it("switches location once, hidden in the tunnel, then finishes", () => {
    const state = createWarpState();
    expect(startWarp(state, "jupiter")).toBe(true);
    expect(run(state, 1.5)).toEqual([]);
    expect(state.phase).toBe("tunnel");
    expect(run(state, 1)).toEqual(["switch"]);
    expect(warpIntensity(state, timings)).toBeGreaterThan(0.9);
    expect(run(state, 2)).toEqual(["done"]);
    expect(isWarping(state)).toBe(false);
    expect(state.target).toBeNull();
  });

  it("ignores a second warp while one is running", () => {
    const state = createWarpState();
    startWarp(state, "mars");
    expect(startWarp(state, "venus")).toBe(false);
    expect(state.target).toBe("mars");
  });

  it("fades the tunnel in and out", () => {
    const state = createWarpState();
    expect(warpIntensity(state, timings)).toBe(0);
    startWarp(state, "saturn");
    run(state, 3.2);
    expect(state.phase).toBe("arrive");
    const early = warpIntensity(state, timings);
    run(state, 0.5);
    expect(warpIntensity(state, timings)).toBeLessThan(early);
  });
});
