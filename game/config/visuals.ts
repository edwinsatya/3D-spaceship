/** Presentation tuning for 3D entities (not gameplay). */
export const VISUALS = {
  /** Camera distances (u) at which planets switch to lower-detail meshes. */
  lod: {
    earth: [0, 900, 2200],
    moon: [0, 700, 1800],
  },
  /** Cloud shell radius as a multiple of the planet radius. */
  cloudScale: 1.012,
  ship: {
    /** Emissive multiplier for nozzle discs (drives bloom). */
    glowIntensity: 6,
    /** Flame length multipliers. */
    flameIdle: 0.35,
    flameThrottle: 1.2,
    flameBoost: 2.6,
    flameResponse: 8,
  },
  energyStar: {
    size: 1.5,
    haloSize: 4.5,
    spinSpeed: 2.2,
    bobAmplitude: 0.4,
    collectAnimation: 0.45,
    collectScale: 1.8,
  },
  trail: {
    /** A jump larger than this (u) between frames is a teleport: reset the trail. */
    teleportDistance: 60,
  },
} as const;
