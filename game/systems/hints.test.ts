import { describe, expect, it } from "vitest";
import { createHintState, updateHints, type HintContext } from "./hints";

function context(overrides: Partial<HintContext> = {}): HintContext {
  return {
    device: "desktop",
    mode: "mission",
    active: true,
    timeSinceStart: 0,
    objective: "rings",
    objectivesDone: 0,
    carrying: false,
    steerAmount: 0,
    throttleRaised: false,
    boostUsed: false,
    rollUsed: false,
    cameraToggled: false,
    pickupsCollected: 0,
    nearestPickupDistance: Infinity,
    collisions: 0,
    targetOffscreenTime: 0,
    boostEnergy: 1,
    orbitAvailable: false,
    orbited: false,
    landAvailable: false,
    landed: false,
    mapOpened: false,
    ...overrides,
  };
}

describe("contextual hints", () => {
  it("shows the steering hint first and completes it when the player steers", () => {
    const state = createHintState();
    expect(updateHints(state, context(), 0.1).changed).toBe(true);
    expect(state.active).toBe("steer");

    updateHints(state, context({ steerAmount: 2 }), 0.5);
    expect(state.active).toBe("steer");
    const update = updateHints(state, context({ steerAmount: 2 }), 1);
    expect(update.completed).toBe("steer");
    expect(state.active).toBeNull();
  });

  it("silently completes hints the player already performed", () => {
    const state = createHintState(["steer"]);
    const update = updateHints(state, context({ timeSinceStart: 1, throttleRaised: true }), 0.1);
    expect(update.completed).toBe("throttle");
    expect(update.changed).toBe(false);
  });

  it("does not show anything while the player has no control", () => {
    const state = createHintState();
    updateHints(state, context({ active: false }), 0.1);
    expect(state.active).toBeNull();
  });

  it("skips desktop-only hints on touch devices", () => {
    const all = ["steer", "throttle", "ring", "boost", "energy", "followArrow", "collision", "camera", "orbit", "map"] as const;
    const state = createHintState(all);
    updateHints(state, context({ device: "touch", objectivesDone: 5 }), 0.1);
    expect(state.active).toBeNull();
  });

  it("hides a hint after its max duration and retries later", () => {
    const state = createHintState();
    updateHints(state, context(), 0.1);
    expect(state.active).toBe("steer");
    for (let i = 0; i < 100; i++) updateHints(state, context(), 0.1);
    expect(state.active).not.toBe("steer");
    expect(state.completed.has("steer")).toBe(false);
  });

  it("does not auto-complete the state-based follow-arrow hint", () => {
    const state = createHintState(["steer", "throttle"]);
    const update = updateHints(state, context({ timeSinceStart: 1.5 }), 0.1);
    expect(update.completed).toBeNull();
  });
});
