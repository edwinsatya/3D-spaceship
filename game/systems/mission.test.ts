import { describe, expect, it } from "vitest";
import { canFly, createMissionState, passRing, startCountdown, tickMission } from "./mission";

const config = { countdownFrom: 3, countdownStep: 0.8 };

describe("mission countdown", () => {
  it("counts 3, 2, 1 then GO", () => {
    const state = createMissionState(12);
    expect(startCountdown(state, config)).toEqual({ type: "countdown", value: 3 });
    expect(canFly(state)).toBe(false);

    const ticks: string[] = [];
    for (let i = 0; i < 40; i++) {
      const tick = tickMission(state, 0.1, config);
      if (tick.type === "countdown") ticks.push(String(tick.value));
      if (tick.type === "go") ticks.push("GO");
    }
    expect(ticks).toEqual(["2", "1", "GO"]);
    expect(state.status).toBe("running");
    expect(canFly(state)).toBe(true);
  });
});

describe("mission timer", () => {
  function runningState() {
    const state = createMissionState(3);
    startCountdown(state, config);
    tickMission(state, 10, config);
    return state;
  }

  it("does not count time during the countdown", () => {
    const state = runningState();
    expect(state.elapsedMs).toBe(0);
  });

  it("accumulates elapsed time while running", () => {
    const state = runningState();
    tickMission(state, 0.5, config);
    tickMission(state, 0.25, config);
    expect(state.elapsedMs).toBeCloseTo(750);
  });

  it("does not advance when paused (dt = 0)", () => {
    const state = runningState();
    tickMission(state, 1, config);
    tickMission(state, 0, config);
    expect(state.elapsedMs).toBeCloseTo(1000);
  });

  it("finishes after the last ring and stops the clock", () => {
    const state = runningState();
    expect(passRing(state)).toBe(false);
    expect(passRing(state)).toBe(false);
    expect(passRing(state)).toBe(true);
    expect(state.status).toBe("finished");
    const finalTime = state.elapsedMs;
    tickMission(state, 2, config);
    expect(state.elapsedMs).toBe(finalTime);
  });

  it("ignores ring passes before the race starts", () => {
    const state = createMissionState(3);
    startCountdown(state, config);
    expect(passRing(state)).toBe(false);
    expect(state.nextRing).toBe(0);
  });
});
