"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial, type Mesh } from "three";
import { EXPLORATION } from "@/game/config/exploration";
import { FULLSCREEN_OVERLAY_VERTEX } from "@/game/scenes/shaders/common";
import { runtime } from "@/game/systems/runtime";
import { warpIntensity } from "@/game/systems/warp";

/** Hyperspace tunnel: dense radial star streaks rushing past, a bright core. */
const TUNNEL_FRAGMENT = /* glsl */ `
uniform float uIntensity;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;

float hash(float n) { return fract(sin(n * 91.345) * 47453.5453); }

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  float r = length(p);
  float angle = atan(p.y, p.x) / 6.28318 + 0.5;
  vec3 color = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float bins = 90.0 + float(layer) * 70.0;
    float id = floor(angle * bins);
    float seed = hash(id + float(layer) * 17.0);
    float angular = abs(fract(angle * bins) - 0.5);
    float speed = 1.6 + seed * 2.4 + float(layer);
    float head = fract(seed * 13.0 + uTime * speed);
    float depth = 0.15 + head * 1.8;
    float streak = smoothstep(depth - 0.6 * head, depth, r) * (1.0 - smoothstep(depth, depth + 0.03, r));
    float thin = 1.0 - smoothstep(0.08, 0.3, angular);
    vec3 tint = mix(vec3(0.45, 0.65, 1.0), vec3(0.85, 0.5, 1.0), seed);
    color += tint * streak * thin * (0.6 + seed);
  }
  float core = exp(-r * 3.5) * 1.4;
  float rim = smoothstep(0.6, 1.6, r) * 0.25;
  color += vec3(0.75, 0.85, 1.0) * core + vec3(0.3, 0.2, 0.6) * rim;
  gl_FragColor = vec4(color * uIntensity, 1.0);
}
`;

export function WarpTunnel() {
  const mesh = useRef<Mesh>(null);
  const size = useThree((state) => state.size);
  const geometry = useMemo(() => {
    const triangle = new BufferGeometry();
    triangle.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    return triangle;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FULLSCREEN_OVERLAY_VERTEX,
        fragmentShader: TUNNEL_FRAGMENT,
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
    const intensity = warpIntensity(runtime.warp, EXPLORATION.warp);
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uTime.value += delta;
    material.uniforms.uAspect.value = size.width / Math.max(1, size.height);
    if (mesh.current) mesh.current.visible = intensity > 0.001;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={101} visible={false} />;
}
