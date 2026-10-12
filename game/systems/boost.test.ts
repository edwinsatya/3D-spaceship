import { describe, expect, it } from "vitest";
import { BOOST } from "@/game/config/flight";
import { addBoostEnergy, createBoostState, updateBoost } from "./boost";

describe("boost energy", () => {
  it("starts on press and drains while held", () => {
    const state = createBoostState();
    expect(updateBoost(state, true, 0.1, BOOST)).toBe("started");
    expect(state.active).toBe(true);
    updateBoost(state, true, 1, BOOST);
    expect(state.energy).toBeCloseTo(1 - BOOST.drainPerSecond * 1.1);
  });

  it("ends when energy runs out and does not restart while still held", () => {
    const state = createBoostState();
    updateBoost(state, true, 0.01, BOOST);
    let ended = false;
    for (let i = 0; i < 200 && !ended; i++) ended = updateBoost(state, true, 0.05, BOOST) === "ended";
    expect(ended).toBe(true);
    expect(state.energy).toBe(0);
    for (let i = 0; i < 100; i++) expect(updateBoost(state, true, 0.05, BOOST)).not.toBe("started");
  });

  it("regenerates after the delay once released", () => {
    const state = createBoostState();
    state.energy = 0.5;
    updateBoost(state, true, 0.01, BOOST);
    expect(updateBoost(state, false, 0.01, BOOST)).toBe("ended");
    const afterRelease = state.energy;
    updateBoost(state, false, BOOST.regenDelay * 0.5, BOOST);
    expect(state.energy).toBeCloseTo(afterRelease);
    updateBoost(state, false, BOOST.regenDelay, BOOST);
    updateBoost(state, false, 1, BOOST);
    expect(state.energy).toBeGreaterThan(afterRelease);
  });

  it("denies a press without enough energy", () => {
    const state = createBoostState();
    state.energy = BOOST.minEnergyToStart / 2;
    expect(updateBoost(state, true, 0.01, BOOST)).toBe("denied");
    expect(state.active).toBe(false);
  });

  it("clamps pickups to the 0..1 range", () => {
    const state = createBoostState();
    state.energy = 0.9;
    addBoostEnergy(state, 0.5);
    expect(state.energy).toBe(1);
    addBoostEnergy(state, -2);
    expect(state.energy).toBe(0);
  });
});
