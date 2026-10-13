import { describe, expect, it } from "vitest";
import { SHIPS } from "@/game/data/ships";
import { engineSound } from "./synth";

describe("engine voices", () => {
  it.each(SHIPS.map((ship) => [ship.id, ship.engine] as const))("%s loops seamlessly", (_id, voice) => {
    // Every periodic part must complete whole cycles in the 2 s loop.
    expect(Number.isInteger(voice.base * 2)).toBe(true);
    expect(Number.isInteger(voice.throb * 2)).toBe(true);
    const { samples } = engineSound(voice);
    expect(samples.every(Number.isFinite)).toBe(true);
    // The end flows into the start: no jump bigger than a normal step.
    const jump = Math.abs(samples[0] - samples[samples.length - 1]);
    let step = 0;
    for (let i = 1; i < 2000; i++) step = Math.max(step, Math.abs(samples[i] - samples[i - 1]));
    expect(jump).toBeLessThanOrEqual(step * 1.5);
  });

  it("gives every ship a different sound", () => {
    const fingerprints = SHIPS.map((ship) => Array.from(engineSound(ship.engine).samples.slice(1000, 1010), (v) => v.toFixed(3)).join());
    expect(new Set(fingerprints).size).toBe(SHIPS.length);
  });
});
