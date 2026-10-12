export const HANGAR = {
  /** Test flight length (s) before returning to the hangar. */
  testFlightDuration: 45,
  /** Turntable auto-rotation (rad/s). */
  autoSpin: 0.35,
  /** Drag → spin conversion (rad per px) and its decay (1/s). */
  dragSensitivity: 0.012,
  spinDecay: 3,
  /** Camera framing relative to the hovering ship (3/4 top view shows decals). */
  camera: { distance: 7.2, height: 5.4, angle: 0.75, lookDrop: 0.3 },
} as const;
