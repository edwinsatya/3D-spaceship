"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, BackSide, Color, ShaderMaterial, SphereGeometry } from "three";
import type { AtmosphereData } from "@/game/data/planets";
import { OUTPUT_CHUNKS } from "@/game/scenes/shaders/common";
import { runtime } from "@/game/systems/runtime";

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
  vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
  vec3 toCenter = vCenter - cameraPosition;
  float along = dot(toCenter, rayDirection);
  vec3 closest = cameraPosition + rayDirection * along;
  float distanceToCenter = length(closest - vCenter);
  float height = clamp((uAtmosphereRadius - distanceToCenter) / (uAtmosphereRadius - uPlanetRadius), 0.0, 1.0);
  float density = height * height * (3.0 - 2.0 * height);
  vec3 normal = normalize(closest - vCenter);
  float NdotL = dot(normal, normalize(uSunDirection));
  vec3 color = mix(uAtmoTwilight, uAtmoDay, smoothstep(-0.05, 0.35, NdotL));
  float lit = smoothstep(-0.3, 0.15, NdotL);
  gl_FragColor = vec4(color * density * lit * uIntensity, 1.0);
  ${OUTPUT_CHUNKS}
}
`;

export function createAtmosphereMaterial(atmosphere: AtmosphereData, planetRadius: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: ATMOSPHERE_FRAGMENT,
    uniforms: {
      uSunDirection: { value: runtime.sun.direction },
      uAtmoDay: { value: new Color(atmosphere.dayColor) },
      uAtmoTwilight: { value: new Color(atmosphere.twilightColor) },
      uIntensity: { value: atmosphere.intensity },
      uPlanetRadius: { value: planetRadius },
      uAtmosphereRadius: { value: planetRadius * atmosphere.scale },
    },
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

export function Atmosphere({ atmosphere, radius }: { atmosphere: AtmosphereData; radius: number }) {
  const geometry = useMemo(() => new SphereGeometry(radius * atmosphere.scale, 64, 32), [radius, atmosphere.scale]);
  const material = useMemo(() => createAtmosphereMaterial(atmosphere, radius), [atmosphere, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} renderOrder={2} />;
}
