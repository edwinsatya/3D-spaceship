import { Vector3 } from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import type { SurfaceDefinition } from "@/game/data/surfaces";
import type { PickupSpec } from "./course";
import { smoothstep } from "./math";
import { createRandom } from "./random";

interface Crater {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

interface FlatZone {
  x: number;
  z: number;
  radius: number;
}

export interface Terrain {
  surface: SurfaceDefinition;
  heightAt: (x: number, z: number) => number;
  craters: readonly Crater[];
  /** Points of interest standing on the ground. */
  pointsOfInterest: readonly { id: string; position: Vector3; radius: number }[];
  pickups: PickupSpec[];
}

const OCTAVES = 4;
const PICKUP_COUNT = 6;
const PICKUP_ALTITUDE = 16;

/** Deterministic heightfield for a landing site (pure; unit-tested). */
export function createTerrain(surface: SurfaceDefinition): Terrain {
  const { terrain } = surface;
  const random = createRandom(terrain.seed);
  const noise = new SimplexNoise({ random: random.next });
  const flats: FlatZone[] = [{ x: surface.spawn[0], z: surface.spawn[1], radius: 55 }];
  const craters: Crater[] = [];

  for (const poi of surface.pointsOfInterest) {
    if (poi.kind === "crater") craters.push({ x: poi.position[0], z: poi.position[1], radius: poi.radius, depth: 24 });
    else flats.push({ x: poi.position[0], z: poi.position[1], radius: poi.radius * 0.9 });
  }

  const craterCount = Math.round(30 * terrain.craters);
  for (let attempt = 0; attempt < craterCount * 20 && craters.length < craterCount; attempt++) {
    const angle = random.range(0, Math.PI * 2);
    const distance = Math.sqrt(random.next()) * terrain.rimRadius * 0.95;
    const radius = random.range(8, 60) * (random.next() < 0.15 ? 1.8 : 1);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const blocked = flats.some((zone) => Math.hypot(zone.x - x, zone.z - z) < zone.radius + radius * 1.3);
    if (!blocked) craters.push({ x, z, radius, depth: radius * random.range(0.18, 0.32) });
  }

  const rawHeight = (x: number, z: number): number => {
    let height = 0;
    let frequency = terrain.frequency;
    let amplitude = terrain.amplitude;
    for (let i = 0; i < OCTAVES; i++) {
      height += noise.noise(x * frequency, z * frequency) * amplitude;
      frequency *= 2.05;
      amplitude *= 0.45;
    }
    if (terrain.dunes > 0) {
      const warp = noise.noise(x * 0.004, z * 0.004) * 3;
      height += terrain.dunes * (Math.sin(x * 0.035 + z * 0.012 + warp) * 2.2 + Math.sin(z * 0.05 - x * 0.02) * 1.2);
    }
    for (const crater of craters) {
      const d = Math.hypot(x - crater.x, z - crater.z);
      if (d > crater.radius * 1.6) continue;
      const t = d / crater.radius;
      if (t < 1) height -= crater.depth * (1 - t * t);
      height += crater.depth * 0.35 * Math.exp(-(((d - crater.radius) / (crater.radius * 0.2)) ** 2));
    }
    const fromCentre = Math.hypot(x, z);
    const rim = smoothstep(terrain.rimRadius, terrain.rimRadius * 1.35, fromCentre);
    height += rim * terrain.rimHeight * (0.75 + 0.25 * noise.noise(x * 0.003 + 9, z * 0.003));
    return height;
  };

  const heightAt = (x: number, z: number): number => {
    let height = rawHeight(x, z);
    for (const zone of flats) {
      const d = Math.hypot(x - zone.x, z - zone.z);
      if (d >= zone.radius) continue;
      height += (0 - height) * smoothstep(zone.radius, zone.radius * 0.55, d);
    }
    return height;
  };

  const pointsOfInterest = surface.pointsOfInterest.map((poi) => ({
    id: poi.id,
    position: new Vector3(poi.position[0], heightAt(poi.position[0], poi.position[1]), poi.position[1]),
    radius: poi.radius,
  }));

  const pickups: PickupSpec[] = [];
  for (let i = 0; i < PICKUP_COUNT; i++) {
    const angle = (i / PICKUP_COUNT) * Math.PI * 2 + 0.4;
    const distance = terrain.rimRadius * random.range(0.25, 0.6);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    pickups.push({ position: new Vector3(x, heightAt(x, z) + PICKUP_ALTITUDE, z) });
  }

  return { surface, heightAt, craters, pointsOfInterest, pickups };
}
