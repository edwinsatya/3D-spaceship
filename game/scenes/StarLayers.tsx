"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Points,
  type ShaderMaterial,
} from "three";
import { SKY } from "@/game/config/world";
import { createRandom } from "@/game/systems/random";
import { runtime } from "@/game/systems/runtime";
import { useQualitySettings } from "./useQualitySettings";

const STAR_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float twinkle = 0.78 + 0.22 * sin(uTime * (1.3 + aPhase * 2.1) + aPhase * 40.0);
  vColor = aColor * twinkle;
  gl_PointSize = max(1.0, aSize * uPixelRatio);
}
`;

const STAR_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.0, d);
  alpha *= alpha;
  gl_FragColor = vec4(vColor * alpha, 1.0);
}
`;

const STAR_TINTS = ["#9bb0ff", "#cad7ff", "#f8f7ff", "#fff4ea", "#ffd2a1", "#ffb56c"].map((hex) => new Color(hex));
const TINT_WEIGHTS = [0.08, 0.2, 0.3, 0.24, 0.12, 0.06];

function pickTint(value: number): Color {
  let sum = 0;
  for (let i = 0; i < TINT_WEIGHTS.length; i++) {
    sum += TINT_WEIGHTS[i];
    if (value <= sum) return STAR_TINTS[i];
  }
  return STAR_TINTS[STAR_TINTS.length - 1];
}

function createStarGeometry(seed: number, count: number, minRadius: number, maxRadius: number, size: number) {
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = random.range(-1, 1);
    const theta = random.range(0, Math.PI * 2);
    const s = Math.sqrt(1 - u * u);
    const radius = random.range(minRadius, maxRadius);
    positions.set([s * Math.cos(theta) * radius, u * radius, s * Math.sin(theta) * radius], i * 3);
    const bright = random.next();
    // Mostly faint stars; a few bright ones push past 1.0 so bloom catches them.
    const intensity = bright > 0.97 ? random.range(2.2, 3.4) : bright > 0.85 ? random.range(1, 1.6) : random.range(0.35, 0.9);
    const tint = pickTint(random.next());
    colors.set([tint.r * intensity, tint.g * intensity, tint.b * intensity], i * 3);
    sizes[i] = size * (bright > 0.97 ? 1.6 : bright > 0.85 ? 1.2 : random.range(0.6, 1));
    phases[i] = random.next();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new Float32BufferAttribute(phases, 1));
  return geometry;
}

interface StarLayerProps {
  seed: number;
  count: number;
  minRadius: number;
  maxRadius: number;
  size: number;
  /** 1 = follows the camera (infinitely far), 0 = fixed in the universe. */
  follow: number;
}

function StarLayer({ seed, count, minRadius, maxRadius, size, follow }: StarLayerProps) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const dpr = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(
    () => createStarGeometry(seed, count, minRadius, maxRadius, size),
    [seed, count, minRadius, maxRadius, size],
  );
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 } }), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!points.current || !material.current) return;
    // Universe position of the layer centre → render space (floating origin).
    points.current.position
      .copy(runtime.camera.position)
      .multiplyScalar(follow)
      .sub(runtime.origin);
    material.current.uniforms.uTime.value += delta;
    material.current.uniforms.uPixelRatio.value = dpr;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={-4}>
      <shaderMaterial
        ref={material}
        vertexShader={STAR_VERTEX}
        fragmentShader={STAR_FRAGMENT}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Two point layers with different parallax over the baked background. */
export function StarLayers() {
  const { starsScale } = useQualitySettings();
  const mid = SKY.midLayer;
  const near = SKY.nearLayer;
  return (
    <>
      <StarLayer
        seed={101}
        count={Math.round(mid.count * starsScale)}
        minRadius={mid.minRadius}
        maxRadius={mid.maxRadius}
        size={mid.size}
        follow={mid.follow}
      />
      <StarLayer
        seed={202}
        count={Math.round(near.count * starsScale)}
        minRadius={near.minRadius}
        maxRadius={near.maxRadius}
        size={near.size}
        follow={0}
      />
    </>
  );
}
