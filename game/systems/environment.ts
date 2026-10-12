import { Vector3 } from "three";
import { COLLISION } from "@/game/config/flight";
import { EXPLORATION } from "@/game/config/exploration";
import { BODIES, type BodyId, type CelestialBody, type LocationId } from "@/game/data/planets";
import { LOCATION_BODIES, sunDirectionFor, sunlightFor } from "@/game/data/solarSystem";
import { toVector, type PickupSpec } from "./course";
import { createRandom } from "./random";

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
  primary: CelestialBody;
  bodies: readonly CelestialBody[];
  colliders: BodyCollider[];
  sunDirection: Vector3;
  sunSize: number;
  sunIntensity: number;
  /** Free-flight energy stars around the primary. */
  pickups: PickupSpec[];
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
    primary,
    bodies,
    colliders,
    sunDirection: toVector(sunDirectionFor(location)),
    sunSize: sunlight.size,
    sunIntensity: sunlight.intensity,
    pickups: locationPickups(location),
  };
}

const WORLD_UP = new Vector3(0, 1, 0);

/**
 * Where a warp drops you: on the lit side, a little above the equator, with
 * the planet filling the right half of the view.
 */
export function arrivalFor(location: LocationId): { position: Vector3; forward: Vector3; up: Vector3 } {
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
