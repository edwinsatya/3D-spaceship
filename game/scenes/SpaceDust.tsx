"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Vector3 } from "three";
import { FLIGHT } from "@/game/config/flight";
import { DUST } from "@/game/config/world";
import { clamp01 } from "@/game/systems/math";
import { createRandom } from "@/game/systems/random";
import { runtime } from "@/game/systems/runtime";
import { useQualitySettings } from "./useQualitySettings";

/**
 * Dust motes wrapped in a box around the camera, computed on the GPU.
 * They are world-fixed (parallax) and stretch into speed lines with velocity.
 */
const DUST_VERTEX = /* glsl */ `
attribute vec3 aOffset;
attribute float aEnd;
uniform vec3 uCameraMod;
uniform vec3 uCameraRender;
uniform vec3 uVelocity;
uniform float uBox;
uniform float uStretch;
uniform float uMinLength;
varying float vAlpha;
void main() {
  vec3 local = mod(aOffset - uCameraMod, uBox) - uBox * 0.5;
  vec3 world = uCameraRender + local;
  vec3 tail = -uVelocity * uStretch;
  float tailLength = length(tail);
  if (tailLength < uMinLength) tail = tailLength > 1e-4 ? tail / tailLength * uMinLength : vec3(0.0, uMinLength, 0.0);
  world += tail * aEnd;
  float dist = length(local);
  vAlpha = (1.0 - smoothstep(uBox * 0.28, uBox * 0.5, dist)) * smoothstep(1.5, 6.0, dist) * (1.0 - aEnd * 0.85);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const DUST_FRAGMENT = /* glsl */ `
uniform float uBrightness;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vec3(0.75, 0.88, 1.0) * vAlpha * uBrightness, 1.0);
}
`;

function createDustGeometry(count: number) {
  const random = createRandom(404);
  const offsets = new Float32Array(count * 2 * 3);
  const ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = random.range(0, DUST.boxSize);
    const y = random.range(0, DUST.boxSize);
    const z = random.range(0, DUST.boxSize);
    offsets.set([x, y, z, x, y, z], i * 6);
    ends[i * 2] = 0;
    ends[i * 2 + 1] = 1;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(offsets, 3));
  geometry.setAttribute("aOffset", new Float32BufferAttribute(offsets, 3));
  geometry.setAttribute("aEnd", new Float32BufferAttribute(ends, 1));
  return geometry;
}

const _cameraMod = new Vector3();

function positiveMod(value: number, size: number) {
  return ((value % size) + size) % size;
}

export function SpaceDust() {
  const { dustCount } = useQualitySettings();
  const count = DUST.count[dustCount];
  const geometry = useMemo(() => createDustGeometry(count), [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: DUST_VERTEX,
        fragmentShader: DUST_FRAGMENT,
        uniforms: {
          uCameraMod: { value: new Vector3() },
          uCameraRender: { value: new Vector3() },
          uVelocity: { value: new Vector3() },
          uBox: { value: DUST.boxSize },
          uStretch: { value: DUST.stretch },
          uMinLength: { value: DUST.minLength },
          uBrightness: { value: 1 },
        },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => {
    const universe = runtime.camera.position;
    const box = DUST.boxSize;
    _cameraMod.set(positiveMod(universe.x, box), positiveMod(universe.y, box), positiveMod(universe.z, box));
    const uniforms = material.uniforms;
    uniforms.uCameraMod.value.copy(_cameraMod);
    uniforms.uCameraRender.value.copy(camera.position);
    uniforms.uVelocity.value.copy(runtime.ship.velocity);
    uniforms.uBrightness.value = 0.35 + clamp01(runtime.ship.speed / FLIGHT.boostSpeed) * 0.9;
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
