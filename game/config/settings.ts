/** Defaults and ranges for the player's device settings (Settings screen). */
export const SETTINGS = {
  volume: {
    /** 0..1 sliders; multiplied with the mix levels in AUDIO. */
    master: 1,
    music: 0.8,
    effects: 1,
    engine: 1,
  },
  controls: {
    /** Multiplies how far the cursor / stick has to move for full deflection. */
    sensitivity: { min: 0.5, max: 2, default: 1 },
    gyroSensitivity: { min: 0.5, max: 2, default: 1 },
    /** Phone tilt (degrees) for full deflection at sensitivity 1. */
    gyroFullTilt: 28,
    gyroDeadzone: 0.06,
  },
  /** Root font scale per text size option. */
  textScale: { normal: 1, large: 1.15, xlarge: 1.3 },
} as const;
