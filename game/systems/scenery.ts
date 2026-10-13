import {
  BELT_ASTEROID_FIELD,
  BELT_SLALOM_COURSE,
  EARTH_ASTEROID_FIELD,
  ORBIT_RINGS_COURSE,
  SATURN_BOULDER_FIELD,
  SATURN_RUN_COURSE,
  type AsteroidFieldParams,
  type RingCourseParams,
} from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { generateAsteroids, generateCourse, type AsteroidSpec } from "./course";

const asteroidCache = new Map<LocationId, AsteroidSpec[]>();

/** Each rock field is kept clear of the race course flown at that location. */
const FIELDS: Partial<Record<LocationId, { field: AsteroidFieldParams; course: RingCourseParams }>> = {
  earth: { field: EARTH_ASTEROID_FIELD, course: ORBIT_RINGS_COURSE },
  ceres: { field: BELT_ASTEROID_FIELD, course: BELT_SLALOM_COURSE },
  saturn: { field: SATURN_BOULDER_FIELD, course: SATURN_RUN_COURSE },
};

function buildAsteroids(location: LocationId): AsteroidSpec[] {
  const entry = FIELDS[location];
  if (!entry) return [];
  const sun = sunDirectionFor(location);
  const course = generateCourse(entry.course, sun);
  return generateAsteroids(entry.field, entry.course, course, sun);
}

/** Asteroids that belong to a location (free flight and missions alike). Deterministic, cached. */
export function locationAsteroids(location: LocationId): AsteroidSpec[] {
  let asteroids = asteroidCache.get(location);
  if (!asteroids) {
    asteroids = buildAsteroids(location);
    asteroidCache.set(location, asteroids);
  }
  return asteroids;
}
