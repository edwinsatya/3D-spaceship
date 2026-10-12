/**
 * Flight tuning. Units: world units (u), seconds, radians.
 * Response values are exponential-approach rates (1/s): higher = snappier.
 */
export const FLIGHT = {
  /** Speed at throttle 0 (allows stopping to look around). */
  minSpeed: 0,
  /** Speed at throttle 1 (no boost). */
  maxSpeed: 48,
  /** Speed while boosting. */
  boostSpeed: 92,
  /** Throttle change per second while W/S is held. */
  throttleRate: 0.85,
  /** Throttle given to the player when a mission starts. */
  missionStartThrottle: 0.6,
  /** Throttle when entering free flight. */
  freeFlightStartThrottle: 0.45,
  accelResponse: 1.5,
  decelResponse: 2.2,
  boostResponse: 3.2,

  pitchRate: 1.55,
  yawRate: 1.25,
  rollRate: 2.8,
  /** Turn rate multiplier at boost speed (lerped from 1 at speed 0). */
  highSpeedTurnScale: 0.78,
  angularResponse: 7,
  /** Auto-level strength (1/s) when no roll input is given. */
  autoLevelRate: 1.4,
  /** Roll input below this counts as "no roll input". */
  rollInputDeadzone: 0.05,

  /** Visual-only banking of the ship mesh while yawing (radians at full yaw). */
  visualBankMax: 0.55,
  visualPitchMax: 0.12,
  visualResponse: 6,

  /** Ship collision sphere radius. */
  collisionRadius: 1.4,
} as const;

export const BOOST = {
  /** Energy drained per second while boosting (energy range 0..1). */
  drainPerSecond: 0.32,
  regenPerSecond: 0.14,
  /** Seconds after boost ends before regen starts. */
  regenDelay: 0.9,
  /** Minimum energy required to start a boost (prevents stutter). */
  minEnergyToStart: 0.12,
  /** Energy lost on a collision. */
  collisionPenalty: 0.3,
  /** Energy restored by an energy star. */
  pickupAmount: 0.35,
} as const;

export const COLLISION = {
  /** Bounciness of the knockback impulse. */
  restitution: 0.55,
  /** Minimum knockback speed so the ship always visibly bounces. */
  minBounceSpeed: 14,
  /** Forward speed multiplier applied on impact. */
  speedRetention: 0.35,
  /** Knockback velocity decay rate (1/s). */
  knockbackDecay: 2.4,
  /** Seconds between two collision events with the same body. */
  cooldown: 0.35,
  /** Extra margin added to planet atmosphere radii (keeps the camera out of the glow shell). */
  planetMargin: 1.5,
  /** Asteroid collision sphere vs. visual size (<1 = forgiving, no invisible hits). */
  asteroidRadiusScale: 0.85,
} as const;

type Numeric<T> = { -readonly [K in keyof T]: number };

/** Same keys as the constants but plain numbers, so ships can derive their own. */
export type FlightConfig = Numeric<typeof FLIGHT>;
export type BoostConfig = Numeric<typeof BOOST>;
export type CollisionConfig = typeof COLLISION;
