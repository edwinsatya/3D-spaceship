import type { Localized } from "@/game/i18n/types";
import { EARTH, type Vec3Tuple } from "./planets";

export type MissionId = "orbit-rings";

export interface RingCourseParams {
  center: Vec3Tuple;
  /** Normal of the orbital plane the course loops in. */
  planeNormal: Vec3Tuple;
  baseRadius: number;
  radialWobble: number;
  radialWobbleFrequency: number;
  heightWave: number;
  heightWaveFrequency: number;
  /** Start angle (rad) measured from the sub-solar direction, in travel direction. */
  startAngleFromSun: number;
  ringCount: number;
  /** Ring opening radius (u). */
  ringRadius: number;
  /** Fraction of a full orbit from spawn to the last ring. */
  arc: number;
}

export interface AsteroidFieldParams {
  seed: number;
  count: number;
  minRadius: number;
  maxRadius: number;
  /** Radial band around the course base radius (u). */
  radialMin: number;
  radialMax: number;
  heightSpread: number;
  /** Minimum gap between an asteroid surface and the racing line (u). */
  corridorClearance: number;
  /** How many asteroids are deliberately placed just outside the corridor. */
  nearLineCount: number;
  nearLineDistance: number;
}

export interface EnergyStarParams {
  /** Star sits halfway between ring `i` and ring `i + 1` for each listed index. */
  afterRings: readonly number[];
  /** Sideways offset from the racing line (u), alternating sides. */
  sideOffset: number;
}

export interface MissionDefinition {
  id: MissionId;
  name: Localized;
  description: Localized;
  course: RingCourseParams;
  /** Finish time thresholds in seconds; slower than `two` still earns 1 star. */
  starThresholds: { three: number; two: number };
  asteroids: AsteroidFieldParams;
  energyStars: EnergyStarParams;
}

export const ORBIT_RINGS: MissionDefinition = {
  id: "orbit-rings",
  name: { id: "Cincin Orbit", en: "Orbit Rings" },
  description: {
    id: "Lewati 12 cincin yang mengelilingi Bumi secepat mungkin!",
    en: "Fly through 12 rings circling Earth as fast as you can!",
  },
  course: {
    center: EARTH.position,
    planeNormal: [0.16, 1, -0.12],
    baseRadius: 232,
    radialWobble: 22,
    radialWobbleFrequency: 2,
    heightWave: 30,
    heightWaveFrequency: 3,
    startAngleFromSun: 0.9,
    ringCount: 12,
    ringRadius: 10,
    arc: 12 / 13,
  },
  starThresholds: { three: 28, two: 42 },
  asteroids: {
    seed: 42,
    count: 36,
    minRadius: 2.5,
    maxRadius: 7.5,
    radialMin: -60,
    radialMax: 80,
    heightSpread: 70,
    corridorClearance: 12,
    nearLineCount: 10,
    nearLineDistance: 6,
  },
  energyStars: {
    afterRings: [0, 2, 4, 6, 8, 10],
    sideOffset: 6,
  },
};

export const MISSIONS: Record<MissionId, MissionDefinition> = {
  "orbit-rings": ORBIT_RINGS,
};
