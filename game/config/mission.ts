export const MISSION = {
  /** Seconds per countdown step (3, 2, 1). */
  countdownStep: 0.8,
  countdownFrom: 3,
  /** Seconds of slow-motion after the last ring before the result screen. */
  finishDelay: 1.6,
  finishTimeScale: 0.35,
  /** Ring visuals. */
  ringTubeRadius: 0.75,
  ringPassScaleBoost: 0.6,
  ringPassFadeDuration: 0.55,
  /** Energy star pickup sphere radius (u). */
  pickupRadius: 4.5,
  /** Crystal (collect missions) and cargo pod (delivery missions) pickup radii (u). */
  crystalPickupRadius: 5,
  podPickupRadius: 6.5,
  /** A towed cargo pod hangs under the ship (below, behind; u) so it never blocks the chase camera. */
  podTow: { below: 4.2, behind: 1.2 },
  /** Free flight: seconds before a collected energy star respawns. */
  pickupRespawn: 12,
  /** HUD: ring/target marker shows on-screen inside this NDC margin. */
  targetScreenMargin: 0.86,
  /** Seconds the target must stay off-screen before the "follow the arrow" hint. */
  offscreenHintDelay: 2.5,
} as const;

export type MissionConfig = typeof MISSION;
