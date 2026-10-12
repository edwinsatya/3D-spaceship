/** Default keyboard bindings (KeyboardEvent.code). Remapping arrives in Phase 4. */
export const KEY_BINDINGS = {
  throttleUp: ["KeyW"],
  throttleDown: ["KeyS"],
  rollLeft: ["KeyA"],
  rollRight: ["KeyD"],
  pitchUp: ["ArrowUp"],
  pitchDown: ["ArrowDown"],
  yawLeft: ["ArrowLeft"],
  yawRight: ["ArrowRight"],
  boost: ["ShiftLeft", "ShiftRight", "Space"],
  toggleCamera: ["KeyC"],
  pause: ["Escape", "KeyP"],
  mute: ["KeyM"],
} as const;

export type KeyAction = keyof typeof KEY_BINDINGS;

export const MOUSE = {
  /** Normalized radius (0..1 of half the short screen side) treated as center. */
  deadzone: 0.06,
  /** Fraction of half the short screen side that gives full deflection. */
  fullDeflection: 0.75,
  /** Response curve exponent (>1 = finer control near center). */
  curve: 1.35,
  /** Pixels the mouse must move to retake steering from the arrow keys. */
  retakeThresholdPx: 6,
  /**
   * After a run starts the cursor usually sits on the Start button. Mouse
   * steering arms once the cursor enters this normalized radius around the
   * centre, or after it travels this many pixels.
   */
  armRadius: 0.4,
  armDistancePx: 160,
} as const;

export const KEYBOARD_STEER = {
  /** Arrow keys ramp to full deflection at this rate (1/s) for an analog feel. */
  rampRate: 5,
} as const;

export const TOUCH = {
  /** Joystick radius in CSS px. */
  joystickRadius: 64,
  /** Joystick resting position (px from the bottom-left corner). */
  joystickRest: 40,
  joystickDeadzone: 0.08,
  joystickCurve: 1.25,
  /** Haptic pulse lengths (ms). */
  haptics: {
    ring: 25,
    pickup: 15,
    collision: [40, 30, 60] as number[],
    boost: 12,
  },
} as const;
