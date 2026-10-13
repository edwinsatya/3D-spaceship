"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace } from "three";
import { WORLD } from "@/game/config/world";
import { SUN } from "@/game/data/planets";
import { BILLBOARD_VERTEX } from "@/game/scenes/shaders/common";
import { SIMPLEX_3D } from "@/game/scenes/shaders/noise";
import { runtime } from "@/game/systems/runtime";
import { useTextureFile } from "./textures";

const SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vObject;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vObject = normalize(position);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Boiling plasma: granulation, a few sunspots and limb darkening, in HDR for bloom.
 * With a photo texture loaded (uMapMix = 1) the photo sets the colour and the
 * procedural granulation keeps it alive.
 */
const SURFACE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform sampler2D uMap;
uniform float uMapMix;
varying vec2 vUv;
varying vec3 vObject;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
${SIMPLEX_3D}
void main() {
  vec3 p = vObject;
  float t = uTime * 0.04;
  float granulation = 1.0 - abs(simplex3(p * 22.0 + vec3(t * 3.0, -t * 2.0, t)));
  float cells = fbm3(p * 5.0 + vec3(t, t * 0.6, -t), 4) * 0.5 + 0.5;
  float spots = smoothstep(0.74, 0.8, fbm3(p * 4.0 + 9.0, 3) * 0.5 + 0.5);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float limb = pow(max(dot(normalize(vNormalW), V), 0.0), 0.45);
  vec3 hot = vec3(1.0, 0.72, 0.28);
  vec3 warm = vec3(0.95, 0.3, 0.04);
  vec3 color = mix(warm, hot, cells * 0.7 + granulation * 0.3);
  color *= 1.0 - spots * 0.6 * (1.0 - uMapMix);
  vec3 photo = texture2D(uMap, vUv).rgb * (0.85 + 0.35 * granulation) * 1.35;
  color = mix(color, photo, uMapMix);
  color *= 0.45 + 0.55 * limb;
  gl_FragColor = vec4(color * 1.1, 1.0);
}
`;

/** Soft corona around the disc (the disc itself is the sphere). */
const CORONA_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float angle = atan(vUv.y, vUv.x);
  float glow = exp(-(r - 0.38) * 7.0) * step(0.36, r) + exp(-r * 2.8) * 0.35;
  float streamers = pow(abs(sin(angle * 7.0 + sin(uTime * 0.1) * 0.5)), 10.0) * exp(-r * 2.4) * 0.6;
  vec3 color = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.9, 0.7), exp(-r * 3.0));
  gl_FragColor = vec4(color * (glow + streamers) * (1.0 - smoothstep(0.8, 1.0, r)) * 0.9, 1.0);
}
`;

export function SunBody() {
  const geometry = useMemo(() => new SphereGeometry(SUN.radius, 96, 48), []);
  const corona = useMemo(() => new PlaneGeometry(2, 2), []);
  const materials = useMemo(
    () => ({
      surface: new ShaderMaterial({
        vertexShader: SURFACE_VERTEX,
        fragmentShader: SURFACE_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uMap: { value: null }, uMapMix: { value: 0 } },
        toneMapped: false,
      }),
      corona: new ShaderMaterial({
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader: CORONA_FRAGMENT,
        uniforms: { uSize: { value: SUN.radius * 2.7 }, uTime: { value: 0 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  );

  const photo = useTextureFile(SUN.textures?.color, SRGBColorSpace);
  useEffect(() => {
    materials.surface.uniforms.uMap.value = photo;
    materials.surface.uniforms.uMapMix.value = photo ? 1 : 0;
  }, [materials, photo]);

  useEffect(
    () => () => {
      geometry.dispose();
      corona.dispose();
      materials.surface.dispose();
      materials.corona.dispose();
    },
    [geometry, corona, materials],
  );

  useFrame((_, delta) => {
    const dt = delta * runtime.timeScale;
    materials.surface.uniforms.uTime.value += dt;
    materials.corona.uniforms.uTime.value += dt;
  });

  return (
    <group position={SUN.position}>
      <mesh geometry={geometry} material={materials.surface} />
      <mesh geometry={corona} material={materials.corona} frustumCulled={false} renderOrder={2} />
      {/* At the Sun the light comes from its centre (decay 0 = constant strength). */}
      <pointLight intensity={WORLD.sunLightIntensity * 1.2} decay={0} color="#fff1d6" />
    </group>
  );
}
