import type { InputSource, SteeringSample } from "./types";

/**
 * Placeholder so the input pipeline already has a slot for gamepads.
 * Real mapping (sticks, triggers, remapping) is scheduled for Phase 4.
 */
export class GamepadSource implements InputSource {
  readonly id = "gamepad";

  sample(_dt: number, _out: SteeringSample): void {
    // Intentionally inactive until Phase 4.
  }

  dispose(): void {}
}
