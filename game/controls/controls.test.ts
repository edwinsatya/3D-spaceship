import { afterEach, describe, expect, it, vi } from "vitest";
import { GAMEPAD } from "@/game/config/controls";
import { GamepadSource } from "./gamepad";
import { bindingMap } from "./keyboardMouse";
import { applyInputSettings, inputTuning } from "./tuning";
import { createSteeringSample } from "./types";

const baseControls = { bindings: {}, sensitivity: 1, invertY: false, gyro: false, gyroSensitivity: 1 };

function fakePad(axes: number[], pressedButtons: number[] = [], values: Record<number, number> = {}): Gamepad {
  const buttons = Array.from({ length: 17 }, (_, index) => ({
    pressed: pressedButtons.includes(index),
    touched: false,
    value: values[index] ?? (pressedButtons.includes(index) ? 1 : 0),
  }));
  return { connected: true, axes, buttons, id: "Test pad", index: 0, mapping: "standard", timestamp: 0, vibrationActuator: null } as unknown as Gamepad;
}

afterEach(() => {
  vi.unstubAllGlobals();
  applyInputSettings(baseControls);
});

describe("key bindings", () => {
  it("uses defaults and lets a remap win", () => {
    expect(bindingMap({}).get("KeyF")).toBe("orbit");
    const remapped = bindingMap({ photo: ["KeyF"], orbit: [] });
    expect(remapped.get("KeyF")).toBe("photo");
    expect(remapped.get("KeyV")).toBeUndefined();
  });
});

describe("gamepad", () => {
  it("steers with the left stick, throttles with the triggers and boosts with A", () => {
    vi.stubGlobal("navigator", { getGamepads: () => [fakePad([0.8, -1], [GAMEPAD.buttons.boost], { [GAMEPAD.buttons.throttle]: 0.7 })] });
    const out = createSteeringSample();
    new GamepadSource(() => {}).sample(1 / 60, out);
    expect(out.active).toBe(true);
    expect(out.yaw).toBeGreaterThan(0.5);
    expect(out.pitch).toBeCloseTo(1); // stick up = nose up
    expect(out.throttleDelta).toBeCloseTo(0.7);
    expect(out.boost).toBe(true);
  });

  it("ignores a resting stick inside the deadzone", () => {
    vi.stubGlobal("navigator", { getGamepads: () => [fakePad([0.05, 0.08])] });
    const out = createSteeringSample();
    new GamepadSource(() => {}).sample(1 / 60, out);
    expect(out.active).toBe(false);
  });

  it("flips up/down with invert Y and scales with sensitivity", () => {
    vi.stubGlobal("navigator", { getGamepads: () => [fakePad([0.3, -0.3])] });
    const normal = createSteeringSample();
    new GamepadSource(() => {}).sample(1 / 60, normal);
    applyInputSettings({ ...baseControls, invertY: true, sensitivity: 2 });
    expect(inputTuning.invertY).toBe(true);
    const tuned = createSteeringSample();
    new GamepadSource(() => {}).sample(1 / 60, tuned);
    expect(Math.sign(tuned.pitch)).toBe(-Math.sign(normal.pitch));
    expect(Math.abs(tuned.yaw)).toBeGreaterThan(Math.abs(normal.yaw));
  });
});
