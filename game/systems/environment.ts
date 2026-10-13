import { Vector3 } from "three";
import { COLLISION } from "@/game/config/flight";
import { EXPLORATION } from "@/game/config/exploration";
import { BODIES, type BodyId, type CelestialBody, type LocationId } from "@/game/data/planets";
import { LOCATION_BODIES, sunDirectionFor, sunlightFor } from "@/game/data/solarSystem";
import { SURFACES, type SurfaceId } from "@/game/data/surfaces";
import { BELT_SLALOM_COURSE, ORBIT_RINGS_COURSE, ORBIT_RINGS_STARS } from "@/game/data/missions";
import { generateCourse, generateEnergyStars, toVector, type AsteroidSpec, type PickupSpec } from "./course";
import { locationAsteroids } from "./scenery";
import { stationLayout } from "./station";

function stationObstacles(): BodyCollider[] {
  return stationLayout().spheres.map((sphere) => ({
    id: null,
    center: sphere.center,
    radius: sphere.radius,
    surfaceRadius: sphere.radius,
  }));
}
import { smoothstep } from "./math";
import { createRandom } from "./random";
import type { Terrain } from "./terrain";

export interface BodyCollider {
  id: BodyId | null;
  center: Vector3;
  /** Collision sphere (atmosphere shell + margin for planets). */
  radius: number;
  /** Visual surface radius (altitude, auto-level, discovery). */
  surfaceRadius: number;
}

export interface Environment {
  location: LocationId;
  /** Set while on a landing site (the location stays the space scene you came from). */
  surface: SurfaceId | null;
  primary: CelestialBody;
  bodies: readonly CelestialBody[];
  colliders: BodyCollider[];
  sunDirection: Vector3;
  sunSize: number;
  sunIntensity: number;
  /** Free-flight energy stars around the primary. */
  pickups: PickupSpec[];
  /** Rocks that belong to the place (collide in free flight and missions). */
  asteroids: AsteroidSpec[];
  /** Man-made props to bump into (the station); not planets, so no orbit/landing/auto-level. */
  obstacles: BodyCollider[];
  /** The primary's ring disc (Saturn…): near it, "up" is the planet's pole, so the rings are the floor. */
  ringPlane: RingPlane | null;
}

export interface RingPlane {
  center: Vector3;
  normal: Vector3;
  inner: number;
  outer: number;
}

function ringPlaneFor(body: CelestialBody): RingPlane | null {
  if (!body.rings) return null;
  const tilt = (body.axialTilt * Math.PI) / 180;
  // Same tilt as the planet group: the pole is +Y rotated about Z.
  return {
    center: toVector(body.position),
    normal: new Vector3(-Math.sin(tilt), Math.cos(tilt), 0),
    inner: Math.min(...body.rings.bands.map((band) => band.from)) * body.radius,
    outer: Math.max(...body.rings.bands.map((band) => band.to)) * body.radius,
  };
}

const _relative = new Vector3();
const _pole = new Vector3();

/**
 * Auto-level "up" at a position: away from the nearest body, blending into
 * the ring plane's normal while you fly low over a ring disc. Allocation-free.
 */
export function referenceUpAt(environment: Environment, position: Vector3, target: Vector3): Vector3 {
  let best = Infinity;
  const colliders = environment.colliders;
  for (let i = 0; i < colliders.length; i++) {
    const collider = colliders[i];
    const altitude = position.distanceTo(collider.center) - collider.surfaceRadius;
    if (altitude < best) {
      best = altitude;
      target.subVectors(position, collider.center);
    }
  }
  target.normalize();
  const plane = environment.ringPlane;
  if (!plane) return target;
  _relative.subVectors(position, plane.center);
  const height = _relative.dot(plane.normal);
  const radial = Math.sqrt(Math.max(0, _relative.lengthSq() - height * height));
  const { ringZone } = EXPLORATION;
  const weight =
    (1 - smoothstep(ringZone.height * 0.6, ringZone.height, Math.abs(height))) *
    smoothstep(plane.inner * ringZone.innerFactor, plane.inner, radial) *
    (1 - smoothstep(plane.outer, plane.outer * ringZone.outerFactor, radial));
  if (weight <= 0) return target;
  _pole.copy(plane.normal).multiplyScalar(height >= 0 ? 1 : -1);
  return target.lerp(_pole, weight).normalize();
}

const PICKUPS_PER_LOCATION = 10;

function bodyCollider(body: CelestialBody): BodyCollider {
  return {
    id: body.id,
    center: toVector(body.position),
    radius: body.radius * (body.atmosphere?.scale ?? 1) + COLLISION.planetMargin,
    surfaceRadius: body.radius,
  };
}

/** Moon position in the planet's own (untilted) frame. */
export function moonletLocalPosition(planet: CelestialBody, index: number, target = new Vector3()): Vector3 {
  const moonlet = planet.moonlets?.[index];
  if (!moonlet) return target.set(0, 0, 0);
  const distance = planet.radius * moonlet.distance;
  return target.set(Math.cos(moonlet.angle) * distance, moonlet.elevation * distance, Math.sin(moonlet.angle) * distance);
}

/** Decorative moons orbit in the planet's tilted equatorial plane (location frame). */
export function moonletPosition(planet: CelestialBody, index: number, target = new Vector3()): Vector3 {
  moonletLocalPosition(planet, index, target);
  // Same tilt as the planet group (rotation about Z by the axial tilt).
  const tilt = (planet.axialTilt * Math.PI) / 180;
  const x = target.x * Math.cos(tilt) - target.y * Math.sin(tilt);
  const y = target.x * Math.sin(tilt) + target.y * Math.cos(tilt);
  return target.set(x, y, target.z).add(toVector(planet.position));
}

let earthStars: PickupSpec[] | null = null;

/** Earth's free-flight energy stars are the ones along the Orbit Rings course. */
export function homeEnergyStars(): PickupSpec[] {
  earthStars ??= generateEnergyStars(ORBIT_RINGS_STARS, ORBIT_RINGS_COURSE, sunDirectionFor("earth"));
  return earthStars;
}

/** Energy stars scattered in a loose shell around the location's planet. */
export function locationPickups(location: LocationId): PickupSpec[] {
  const primary = BODIES[location];
  const random = createRandom(primary.seed * 97 + 13);
  const pickups: PickupSpec[] = [];
  const minRadius = primary.radius * (location === "sun" ? 1.6 : 1.4);
  const maxRadius = primary.radius * (location === "sun" ? 2.4 : 2.6);
  for (let i = 0; i < PICKUPS_PER_LOCATION; i++) {
    const theta = random.range(0, Math.PI * 2);
    const y = random.range(-0.45, 0.45);
    const r = random.range(minRadius, maxRadius);
    const horizontal = Math.sqrt(1 - y * y);
    pickups.push({
      position: new Vector3(Math.cos(theta) * horizontal * r, y * r, Math.sin(theta) * horizontal * r).add(
        toVector(primary.position),
      ),
    });
  }
  return pickups;
}

/** Everything gameplay needs to know about a location (pure; unit-tested). */
export function buildEnvironment(location: LocationId): Environment {
  const ids = LOCATION_BODIES[location];
  const bodies = ids.map((id) => BODIES[id]);
  const primary = bodies[0];
  const colliders = bodies.filter((body) => body.solid).map(bodyCollider);
  for (const planet of bodies) {
    planet.moonlets?.forEach((moonlet, index) => {
      colliders.push({
        id: null,
        center: moonletPosition(planet, index),
        radius: moonlet.radius + COLLISION.planetMargin,
        surfaceRadius: moonlet.radius,
      });
    });
  }
  const sunlight = sunlightFor(location);
  return {
    location,
    surface: null,
    primary,
    bodies,
    colliders,
    sunDirection: toVector(sunDirectionFor(location)),
    sunSize: sunlight.size,
    sunIntensity: sunlight.intensity,
    pickups: location === "earth" ? homeEnergyStars() : locationPickups(location),
    asteroids: locationAsteroids(location),
    obstacles: location === "earth" ? stationObstacles() : [],
    ringPlane: ringPlaneFor(primary),
  };
}

/** Collision radius of the props standing at each point of interest. */
const POI_PROP_RADIUS = 6;

/** Landing-site environment: flat "up", its own sun, props to bump into. */
export function buildSurfaceEnvironment(location: LocationId, surface: SurfaceId, terrain: Terrain): Environment {
  const definition = SURFACES[surface];
  return {
    location,
    surface,
    primary: BODIES[surface],
    bodies: [],
    colliders: terrain.pointsOfInterest
      .filter((_, index) => definition.pointsOfInterest[index].kind !== "crater" && definition.pointsOfInterest[index].kind !== "delta")
      .map((poi) => ({
        id: null,
        center: poi.position.clone().add(new Vector3(0, 3, 0)),
        radius: POI_PROP_RADIUS,
        surfaceRadius: POI_PROP_RADIUS,
      })),
    sunDirection: toVector(definition.sunDirection).normalize(),
    sunSize: surface === "mars" ? 0.66 : 1,
    sunIntensity: definition.sunIntensity / 2.5,
    pickups: terrain.pickups,
    asteroids: [],
    obstacles: [],
    ringPlane: null,
  };
}

const WORLD_UP = new Vector3(0, 1, 0);

/**
 * Where a warp drops you: on the lit side, a little above the equator, with
 * the planet filling the right half of the view.
 */
export function arrivalFor(location: LocationId): { position: Vector3; forward: Vector3; up: Vector3 } {
  // Ceres sits inside the belt: arrive at the start of the slalom (kept clear of rocks), facing Ceres.
  if (location === "ceres") {
    const { spawn } = generateCourse(BELT_SLALOM_COURSE, sunDirectionFor("ceres"));
    const position = spawn.position.clone();
    const forward = toVector(BODIES.ceres.position).sub(position).normalize();
    const up = spawn.up.clone().addScaledVector(forward, -spawn.up.dot(forward)).normalize();
    return { position, forward, up };
  }
  const primary = BODIES[location];
  const center = toVector(primary.position);
  const sun = location === "sun" ? new Vector3(0.3, 0.2, 1).normalize() : toVector(sunDirectionFor(location));
  const side = new Vector3().crossVectors(sun, WORLD_UP);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const factor = location === "sun" ? EXPLORATION.sunArrivalDistance : EXPLORATION.arrivalDistance;
  const direction = sun.clone().multiplyScalar(0.72).addScaledVector(side, 0.6).addScaledVector(WORLD_UP, 0.3).normalize();
  const position = center.clone().addScaledVector(direction, primary.radius * factor);
  const toCenter = center.clone().sub(position).normalize();
  // Aim a bit past the planet so it sits off-centre instead of dead ahead.
  const forward = toCenter.clone().addScaledVector(side, 0.35).normalize();
  const up = WORLD_UP.clone().addScaledVector(forward, -WORLD_UP.dot(forward)).normalize();
  return { position, forward, up };
}
