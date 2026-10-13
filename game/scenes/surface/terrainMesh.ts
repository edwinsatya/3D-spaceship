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

export interface TerrainBuilder {
  readonly done: boolean;
  /** Does work until `deadline` (performance.now() ms); returns true once finished. */
  step: (deadline: number) => boolean;
  /** Completes any remaining work synchronously and returns the geometry. */
  finish: () => BufferGeometry;
}

/** Vertices processed between deadline checks. */
const CHUNK = 256;

/**
 * Landing-site ground: a displaced grid with vertex colours (maria/highlands
 * or dark sand/bright dust patches, rock on slopes). Flat-shaded, low-poly look.
 * Built incrementally so the work can be spread over the descent.
 */
export function createTerrainBuilder(terrain: Terrain, segments: number): TerrainBuilder {
  const { palette, terrain: shape } = terrain.surface;
  const geometry = new PlaneGeometry(VISUALS.surface.size, VISUALS.surface.size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const count = position.count;
  const random = createRandom(shape.seed + 101);
  const noise = new SimplexNoise({ random: random.next });
  const low = new Color(palette.low);
  const high = new Color(palette.high);
  const rock = new Color(palette.rock);
  const accent = new Color(palette.accent);
  const color = new Color();
  const colors = new Float32Array(count * 3);
  let stage: "heights" | "normals" | "colors" | "done" = "heights";
  let index = 0;

  const heights = (end: number) => {
    for (; index < end; index++) position.setY(index, terrain.heightAt(position.getX(index), position.getZ(index)));
  };

  const shade = (end: number) => {
    const normal = geometry.attributes.normal;
    for (; index < end; index++) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const patch = noise.noise(x * 0.0024, z * 0.0024) * 0.5 + 0.5;
      const height = smoothstep(-25, shape.rimHeight * 0.6, y);
      color.copy(low).lerp(high, Math.min(1, patch * 0.65 + height * 0.55));
      const slope = 1 - normal.getY(index);
      color.lerp(rock, smoothstep(0.08, 0.32, slope) * 0.85);
      const streak = noise.noise(x * 0.011 + 40, z * 0.011);
      if (streak > 0.55) color.lerp(accent, (streak - 0.55) * 1.4);
      color.multiplyScalar(0.92 + random.next() * 0.16);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
  };

  const step = (deadline: number): boolean => {
    while (stage !== "done") {
      if (stage === "heights") {
        heights(Math.min(count, index + CHUNK));
        if (index === count) {
          stage = "normals";
          index = 0;
        }
      } else if (stage === "normals") {
        geometry.computeVertexNormals();
        stage = "colors";
      } else {
        shade(Math.min(count, index + CHUNK));
        if (index === count) {
          geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
          geometry.computeBoundingSphere();
          stage = "done";
        }
      }
      if (performance.now() >= deadline) break;
    }
    return stage === "done";
  };

  return {
    get done() {
      return stage === "done";
    },
    step,
    finish: () => {
      step(Infinity);
      return geometry;
    },
  };
}

export function createTerrainGeometry(terrain: Terrain, segments: number): BufferGeometry {
  return createTerrainBuilder(terrain, segments).finish();
}

const builders = new Map<string, TerrainBuilder>();
const builderKey = (terrain: Terrain, segments: number) => `${terrain.surface.id}:${segments}`;

/** Starts (or continues) building a site's ground ahead of time, e.g. during the descent. */
export function prebuildTerrain(terrain: Terrain, segments: number, deadline: number): void {
  const key = builderKey(terrain, segments);
  let builder = builders.get(key);
  if (!builder) {
    builder = createTerrainBuilder(terrain, segments);
    builders.set(key, builder);
  }
  if (!builder.done) builder.step(deadline);
}

/** Hands over the (pre)built ground geometry; the caller owns and disposes it. */
export function takeTerrainGeometry(terrain: Terrain, segments: number): BufferGeometry {
  const key = builderKey(terrain, segments);
  const builder = builders.get(key) ?? createTerrainBuilder(terrain, segments);
  builders.delete(key);
  return builder.finish();
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
