"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Vector3, type Mesh, type ShaderMaterial } from "three";
import { VISUALS } from "@/game/config/visuals";
import { SKY, WORLD } from "@/game/config/world";
import { BILLBOARD_VERTEX } from "@/game/scenes/shaders/common";
import { useGameStore } from "@/game/stores/gameStore";
import { buildEnvironment } from "@/game/systems/environment";
import { runtime } from "@/game/systems/runtime";
import { SunDirectionalLight } from "./SunDirectionalLight";

const SUN_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float angle = atan(vUv.y, vUv.x);
  float core = smoothstep(0.105, 0.085, r);
  float glow = exp(-r * 7.0) * 1.4 + exp(-r * 2.6) * 0.22;
  float rays = pow(abs(sin(angle * 9.0 + sin(uTime * 0.2) * 0.4)), 18.0) * exp(-r * 3.2) * 0.35;
  rays += pow(abs(sin(angle * 5.0 - uTime * 0.05)), 26.0) * exp(-r * 2.2) * 0.25;
  vec3 hot = vec3(1.0, 0.97, 0.9);
  vec3 warm = vec3(1.0, 0.68, 0.36);
  vec3 color = mix(warm, hot, exp(-r * 9.0));
  float edgeFade = 1.0 - smoothstep(0.8, 1.0, r);
  gl_FragColor = vec4(color * (core * 9.0 + (glow + rays) * edgeFade), 1.0);
}
`;

const _position = new Vector3();

/**
 * Billboard sun kept at a fixed distance from the camera, i.e. "at infinity".
 * Direction and apparent size follow the current location (smaller at Neptune).
 */
export function Sun() {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const atTheSun = useGameStore((state) => state.location === "sun");
  const uniforms = useMemo(() => ({ uSize: { value: SKY.sunSize * 2.4 }, uTime: { value: 0 } }), []);

  useFrame(({ camera }, delta) => {
    if (!mesh.current || !material.current) return;
    _position.copy(camera.position).addScaledVector(runtime.sun.direction, SKY.sunDistance);
    mesh.current.position.copy(_position);
    material.current.uniforms.uSize.value = SKY.sunSize * 2.4 * runtime.sun.size;
    material.current.uniforms.uTime.value += delta * runtime.timeScale;
  });

  if (atTheSun) return null;
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-5}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={BILLBOARD_VERTEX}
        fragmentShader={SUN_FRAGMENT}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Directional sunlight for the current location (the Sun itself uses a point light). */
export function SunLight() {
  const location = useGameStore((state) => state.location);
  const environment = useMemo(() => buildEnvironment(location), [location]);
  const direction = useMemo(() => environment.sunDirection.clone().normalize(), [environment]);
  return (
    <>
      {location !== "sun" && (
        <SunDirectionalLight
          direction={direction}
          intensity={WORLD.sunLightIntensity * environment.sunIntensity}
          extent={VISUALS.shadows.extent.space}
        />
      )}
      <ambientLight intensity={WORLD.ambientIntensity} color={WORLD.ambientColor} />
    </>
  );
}
