export const CAMERA = {
  near: 0.1,
  far: 12000,
  fov: 62,
  /** FOV while boosting (FOV kick). */
  boostFov: 80,
  fovResponse: 4,

  /** Chase offset in ship-local space (ship forward is -Z). */
  chaseOffset: [0, 2.3, 8.2] as const,
  /** Extra pull-back at full boost (u). */
  chaseBoostPullback: 2.2,
  /** How fast the chase offset follows the ship's rotation (1/s). */
  chaseRotationResponse: 5.5,
  /** How fast the camera up vector follows the ship's roll (1/s). */
  chaseUpResponse: 3.5,
  /** Look-at point ahead of the ship (u). */
  lookAhead: 14,

  /** Cockpit eye position in ship-local space. */
  cockpitOffset: [0, 0.48, -0.55] as const,

  /** Screen shake (trauma model: offset = trauma² * max). */
  shakeDecay: 1.6,
  shakeMaxOffset: 0.35,
  shakeMaxRoll: 0.045,
  shakeFrequency: 22,
  collisionTrauma: 0.75,

  /** Menu → gameplay camera blend duration (s). */
  introBlendDuration: 1.3,
  /** Title-screen camera framing. */
  menu: {
    distance: 8.5,
    height: 1.3,
    sideOffset: 2.6,
    swayAngle: 0.28,
    swaySpeed: 0.09,
  },
  /** Result-screen orbit. */
  result: {
    distance: 11,
    height: 2.5,
    orbitSpeed: 0.18,
  },
} as const;

export type CameraConfig = typeof CAMERA;
