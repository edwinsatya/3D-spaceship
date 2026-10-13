import type { Localized } from "@/game/i18n/types";
import type { PhotoTargetId } from "./photoTargets";
import { EARTH, type BodyId, type LocationId, type Vec3Tuple } from "./planets";

export type MissionId =
  | "orbit-rings"
  | "station-delivery"
  | "red-spot-photo"
  | "belt-slalom"
  | "crystal-hunt"
  | "saturn-ring-run"
  | "saturn-portrait";

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
export type RouteId = "earth-orbit" | "space-station" | "jupiter" | "asteroid-belt" | "saturn-rings";

export interface RouteDefinition {
  id: RouteId;
  name: Localized;
  /** Body drawn as the route's icon. */
  icon: BodyId;
}

export const ROUTES: Record<RouteId, RouteDefinition> = {
  "earth-orbit": { id: "earth-orbit", name: { en: "Earth orbit", id: "Orbit Bumi" }, icon: "earth" },
  "space-station": { id: "space-station", name: { en: "Space station", id: "Stasiun luar angkasa" }, icon: "earth" },
  jupiter: { id: "jupiter", name: { en: "Jupiter", id: "Jupiter" }, icon: "jupiter" },
  "asteroid-belt": { id: "asteroid-belt", name: { en: "Asteroid belt", id: "Sabuk asteroid" }, icon: "ceres" },
  "saturn-rings": { id: "saturn-rings", name: { en: "Saturn's rings", id: "Cincin Saturnus" }, icon: "saturn" },
};

export const ROUTE_ORDER: readonly RouteId[] = ["earth-orbit", "space-station", "jupiter", "asteroid-belt", "saturn-rings"];

/** Lower is better (seconds) or higher is better (0–100 score, e.g. photos). */
export type MissionRating =
  | { kind: "time"; three: number; two: number }
  | { kind: "score"; three: number; two: number };

/** Crystals float right next to asteroids of the location's rock field. */
export interface CrystalFieldParams {
  seed: number;
  count: number;
  /** Distance range from the location's centre (u). */
  minDistance: number;
  maxDistance: number;
  /** Gap between a crystal and the rock it hugs (u). */
  hugGap: number;
  /** Minimum spacing between crystals (u). */
  spacing: number;
}

export type MissionObjective =
  | { type: "rings"; course: RingCourseParams; energyStars: EnergyStarParams }
  | { type: "collect"; crystals: CrystalFieldParams }
  /** Pick up each pod and fly it through the station's docking gate. */
  | { type: "delivery"; pods: readonly Vec3Tuple[] }
  /** Take a picture of a subject in photo mode; rated by how good the shot is. */
  | { type: "photo"; target: PhotoTargetId };

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
  radialWobble: 35,
  radialWobbleFrequency: 3,
  heightWave: 10,
  heightWaveFrequency: 3,
  heightOffset: 30,
  startAngleFromSun: -0.6,
  ringCount: 12,
  ringRadius: 10,
  arc: 0.32,
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

export const ORBIT_RINGS_STARS: EnergyStarParams = { afterRings: [0, 2, 4, 6, 8, 10], sideOffset: 6 };

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
    energyStars: ORBIT_RINGS_STARS,
  },
  rating: { kind: "time", three: 28, two: 42 },
};

export const STATION_DELIVERY: MissionDefinition = {
  id: "station-delivery",
  route: "space-station",
  location: "earth",
  name: { en: "Station Delivery", id: "Antar ke Stasiun" },
  description: {
    en: "Three cargo pods are floating around Earth. Pick each one up and fly it through the station's docking ring!",
    id: "Tiga kontainer kargo melayang di sekitar Bumi. Ambil satu per satu dan terbangkan melewati cincin dok stasiun!",
  },
  objective: {
    type: "delivery",
    pods: [
      [-420, 300, 120],
      [40, 400, 120],
      [-60, 190, 520],
    ],
  },
  rating: { kind: "time", three: 62, two: 85 },
};

export const RED_SPOT_PHOTO: MissionDefinition = {
  id: "red-spot-photo",
  route: "jupiter",
  location: "jupiter",
  name: { en: "Storm Portrait", id: "Potret Badai" },
  description: {
    en: "Take a portrait of Jupiter's Great Red Spot, a storm bigger than Earth. Open photo mode, frame it well and press the shutter!",
    id: "Potret Bintik Merah Besar di Jupiter, badai yang lebih besar dari Bumi. Buka mode foto, bingkai dengan bagus, lalu tekan tombol rana!",
  },
  objective: { type: "photo", target: "red-spot" },
  rating: { kind: "score", three: 80, two: 55 },
};

export const SATURN_PORTRAIT: MissionDefinition = {
  id: "saturn-portrait",
  route: "saturn-rings",
  location: "saturn",
  name: { en: "Ringed Giant", id: "Raksasa Bercincin" },
  description: {
    en: "Photograph all of Saturn with its rings wide open, lit by the Sun — like the Cassini spacecraft did.",
    id: "Foto seluruh Saturnus dengan cincinnya terbuka lebar dan disinari Matahari — seperti yang dilakukan wahana Cassini.",
  },
  objective: { type: "photo", target: "saturn" },
  rating: { kind: "score", three: 80, two: 55 },
};

export const BELT_SLALOM: MissionDefinition = {
  id: "belt-slalom",
  route: "asteroid-belt",
  location: "ceres",
  name: { en: "Belt Slalom", id: "Slalom Sabuk" },
  description: {
    en: "Weave through 14 rings between the rocks of the asteroid belt around Ceres.",
    id: "Meliuk melewati 14 cincin di antara batu-batu sabuk asteroid di sekitar Ceres.",
  },
  objective: {
    type: "rings",
    course: BELT_SLALOM_COURSE,
    energyStars: { afterRings: [1, 4, 7, 10], sideOffset: 5 },
  },
  rating: { kind: "time", three: 39, two: 58 },
};

export const CRYSTAL_HUNT: MissionDefinition = {
  id: "crystal-hunt",
  route: "asteroid-belt",
  location: "ceres",
  name: { en: "Crystal Hunt", id: "Berburu Kristal" },
  description: {
    en: "Glowing crystals cling to rocks all over the belt. Collect all 10 — in any order you like!",
    id: "Kristal bercahaya menempel di batu-batu di seluruh sabuk. Kumpulkan ke-10 kristal — urutannya bebas!",
  },
  objective: {
    type: "collect",
    crystals: { seed: 5, count: 10, minDistance: 160, maxDistance: 620, hugGap: 5, spacing: 80 },
  },
  rating: { kind: "time", three: 58, two: 80 },
};

export const SATURN_RING_RUN: MissionDefinition = {
  id: "saturn-ring-run",
  route: "saturn-rings",
  location: "saturn",
  name: { en: "Ring Run", id: "Lintas Cincin" },
  description: {
    en: "Race just above Saturn's rings and weave across the Cassini Division, the dark gap between the B and A rings.",
    id: "Berpacu tepat di atas cincin Saturnus dan meliuk melintasi Celah Cassini, celah gelap antara cincin B dan A.",
  },
  objective: {
    type: "rings",
    course: SATURN_RUN_COURSE,
    energyStars: { afterRings: [0, 2, 4, 6, 8, 10], sideOffset: 6 },
  },
  rating: { kind: "time", three: 41, two: 60 },
};

export const MISSIONS: Record<MissionId, MissionDefinition> = {
  "orbit-rings": ORBIT_RINGS,
  "station-delivery": STATION_DELIVERY,
  "red-spot-photo": RED_SPOT_PHOTO,
  "belt-slalom": BELT_SLALOM,
  "crystal-hunt": CRYSTAL_HUNT,
  "saturn-ring-run": SATURN_RING_RUN,
  "saturn-portrait": SATURN_PORTRAIT,
};

/** Mission select order (also the unlock order). */
export const MISSION_ORDER: readonly MissionId[] = [
  "orbit-rings",
  "station-delivery",
  "red-spot-photo",
  "belt-slalom",
  "crystal-hunt",
  "saturn-ring-run",
  "saturn-portrait",
];

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && value in MISSIONS;
}
