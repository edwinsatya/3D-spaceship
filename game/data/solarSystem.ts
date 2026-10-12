import { EXPLORATION } from "@/game/config/exploration";
import { WORLD } from "@/game/config/world";
import { clamp } from "@/game/systems/math";
import { BODIES, type BodyId, type LocationId, type Vec3Tuple } from "./planets";

/** Where each location sits on the 2D Solar System map (Sun at the centre). */
export interface MapPlacement {
  /** 0..1 of the map's half-size (compressed, not to scale). */
  orbitRadius: number;
  /** Radians, counter-clockwise from +X (map: x right, z down). */
  angle: number;
}

/** Earth's map angle follows the Phase 1 lighting so its course stays identical. */
const EARTH_ANGLE = Math.atan2(-WORLD.sunDirection[2], -WORLD.sunDirection[0]);

export const MAP_LAYOUT: Record<LocationId, MapPlacement> = {
  sun: { orbitRadius: 0, angle: 0 },
  mercury: { orbitRadius: 0.14, angle: 0.3 },
  venus: { orbitRadius: 0.22, angle: 3.7 },
  earth: { orbitRadius: 0.31, angle: EARTH_ANGLE },
  mars: { orbitRadius: 0.41, angle: 1.05 },
  jupiter: { orbitRadius: 0.56, angle: 2.75 },
  saturn: { orbitRadius: 0.7, angle: 4.25 },
  uranus: { orbitRadius: 0.83, angle: 0.25 },
  neptune: { orbitRadius: 0.95, angle: 5.35 },
};

/** Which bodies live in each location scene (the first one is the primary). */
export const LOCATION_BODIES: Record<LocationId, readonly BodyId[]> = {
  sun: ["sun"],
  mercury: ["mercury"],
  venus: ["venus"],
  earth: ["earth", "moon"],
  mars: ["mars"],
  jupiter: ["jupiter"],
  saturn: ["saturn"],
  uranus: ["uranus"],
  neptune: ["neptune"],
};

function normalize([x, y, z]: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/** Direction towards the Sun inside a location scene (unit vector). */
export function sunDirectionFor(location: LocationId): Vec3Tuple {
  if (location === "earth") return normalize(WORLD.sunDirection);
  if (location === "sun") return [0, 1, 0];
  const { angle } = MAP_LAYOUT[location];
  return normalize([-Math.cos(angle), EXPLORATION.sunElevation, -Math.sin(angle)]);
}

/** Apparent sun size and light strength relative to Earth (artistic falloff). */
export function sunlightFor(location: LocationId): { size: number; intensity: number } {
  if (location === "sun") return { size: 0, intensity: 1 };
  const au = BODIES[location].distanceAu;
  const size = clamp(Math.pow(au, EXPLORATION.sunSizeExponent), ...EXPLORATION.sunSizeRange);
  const intensity = clamp(Math.pow(au, EXPLORATION.sunLightExponent), ...EXPLORATION.sunLightRange);
  return { size, intensity };
}

export function mapPosition(location: LocationId): { x: number; y: number } {
  const { orbitRadius, angle } = MAP_LAYOUT[location];
  return { x: Math.cos(angle) * orbitRadius, y: Math.sin(angle) * orbitRadius };
}
