"use client";

import { Detailed } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  MathUtils,
  ShaderMaterial,
  SphereGeometry,
  type Group,
  type Texture,
} from "three";
import { VISUALS } from "@/game/config/visuals";
import { WORLD } from "@/game/config/world";
import { EARTH } from "@/game/data/planets";
import { OUTPUT_CHUNKS } from "@/game/scenes/shaders/common";
import { useQualitySettings } from "@/game/scenes/useQualitySettings";
import { useAssetStore } from "@/game/stores/assetStore";
import { runtime } from "@/game/systems/runtime";
import { SUN_DIRECTION } from "./Sun";

const EARTH_LOD = [...VISUALS.lod.earth];

const SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const DETAIL_REPEAT = VISUALS.detail.earthRepeat;
const CLOUD_DETAIL_REPEAT = VISUALS.detail.cloudRepeat;

const SURFACE_FRAGMENT = /* glsl */ `
uniform sampler2D uDetailMap;
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform vec3 uSunDirection;
uniform float uCloudOffset;
uniform vec3 uAtmoDay;
uniform vec3 uAtmoTwilight;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunDirection);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float NdotL = dot(N, L);
  float day = smoothstep(-0.14, 0.24, NdotL);

  vec4 dayTex = texture2D(uDayMap, vUv);
  vec2 detail = texture2D(uDetailMap, vUv * vec2(${DETAIL_REPEAT[0].toFixed(1)}, ${DETAIL_REPEAT[1].toFixed(1)})).rg;
  vec3 albedo = dayTex.rgb * (0.86 + 0.28 * detail.r);
  float ocean = dayTex.a;
  vec4 nightTex = texture2D(uNightMap, vUv);
  float cloudShadow = texture2D(uNightMap, vUv + vec2(uCloudOffset, 0.0)).g;

  vec3 sunColor = vec3(1.0, 0.96, 0.9);
  float diffuse = max(NdotL, 0.0);
  vec3 color = albedo * sunColor * diffuse * 1.9 * (1.0 - cloudShadow * 0.45);

  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float spec = (pow(NdotH, 70.0) * 1.6 + pow(NdotH, 8.0) * 0.08) * ocean * smoothstep(0.0, 0.2, NdotL);
  spec *= 0.6 + 0.8 * detail.g;
  color += sunColor * spec;

  float city = nightTex.r * (1.0 - day) * (1.0 - nightTex.g * 0.6);
  color += vec3(1.0, 0.7, 0.36) * city * 2.4;

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 atmo = mix(uAtmoTwilight, uAtmoDay, smoothstep(-0.05, 0.45, NdotL));
  color += atmo * fresnel * smoothstep(-0.25, 0.35, NdotL) * 0.9;
  color += albedo * 0.012;

  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_CHUNKS}
}
`;

const CLOUD_FRAGMENT = /* glsl */ `
uniform sampler2D uDetailMap;
uniform sampler2D uNightMap;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPosition;
void main() {
  vec3 N = normalize(vNormalW);
  float NdotL = dot(N, normalize(uSunDirection));
  float detail = texture2D(uDetailMap, vUv * vec2(${CLOUD_DETAIL_REPEAT[0].toFixed(1)}, ${CLOUD_DETAIL_REPEAT[1].toFixed(1)})).r;
  float cloud = clamp(texture2D(uNightMap, vUv).g * (0.65 + 0.7 * detail) - 0.04, 0.0, 1.0);
  float light = smoothstep(-0.18, 0.5, NdotL);
  vec3 color = mix(vec3(0.02, 0.025, 0.04), vec3(1.0, 0.98, 0.95) * 1.15, light);
  color = mix(color, vec3(1.0, 0.62, 0.4), smoothstep(0.25, 0.0, abs(NdotL - 0.02)) * 0.35);
  gl_FragColor = vec4(color, cloud * (0.25 + 0.75 * light) * 0.92);
  ${OUTPUT_CHUNKS}
}
`;

const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vCenter;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Limb glow from the view ray's closest approach to the planet centre:
 * correct from orbit-skimming altitude to far away (a normal-based rim
 * shader blows out when the camera is close to the shell).
 */
const ATMOSPHERE_FRAGMENT = /* glsl */ `
uniform vec3 uSunDirection;
uniform vec3 uAtmoDay;
uniform vec3 uAtmoTwilight;
uniform float uIntensity;
uniform float uPlanetRadius;
uniform float uAtmosphereRadius;
varying vec3 vWorldPosition;
varying vec3 vCenter;
void main() {
  vec3 center = vCenter;
  vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
  vec3 toCenter = center - cameraPosition;
  float along = dot(toCenter, rayDirection);
  vec3 closest = cameraPosition + rayDirection * along;
  float distanceToCenter = length(closest - center);
  float height = clamp((uAtmosphereRadius - distanceToCenter) / (uAtmosphereRadius - uPlanetRadius), 0.0, 1.0);
  float density = height * height * (3.0 - 2.0 * height);
  vec3 normal = normalize(closest - center);
  float NdotL = dot(normal, normalize(uSunDirection));
  vec3 color = mix(uAtmoTwilight, uAtmoDay, smoothstep(-0.05, 0.35, NdotL));
  float lit = smoothstep(-0.3, 0.15, NdotL);
  gl_FragColor = vec4(color * density * lit * uIntensity, 1.0);
  ${OUTPUT_CHUNKS}
}
`;

function linearColor(hex: string) {
  return new Color(hex);
}

function useEarthMaterials(day: Texture, night: Texture, detail: Texture) {
  const atmosphere = EARTH.atmosphere!;
  return useMemo(() => {
    const shared = {
      uSunDirection: { value: SUN_DIRECTION },
      uAtmoDay: { value: linearColor(atmosphere.dayColor) },
      uAtmoTwilight: { value: linearColor(atmosphere.twilightColor) },
    };
    const surface = new ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: SURFACE_FRAGMENT,
      uniforms: {
        ...shared,
        uDayMap: { value: day },
        uNightMap: { value: night },
        uDetailMap: { value: detail },
        uCloudOffset: { value: 0 },
      },
    });
    const clouds = new ShaderMaterial({
      vertexShader: SURFACE_VERTEX,
      fragmentShader: CLOUD_FRAGMENT,
      uniforms: { uSunDirection: shared.uSunDirection, uNightMap: { value: night }, uDetailMap: { value: detail } },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    const glow = new ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms: {
        ...shared,
        uIntensity: { value: atmosphere.intensity },
        uPlanetRadius: { value: EARTH.radius },
        uAtmosphereRadius: { value: EARTH.radius * atmosphere.scale },
      },
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    return { surface, clouds, glow };
  }, [day, night, detail, atmosphere]);
}

function useSphereLods(radius: number, segments: number) {
  return useMemo(
    () => [
      new SphereGeometry(radius, segments, segments / 2),
      new SphereGeometry(radius, segments / 2, segments / 4),
      new SphereGeometry(radius, 32, 16),
    ],
    [radius, segments],
  );
}

function EarthBody({ day, night, detail }: { day: Texture; night: Texture; detail: Texture }) {
  const { planetSegments } = useQualitySettings();
  const materials = useEarthMaterials(day, night, detail);
  const surfaceLods = useSphereLods(EARTH.radius, planetSegments);
  const cloudLods = useSphereLods(EARTH.radius * VISUALS.cloudScale, planetSegments);
  const glowGeometry = useMemo(() => new SphereGeometry(EARTH.radius * EARTH.atmosphere!.scale, 64, 32), []);
  const surface = useRef<Group>(null);
  const clouds = useRef<Group>(null);

  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
    },
    [materials],
  );
  useEffect(
    () => () => {
      for (const geometry of [...surfaceLods, ...cloudLods]) geometry.dispose();
    },
    [surfaceLods, cloudLods],
  );
  useEffect(() => () => glowGeometry.dispose(), [glowGeometry]);

  useFrame((_, delta) => {
    if (!surface.current || !clouds.current) return;
    const dt = delta * runtime.timeScale;
    surface.current.rotation.y += WORLD.earthRotationSpeed * dt;
    clouds.current.rotation.y += WORLD.cloudRotationSpeed * dt;
    const drift = (clouds.current.rotation.y - surface.current.rotation.y) / (Math.PI * 2);
    materials.surface.uniforms.uCloudOffset.value = -(drift % 1);
  });

  return (
    <group rotation={[0, 0, MathUtils.degToRad(EARTH.axialTilt)]}>
      <group ref={surface}>
        <Detailed distances={EARTH_LOD}>
          {surfaceLods.map((geometry, index) => (
            <mesh key={index} geometry={geometry} material={materials.surface} />
          ))}
        </Detailed>
      </group>
      <group ref={clouds}>
        <Detailed distances={EARTH_LOD}>
          {cloudLods.map((geometry, index) => (
            <mesh key={index} geometry={geometry} material={materials.clouds} renderOrder={1} />
          ))}
        </Detailed>
      </group>
      <mesh geometry={glowGeometry} material={materials.glow} renderOrder={2} />
    </group>
  );
}

/** Earth: baked (or file) day/night maps, rotating clouds, fresnel atmosphere. */
export function Earth() {
  const day = useAssetStore((state) => state.textures.earthDay);
  const night = useAssetStore((state) => state.textures.earthNight);
  const detail = useAssetStore((state) => state.textures.detail);
  if (!day || !night || !detail) return null;
  return (
    <group position={EARTH.position}>
      <EarthBody day={day} night={night} detail={detail} />
    </group>
  );
}
