import type { Localized } from "@/game/i18n/types";
import { EARTH, type BodyId, type LocationId, type Vec3Tuple } from "./planets";

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
  /** Constant height above the orbital plane (e.g. skimming over Saturn's rings). */
  heightOffset?: number;
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

/** Where missions take place; a route unlocks with stars (see game/data/unlocks.ts). */
export type RouteId = "earth-orbit";

export interface RouteDefinition {
  id: RouteId;
  name: Localized;
  /** Body drawn as the route's icon. */
  icon: BodyId;
}

export const ROUTES: Record<RouteId, RouteDefinition> = {
  "earth-orbit": { id: "earth-orbit", name: { en: "Earth orbit", id: "Orbit Bumi" }, icon: "earth" },
};

export const ROUTE_ORDER: readonly RouteId[] = ["earth-orbit"];

/** Lower is better (seconds) or higher is better (0–100 score, e.g. photos). */
export type MissionRating =
  | { kind: "time"; three: number; two: number }
  | { kind: "score"; three: number; two: number };

export type MissionObjective = {
  type: "rings";
  course: RingCourseParams;
  energyStars: EnergyStarParams;
};

export type ObjectiveType = MissionObjective["type"];

export interface MissionDefinition {
  id: MissionId;
  route: RouteId;
  /** Location scene the mission is flown in. */
  location: LocationId;
  name: Localized;
  description: Localized;
  objective: MissionObjective;
  /** Any finished run earns at least one star. */
  rating: MissionRating;
}

export const ORBIT_RINGS_COURSE: RingCourseParams = {
  center: EARTH.position,
  planeNormal: [0.16, 1, -0.12],
  baseRadius: 240,
  radialWobble: 10,
  radialWobbleFrequency: 2,
  heightWave: 26,
  heightWaveFrequency: 3,
  startAngleFromSun: 0.9,
  ringCount: 12,
  ringRadius: 10,
  arc: 12 / 13,
};

/** Earth's asteroids: scenery of the home location, kept clear of the Orbit Rings course. */
export const EARTH_ASTEROID_FIELD: AsteroidFieldParams = {
  seed: 42,
  count: 36,
  minRadius: 2.5,
  maxRadius: 7.5,
  radialMin: 0,
  radialMax: 90,
  heightSpread: 70,
  corridorClearance: 12,
  nearLineCount: 10,
  nearLineDistance: 6,
};

/** Weaving loop through the asteroid belt around Ceres. */
export const BELT_SLALOM_COURSE: RingCourseParams = {
  center: [0, 0, 0],
  planeNormal: [0.1, 1, 0.05],
  baseRadius: 380,
  radialWobble: 90,
  radialWobbleFrequency: 3,
  heightWave: 70,
  heightWaveFrequency: 2,
  startAngleFromSun: 0.4,
  ringCount: 14,
  ringRadius: 9,
  arc: 0.75,
};

/** The belt itself: crowded on purpose (the real one is mostly empty space). */
export const BELT_ASTEROID_FIELD: AsteroidFieldParams = {
  seed: 77,
  count: 240,
  minRadius: 2.5,
  maxRadius: 12,
  radialMin: -260,
  radialMax: 420,
  heightSpread: 140,
  corridorClearance: 10,
  nearLineCount: 40,
  nearLineDistance: 5,
};

/** Saturn's pole: the planet group is tilted about Z by its axial tilt (26.73°). */
const SATURN_POLE: Vec3Tuple = [-Math.sin((26.73 * Math.PI) / 180), Math.cos((26.73 * Math.PI) / 180), 0];

/** Low pass over the B ring, weaving across the Cassini division. */
export const SATURN_RUN_COURSE: RingCourseParams = {
  center: [0, 0, 0],
  planeNormal: SATURN_POLE,
  baseRadius: 1080,
  radialWobble: 70,
  radialWobbleFrequency: 4,
  heightWave: 10,
  heightWaveFrequency: 3,
  heightOffset: 30,
  startAngleFromSun: -0.6,
  ringCount: 12,
  ringRadius: 10,
  arc: 0.27,
};

/** Ring boulders just around the ring plane, clear of the run's racing line. */
export const SATURN_BOULDER_FIELD: AsteroidFieldParams = {
  seed: 91,
  count: 60,
  minRadius: 3,
  maxRadius: 9,
  radialMin: -250,
  radialMax: 300,
  heightSpread: 18,
  corridorClearance: 11,
  nearLineCount: 14,
  nearLineDistance: 4,
};

export const ORBIT_RINGS: MissionDefinition = {
  id: "orbit-rings",
  route: "earth-orbit",
  location: "earth",
  name: { id: "Cincin Orbit", en: "Orbit Rings" },
  description: {
    id: "Lewati 12 cincin yang mengelilingi Bumi secepat mungkin!",
    en: "Fly through 12 rings circling Earth as fast as you can!",
  },
  objective: {
    type: "rings",
    course: ORBIT_RINGS_COURSE,
    energyStars: { afterRings: [0, 2, 4, 6, 8, 10], sideOffset: 6 },
  },
  rating: { kind: "time", three: 28, two: 42 },
};

export const MISSIONS: Record<MissionId, MissionDefinition> = {
  "orbit-rings": ORBIT_RINGS,
};

/** Mission select order (also the unlock order). */
export const MISSION_ORDER: readonly MissionId[] = ["orbit-rings"];

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && value in MISSIONS;
}
