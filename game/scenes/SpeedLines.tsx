"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial, type Mesh } from "three";
import { FULLSCREEN_OVERLAY_VERTEX } from "@/game/scenes/shaders/common";
import { clamp01, damp } from "@/game/systems/math";
import { runtime } from "@/game/systems/runtime";

/** Screen-space radial streaks while boosting (anime-style speed lines). */
const SPEED_LINES_FRAGMENT = /* glsl */ `
uniform float uIntensity;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;

float hash(float n) { return fract(sin(n * 91.345) * 47453.5453); }

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float bins = 110.0;
  float id = floor((angle / 6.28318 + 0.5) * bins);
  float center = (id + 0.5) / bins;
  float angular = abs((angle / 6.28318 + 0.5) - center) * bins;
  float seed = hash(id);
  float travel = fract(seed * 7.0 + uTime * (0.9 + seed * 1.4));
  float head = mix(0.35, 1.9, travel);
  float streak = smoothstep(head - 0.45, head, r) * (1.0 - smoothstep(head, head + 0.04, r));
  float thin = 1.0 - smoothstep(0.05, 0.22 * (0.4 + seed), angular);
  float mask = smoothstep(0.35, 1.05, r) * step(0.45, seed);
  float alpha = streak * thin * mask * uIntensity;
  gl_FragColor = vec4(vec3(0.85, 0.93, 1.0) * alpha * 0.55, 1.0);
}
`;

function overlayTriangle() {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  return geometry;
}

export function SpeedLines() {
  const mesh = useRef<Mesh>(null);
  const size = useThree((state) => state.size);
  const geometry = useMemo(() => overlayTriangle(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FULLSCREEN_OVERLAY_VERTEX,
        fragmentShader: SPEED_LINES_FRAGMENT,
        uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } },
        blending: AdditiveBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    const uniforms = material.uniforms;
    const { maxSpeed, boostSpeed } = runtime.flight;
    const overSpeed = clamp01((runtime.ship.speed - maxSpeed) / (boostSpeed - maxSpeed));
    // Radial streaks assume the camera looks along the flight path (not true on orbit).
    const target = runtime.orbit.active ? 0 : runtime.ship.boost.active ? 0.6 + overSpeed * 0.4 : overSpeed * 0.5;
    uniforms.uIntensity.value = damp(uniforms.uIntensity.value, target, 5, delta);
    uniforms.uTime.value += delta;
    uniforms.uAspect.value = size.width / Math.max(1, size.height);
    if (mesh.current) mesh.current.visible = uniforms.uIntensity.value > 0.01;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={100} />;
}
