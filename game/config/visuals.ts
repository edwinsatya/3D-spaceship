/** Presentation tuning for 3D entities (not gameplay). */
export const VISUALS = {
  /** Camera distances (u) at which planets switch to lower-detail meshes. */
  lod: {
    earth: [0, 900, 2200],
    moon: [0, 700, 1800],
  },
  /** Cloud shell radius as a multiple of the planet radius. */
  cloudScale: 1.012,
  /** Tileable detail texture: size (px) and repeats across the Earth's UV (u, v). */
  detail: { size: 256, earthRepeat: [160, 80] as const, cloudRepeat: [110, 55] as const },
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
  surface: {
    /** Landing-site ground mesh: side length (u); segments come from the quality tier. */
    size: 3400,
    /** Scale of the procedural props (lander, rover, helicopter). */
    propScale: 1.6,
    beacon: { height: 90, radius: 1.3, visitedOpacity: 0.25 },
    /** Earth in the lunar sky: distance from the camera (u) and radius (~7° wide; really ~2°). */
    earthInSky: { distance: 6000, radius: 380 },
    /** Mars sky dome radius (kept inside camera.far). */
    skyRadius: 8000,
  },
} as const;
