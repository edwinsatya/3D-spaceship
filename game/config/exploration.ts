/** Phase 2 exploration tuning: locations, warp, orbit autopilot, discovery, landing. */
export const EXPLORATION = {
  /** Sun height above the orbital plane when lighting a location (direction y before normalizing). */
  sunElevation: 0.26,
  /** Apparent sun size/brightness vs distance (artistic power laws, clamped). */
  sunSizeExponent: -0.55,
  sunSizeRange: [0.2, 1.7] as const,
  sunLightExponent: -0.3,
  sunLightRange: [0.45, 1.35] as const,

  /** Arrival point after a warp, in planet radii from its centre. */
  arrivalDistance: 2.7,
  /** Arrival at the Sun is further out (it is huge and very bright). */
  sunArrivalDistance: 3.1,
  /** Free flight: guide the player back beyond this many radii. */
  returnDistance: 9,
  /** First visit counts once the ship is within this many radii. */
  discoveryDistance: 4.2,

  warp: {
    charge: 0.9,
    tunnel: 1.6,
    arrive: 1.2,
    /** Fraction of the tunnel phase at which the scene switches. */
    switchAt: 0.45,
    chargeFov: 92,
    speedMultiplier: 2.2,
  },

  orbit: {
    /** Orbit prompt shows within this many radii of the surface centre. */
    range: 4,
    minRadius: 1.35,
    maxRadius: 2.0,
    /** Orbit speed = radius × factor, clamped (u/s). */
    speedFactor: 0.07,
    minSpeed: 22,
    maxSpeed: 55,
    /** Seconds to blend from free flight into the orbit path. */
    blendIn: 2,
    /** Strong steering for this long breaks out of orbit (s). */
    breakoutTime: 0.35,
    breakoutInput: 0.6,
    /** Camera sits outside the orbit looking in: the ship crosses in front of the planet. */
    camera: { out: 15, back: 7, side: 4, sway: 0.35, swaySpeed: 0.04, lookDepth: 40, response: 3, fov: 58 },
  },

  landing: {
    /** Land prompt within this altitude (× radius) above the surface. */
    promptAltitude: 1.2,
    descent: 3.2,
    fade: 0.7,
    ascent: 2.6,
    descentSpeed: 70,
    ascentSpeed: 75,
    /** Closest approach during the descent animation (× radius). */
    descentFloor: 1.12,
    /** After take-off you reappear this far from the body's centre (× radius). */
    exitDistance: 1.7,
  },

  surface: {
    /** Hover flight is slower and lower than open space. */
    speedScale: 0.7,
    clearance: 2.4,
    ceiling: 240,
    /** Soft wall: pushed back towards the centre beyond this radius (u). */
    boundary: 620,
    /** The scene fades in with the ship this high over the pad, then it settles down. */
    touchdownAltitude: 9,
    touchdownRate: 6,
    touchdownTrauma: 0.25,
    bounce: 0.55,
  },
} as const;
