"use client";

import { Detailed } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  DoubleSide,
  IcosahedronGeometry,
  MathUtils,
  MeshStandardMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  type Group,
  type Texture,
} from "three";
import { VISUALS } from "@/game/config/visuals";
import type { CelestialBody, RingData } from "@/game/data/planets";
import { ringExtent } from "@/game/scenes/procedural/surfaceBakes";
import { OUTPUT_CHUNKS } from "@/game/scenes/shaders/common";
import { useQualitySettings } from "@/game/scenes/useQualitySettings";
import { useAssetStore } from "@/game/stores/assetStore";
import { moonletLocalPosition } from "@/game/systems/environment";
import { runtime } from "@/game/systems/runtime";
import { Atmosphere } from "./Atmosphere";
import { useBodyTextures } from "./textures";

const RING_VERTEX = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vCenter;
varying vec3 vNormalW;
varying float vRadius;
void main() {
  vRadius = length(position.xy);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vNormalW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/** Rings lit by the sun, darkened where the planet blocks the sunlight. */
const RING_FRAGMENT = /* glsl */ `
uniform sampler2D uRingMap;
uniform vec3 uSunDirection;
uniform float uInner;
uniform float uOuter;
uniform float uPlanetRadius;
uniform float uLight;
varying vec3 vWorldPosition;
varying vec3 vCenter;
varying vec3 vNormalW;
varying float vRadius;
void main() {
  float u = (vRadius - uInner) / (uOuter - uInner);
  if (u < 0.0 || u > 1.0) discard;
  vec4 ring = texture2D(uRingMap, vec2(u, 0.5));
  vec3 L = normalize(uSunDirection);
  vec3 toCenter = vCenter - vWorldPosition;
  float along = dot(toCenter, L);
  float missDistance = length(toCenter - L * along);
  float shadow = along > 0.0 ? smoothstep(uPlanetRadius * 0.97, uPlanetRadius * 1.03, missDistance) : 1.0;
  float lit = 0.35 + 0.65 * abs(dot(normalize(vNormalW), L));
  gl_FragColor = vec4(ring.rgb * lit * (0.2 + 0.8 * shadow) * uLight, ring.a);
  ${OUTPUT_CHUNKS}
}
`;

function Rings({ rings, radius, texture }: { rings: RingData; radius: number; texture: Texture }) {
  const { inner, outer } = ringExtent(rings);
  const geometry = useMemo(() => new RingGeometry(radius * inner, radius * outer, 160, 1), [radius, inner, outer]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: RING_VERTEX,
        fragmentShader: RING_FRAGMENT,
        uniforms: {
          uRingMap: { value: texture },
          uSunDirection: { value: runtime.sun.direction },
          uInner: { value: radius * inner },
          uOuter: { value: radius * outer },
          uPlanetRadius: { value: radius },
          uLight: { value: 1.6 },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [texture, radius, inner, outer],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} />;
}

function Moonlets({ body }: { body: CelestialBody }) {
  const detail = useAssetStore((state) => state.textures.detail);
  const geometries = useMemo(
    () => ({ round: new SphereGeometry(1, 32, 16), rough: new IcosahedronGeometry(1, 1) }),
    [],
  );
  const materials = useMemo(
    () =>
      (body.moonlets ?? []).map(
        (moonlet) =>
          new MeshStandardMaterial({
            color: moonlet.color,
            roughness: 1,
            flatShading: moonlet.irregular ?? false,
            bumpMap: detail ?? null,
            bumpScale: 1.5,
          }),
      ),
    [body.moonlets, detail],
  );
  // Rendered inside the planet's tilt group, so use the untilted local frame.
  const positions = useMemo(() => (body.moonlets ?? []).map((_, index) => moonletLocalPosition(body, index)), [body]);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  return (
    <>
      {(body.moonlets ?? []).map((moonlet, index) => (
        <mesh
          key={moonlet.name.en}
          geometry={moonlet.irregular ? geometries.rough : geometries.round}
          material={materials[index]}
          position={positions[index]}
          scale={moonlet.irregular ? [moonlet.radius * 1.3, moonlet.radius, moonlet.radius * 0.9] : moonlet.radius}
        />
      ))}
    </>
  );
}

/** Any planet except Earth (which has its own day/night shader) and the Sun. */
export function PlanetBody({ body }: { body: CelestialBody }) {
  const { planetSegments } = useQualitySettings();
  const { surface, rings } = useBodyTextures(body);
  const spin = useRef<Group>(null);
  const lodDistances = useMemo(() => VISUALS.lod.earth.map((d) => d * (body.radius / 200)), [body.radius]);
  const lods = useMemo(
    () => [
      new SphereGeometry(body.radius, planetSegments, planetSegments / 2),
      new SphereGeometry(body.radius, planetSegments / 2, planetSegments / 4),
      new SphereGeometry(body.radius, 32, 16),
    ],
    [body.radius, planetSegments],
  );
  const material = useMemo(() => {
    const rocky = body.surface.type === "rocky";
    return new MeshStandardMaterial({
      map: surface ?? null,
      bumpMap: rocky ? (surface ?? null) : null,
      bumpScale: rocky ? 2.2 : 0,
      roughness: rocky ? 1 : 0.92,
      metalness: 0,
      color: surface ? "#ffffff" : body.iconColors[1],
    });
  }, [surface, body.surface.type, body.iconColors]);

  useEffect(() => () => lods.forEach((geometry) => geometry.dispose()), [lods]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += body.rotationSpeed * delta * runtime.timeScale;
  });

  return (
    <group position={body.position}>
      <group rotation={[0, 0, MathUtils.degToRad(body.axialTilt)]}>
        <group ref={spin}>
          <Detailed distances={lodDistances}>
            {lods.map((geometry, index) => (
              <mesh key={index} geometry={geometry} material={material} />
            ))}
          </Detailed>
        </group>
        {body.rings && rings && <Rings rings={body.rings} radius={body.radius} texture={rings} />}
        {body.moonlets && <Moonlets body={body} />}
      </group>
      {body.atmosphere && <Atmosphere atmosphere={body.atmosphere} radius={body.radius} />}
    </group>
  );
}
