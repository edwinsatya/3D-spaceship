/** HUD presentation. Game units are converted with one consistent (artistic) scale. */
export const HUD = {
  /** Kilometres per world unit, used for both speed and distance read-outs. */
  unitKm: 0.07,
  /** Speed read-out step (km/h) so the number doesn't flicker. */
  speedStep: 50,
  /** Boost energy below this blinks as "low". */
  lowBoost: 0.2,
  /** Toast lifetime (ms). */
  toastDuration: 1100,
  /** Collision flash duration (ms). */
  collisionFlash: 380,
  /** Seconds between loading-screen facts. */
  factInterval: 4.5,
  /** Loading screen stays this long after reaching 100% (ms). */
  loadingSettle: 350,
  /** "GO!" stays on screen this long (ms). */
  goVisible: 800,
  /** "Planet discovered!" banner duration (ms). */
  discoveryDuration: 3600,
  /** Result-screen time count-up (s). */
  resultCountUp: 1.1,
} as const;
