import { describe, expect, it } from "vitest";
import { canTransition, nextPhase } from "./stateMachine";

describe("game state machine", () => {
  it("follows boot → loading → menu → playing", () => {
    expect(canTransition("boot", "loading")).toBe(true);
    expect(canTransition("loading", "menu")).toBe(true);
    expect(canTransition("menu", "playing")).toBe(true);
  });

  it("toggles between playing and paused", () => {
    expect(canTransition("playing", "paused")).toBe(true);
    expect(canTransition("paused", "playing")).toBe(true);
  });

  it("reaches result only from playing", () => {
    expect(canTransition("playing", "result")).toBe(true);
    expect(canTransition("paused", "result")).toBe(false);
    expect(canTransition("menu", "result")).toBe(false);
  });

  it("allows restarting and leaving from result", () => {
    expect(canTransition("result", "playing")).toBe(true);
    expect(canTransition("result", "menu")).toBe(true);
  });

  it("rejects skipping loading", () => {
    expect(canTransition("boot", "menu")).toBe(false);
    expect(nextPhase("boot", "playing")).toBe("boot");
  });
});
