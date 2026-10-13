import { EARTH_ASTEROID_FIELD, ORBIT_RINGS_COURSE } from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { generateAsteroids, generateCourse, type AsteroidSpec } from "./course";

const asteroidCache = new Map<LocationId, AsteroidSpec[]>();

function buildAsteroids(location: LocationId): AsteroidSpec[] {
  if (location === "earth") {
    const sun = sunDirectionFor("earth");
    const course = generateCourse(ORBIT_RINGS_COURSE, sun);
    return generateAsteroids(EARTH_ASTEROID_FIELD, ORBIT_RINGS_COURSE, course, sun);
  }
  return [];
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
