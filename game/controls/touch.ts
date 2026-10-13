import { TOUCH } from "@/game/config/controls";
import { clamp, shapeAxis } from "@/game/systems/math";
import { analogPitch, inputTuning } from "./tuning";
import type { InputSource, SteeringSample } from "./types";

/**
 * Written by the on-screen touch controls (React components), read once per
 * frame by TouchSource. Plain mutable object: no React state per frame.
 */
export interface TouchControlsState {
  /** Joystick deflection -1..1 (y up). */
  stickX: number;
  stickY: number;
  stickActive: boolean;
  /** Absolute throttle while the lever is being dragged, otherwise null. */
  throttle: number | null;
  boost: boolean;
}

export const touchControls: TouchControlsState = {
  stickX: 0,
  stickY: 0,
  stickActive: false,
  throttle: null,
  boost: false,
};

export function resetTouchControls(): void {
  touchControls.stickX = 0;
  touchControls.stickY = 0;
  touchControls.stickActive = false;
  touchControls.throttle = null;
  touchControls.boost = false;
}

export class TouchSource implements InputSource {
  readonly id = "touch";

  sample(_dt: number, out: SteeringSample): void {
    const state = touchControls;
    if (state.stickActive) {
      const gain = inputTuning.sensitivity;
      out.yaw = shapeAxis(clamp(state.stickX * gain, -1, 1), TOUCH.joystickDeadzone, TOUCH.joystickCurve);
      out.pitch = analogPitch(shapeAxis(clamp(state.stickY * gain, -1, 1), TOUCH.joystickDeadzone, TOUCH.joystickCurve));
      out.active = true;
    }
    if (state.throttle !== null) {
      out.throttleAbsolute = state.throttle;
      out.active = true;
    }
    if (state.boost) {
      out.boost = true;
      out.active = true;
    }
  }

  dispose(): void {
    resetTouchControls();
  }
}
