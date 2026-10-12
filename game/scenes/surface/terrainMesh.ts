import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import { VISUALS } from "@/game/config/visuals";
import { smoothstep } from "@/game/systems/math";
import { createRandom } from "@/game/systems/random";
import type { Terrain } from "@/game/systems/terrain";

const ROCK_COUNT = 260;

/**
 * Landing-site ground: a displaced grid with vertex colours (maria/highlands
 * or dark sand/bright dust patches, rock on slopes). Flat-shaded, low-poly look.
 */
export function createTerrainGeometry(terrain: Terrain, segments: number): BufferGeometry {
  const { palette, terrain: shape } = terrain.surface;
  const geometry = new PlaneGeometry(VISUALS.surface.size, VISUALS.surface.size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, terrain.heightAt(position.getX(i), position.getZ(i)));
  }
  geometry.computeVertexNormals();

  const normal = geometry.attributes.normal;
  const random = createRandom(shape.seed + 101);
  const noise = new SimplexNoise({ random: random.next });
  const low = new Color(palette.low);
  const high = new Color(palette.high);
  const rock = new Color(palette.rock);
  const accent = new Color(palette.accent);
  const color = new Color();
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const patch = noise.noise(x * 0.0024, z * 0.0024) * 0.5 + 0.5;
    const height = smoothstep(-25, shape.rimHeight * 0.6, y);
    color.copy(low).lerp(high, Math.min(1, patch * 0.65 + height * 0.55));
    const slope = 1 - normal.getY(i);
    color.lerp(rock, smoothstep(0.08, 0.32, slope) * 0.85);
    const streak = noise.noise(x * 0.011 + 40, z * 0.011);
    if (streak > 0.55) color.lerp(accent, (streak - 0.55) * 1.4);
    color.multiplyScalar(0.92 + random.next() * 0.16);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Instance transforms for boulders scattered around the site (clear of the pad and props). */
export function createRockMatrices(terrain: Terrain): Matrix4[] {
  const { surface } = terrain;
  const random = createRandom(surface.terrain.seed + 7);
  const keepClear = [
    { x: surface.spawn[0], z: surface.spawn[1], radius: 70 },
    ...terrain.pointsOfInterest.map((poi) => ({ x: poi.position.x, z: poi.position.z, radius: poi.radius * 0.8 })),
  ];
  const matrices: Matrix4[] = [];
  const rotation = new Quaternion();
  const axis = new Vector3();
  const scale = new Vector3();
  const at = new Vector3();
  const limit = surface.terrain.rimRadius * 1.15;
  for (let attempt = 0; attempt < ROCK_COUNT * 4 && matrices.length < ROCK_COUNT; attempt++) {
    const angle = random.range(0, Math.PI * 2);
    const distance = Math.sqrt(random.next()) * limit;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    if (keepClear.some((zone) => Math.hypot(zone.x - x, zone.z - z) < zone.radius)) continue;
    const size = random.next() < 0.06 ? random.range(5, 9) : random.range(0.6, 3);
    scale.set(size * random.range(0.8, 1.3), size * random.range(0.45, 0.8), size * random.range(0.8, 1.3));
    axis.set(random.range(-1, 1), 1, random.range(-1, 1)).normalize();
    rotation.setFromAxisAngle(axis, random.range(0, Math.PI * 2));
    at.set(x, terrain.heightAt(x, z) + scale.y * 0.25, z);
    matrices.push(new Matrix4().compose(at, rotation, scale));
  }
  return matrices;
}

export function createRockGeometry(): BufferGeometry {
  return new IcosahedronGeometry(1, 0);
}
