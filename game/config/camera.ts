export const CAMERA = {
  near: 0.1,
  far: 12000,
  fov: 62,
  /** FOV while boosting (FOV kick). */
  boostFov: 80,
  fovResponse: 4,

  /** Chase offset in ship-local space (ship forward is -Z). */
  chaseOffset: [0, 3, 8.5] as const,
  /** Extra pull-back at full boost (u). */
  chaseBoostPullback: 2.2,
  /** How fast the chase offset follows the ship's rotation (1/s). */
  chaseRotationResponse: 5.5,
  /** How fast the camera up vector follows the ship's roll (1/s). */
  chaseUpResponse: 3.5,
  /** Look-at point ahead of the ship (u). */
  lookAhead: 14,
  /** Look-at point below the ship's flight line so Earth's horizon stays in view (u). */
  chaseLookDrop: 1.6,

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
    /** Horizontal distance in front of the ship. */
    distance: 5.8,
    /** Height above the ship (Earth sits below it, so we look down). */
    height: 6.6,
    /** Look-at point below the ship so Earth fills the lower frame. */
    lookDrop: 0.6,
    sideOffset: 2.2,
    swayAngle: 0.28,
    swaySpeed: 0.05,
  },
  /** Result-screen orbit. */
  result: {
    distance: 11,
    height: 2.5,
    orbitSpeed: 0.18,
  },
} as const;

export type CameraConfig = typeof CAMERA;
