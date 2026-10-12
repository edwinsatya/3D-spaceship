"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Vector3, type Mesh } from "three";
import { SKY } from "@/game/config/world";
import { createRandom } from "@/game/systems/random";
import { runtime } from "@/game/systems/runtime";
import { NEBULA_DIRECTIONS } from "./procedural/skyBake";
import { useQualitySettings } from "./useQualitySettings";

const GAS_VERTEX = /* glsl */ `
attribute vec3 aCenter;
attribute vec2 aCorner;
attribute float aSize;
attribute vec3 aColor;
attribute float aSeed;
varying vec2 vUv;
varying vec3 vColor;
varying float vSeed;
void main() {
  vUv = aCorner;
  vColor = aColor;
  vSeed = aSeed;
  vec4 mvPosition = modelViewMatrix * vec4(aCenter, 1.0);
  mvPosition.xy += aCorner * aSize;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const GAS_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vColor;
varying float vSeed;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  vec2 p = vUv * 2.2 + vSeed * 17.0;
  float n = valueNoise(p) * 0.55 + valueNoise(p * 2.1) * 0.3 + valueNoise(p * 4.3) * 0.15;
  float falloff = pow(1.0 - r, 2.2);
  float density = falloff * smoothstep(0.25, 0.85, n);
  gl_FragColor = vec4(vColor * density, 1.0);
}
`;

function createGasGeometry(count: number) {
  const random = createRandom(303);
  const centers: number[] = [];
  const corners: number[] = [];
  const sizes: number[] = [];
  const colors: number[] = [];
  const seeds: number[] = [];
  const indices: number[] = [];
  const direction = new Vector3();
  const color = new Color();
  for (let i = 0; i < count; i++) {
    const nebula = NEBULA_DIRECTIONS[i % NEBULA_DIRECTIONS.length];
    const [nx, ny, nz] = nebula.direction;
    direction
      .set(nx, ny, nz)
      .normalize()
      .add(new Vector3(random.range(-0.35, 0.35), random.range(-0.35, 0.35), random.range(-0.35, 0.35)))
      .normalize()
      .multiplyScalar(random.range(SKY.gas.minRadius, SKY.gas.maxRadius));
    color.set(nebula.color).multiplyScalar(0.07 * nebula.strength * 2);
    const size = random.range(SKY.gas.minSize, SKY.gas.maxSize);
    const seed = random.next();
    const base = i * 4;
    for (const [cx, cy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      centers.push(direction.x, direction.y, direction.z);
      corners.push(cx, cy);
      sizes.push(size);
      colors.push(color.r, color.g, color.b);
      seeds.push(seed);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new BufferGeometry();
  // `position` is required by three for bounds; billboards are placed by aCenter.
  geometry.setAttribute("position", new Float32BufferAttribute(centers, 3));
  geometry.setAttribute("aCenter", new Float32BufferAttribute(centers, 3));
  geometry.setAttribute("aCorner", new Float32BufferAttribute(corners, 2));
  geometry.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aColor", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
  geometry.setIndex(indices);
  return geometry;
}

/** Soft, slowly parallaxing gas clouds in front of the baked nebulae. */
export function NebulaGas() {
  const { starsScale } = useQualitySettings();
  const count = Math.max(6, Math.round(SKY.gas.count * starsScale));
  const geometry = useMemo(() => createGasGeometry(count), [count]);
  const mesh = useRef<Mesh>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    mesh.current?.position.copy(runtime.camera.position).multiplyScalar(SKY.gas.follow).sub(runtime.origin);
  });

  return (
    <mesh ref={mesh} geometry={geometry} frustumCulled={false} renderOrder={-3}>
      <shaderMaterial
        vertexShader={GAS_VERTEX}
        fragmentShader={GAS_FRAGMENT}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
