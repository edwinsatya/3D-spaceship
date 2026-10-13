"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  Color,
  InstancedMesh,
  MeshStandardMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Mesh,
} from "three";
import { VISUALS } from "@/game/config/visuals";
import { SURFACES, type SurfaceId } from "@/game/data/surfaces";
import { EnergyStars } from "@/game/entities/EnergyStars";
import { SunDirectionalLight } from "@/game/entities/SunDirectionalLight";
import { PointOfInterestProp } from "@/game/entities/surface/SurfaceProps";
import { OUTPUT_CHUNKS } from "@/game/scenes/shaders/common";
import { useQualitySettings } from "@/game/scenes/useQualitySettings";
import { useAssetStore } from "@/game/stores/assetStore";
import { terrainFor } from "@/game/systems/landingFlow";
import { runtime } from "@/game/systems/runtime";
import { createRockGeometry, createRockMatrices, prebuildTerrain, takeTerrainGeometry } from "./terrainMesh";

function Ground({ surface }: { surface: SurfaceId }) {
  const { terrainSegments } = useQualitySettings();
  const terrain = terrainFor(surface);
  const geometry = useMemo(() => takeTerrainGeometry(terrain, terrainSegments), [terrain, terrainSegments]);
  const material = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

function Rocks({ surface }: { surface: SurfaceId }) {
  const terrain = terrainFor(surface);
  const rock = SURFACES[surface].palette.rock;
  const mesh = useMemo(() => {
    const matrices = createRockMatrices(terrain);
    const instanced = new InstancedMesh(
      createRockGeometry(),
      new MeshStandardMaterial({ color: rock, flatShading: true, roughness: 0.95 }),
      matrices.length,
    );
    matrices.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
    instanced.instanceMatrix.needsUpdate = true;
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    instanced.computeBoundingSphere();
    return instanced;
  }, [terrain, rock]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/**
 * Builds the ground of the site you are descending to a few ms per frame, so
 * swapping scenes behind the fade doesn't freeze slower phones.
 */
export function TerrainPrebuilder() {
  const { terrainSegments } = useQualitySettings();
  useFrame(() => {
    const landing = runtime.landing;
    if (!landing.body || (landing.phase !== "descent" && landing.phase !== "fadeToSurface")) return;
    prebuildTerrain(terrainFor(landing.body), terrainSegments, performance.now() + VISUALS.surface.prebuildBudgetMs);
  });
  return null;
}

/** The landing site in universe coordinates (lives inside the floating-origin root). */
export function SurfaceScene({ surface }: { surface: SurfaceId }) {
  const terrain = terrainFor(surface);
  const definition = SURFACES[surface];
  return (
    <>
      <Ground surface={surface} />
      <Rocks surface={surface} />
      {terrain.pointsOfInterest.map((poi, index) => (
        <group key={poi.id} position={poi.position} rotation={[0, index * 1.3 + 0.4, 0]}>
          <PointOfInterestProp id={poi.id} kind={definition.pointsOfInterest[index].kind} accent={definition.palette.accent} />
        </group>
      ))}
      <EnergyStars pickups={terrain.pickups} />
    </>
  );
}

/** Distance fog for the landing site (must be a direct child of the scene). */
export function SurfaceFog({ surface }: { surface: SurfaceId }) {
  const { color, near, far } = SURFACES[surface].fog;
  return <fog attach="fog" args={[color, near, far]} />;
}

/** Surface lighting: the site's own sun and ambient sky light. */
export function SurfaceLight({ surface }: { surface: SurfaceId }) {
  const definition = SURFACES[surface];
  const direction = useMemo(() => new Vector3(...definition.sunDirection).normalize(), [definition]);
  return (
    <>
      <SunDirectionalLight direction={direction} intensity={definition.sunIntensity} extent={VISUALS.shadows.extent.surface} />
      <ambientLight intensity={definition.ambient.intensity} color={definition.ambient.color} />
      {definition.sky.type === "atmosphere" && (
        <hemisphereLight args={[definition.sky.zenith, definition.palette.low, 0.35]} />
      )}
    </>
  );
}

const EARTH_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EARTH_FRAGMENT = /* glsl */ `
uniform sampler2D uDayMap;
uniform vec3 uSunDirection;
uniform vec3 uViewDirection;
varying vec2 vUv;
varying vec3 vNormalW;
void main() {
  vec3 N = normalize(vNormalW);
  float light = smoothstep(-0.05, 0.35, dot(N, normalize(uSunDirection)));
  vec3 albedo = texture2D(uDayMap, vUv).rgb;
  float rim = pow(clamp(1.0 - dot(N, -uViewDirection), 0.0, 1.0), 2.5);
  vec3 color = albedo * light * 1.6 + vec3(0.35, 0.6, 1.0) * rim * light * 0.9;
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_CHUNKS}
}
`;

const _earthDirection = new Vector3();

/** Earth hanging in the black lunar sky, lit by the site's sun (so it shows a phase). */
export function EarthInSky({ direction }: { direction: readonly [number, number, number] }) {
  const dayMap = useAssetStore((state) => state.textures.earthDay);
  const mesh = useRef<Mesh>(null);
  const { distance, radius } = VISUALS.surface.earthInSky;
  const geometry = useMemo(() => new SphereGeometry(radius, 48, 32), [radius]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: EARTH_VERTEX,
        fragmentShader: EARTH_FRAGMENT,
        uniforms: {
          uDayMap: { value: null },
          uSunDirection: { value: runtime.sun.direction },
          uViewDirection: { value: new Vector3() },
        },
      }),
    [],
  );
  useEffect(() => {
    material.uniforms.uDayMap.value = dayMap ?? null;
  }, [material, dayMap]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ camera }, delta) => {
    if (!mesh.current) return;
    _earthDirection.set(direction[0], direction[1], direction[2]).normalize();
    mesh.current.position.copy(camera.position).addScaledVector(_earthDirection, distance);
    mesh.current.rotation.y += delta * 0.01;
    material.uniforms.uViewDirection.value.copy(_earthDirection);
  });
  if (!dayMap) return null;
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={-4} />;
}

const SKY_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHalo;
uniform vec3 uSunDirection;
varying vec3 vDirection;
void main() {
  vec3 dir = normalize(vDirection);
  float up = clamp(dir.y, 0.0, 1.0);
  vec3 color = mix(uHorizon, uZenith, pow(up, 0.55));
  float sun = max(dot(dir, normalize(uSunDirection)), 0.0);
  color = mix(color, uHalo, pow(sun, 24.0) * 0.55);
  color += uHalo * smoothstep(0.9993, 0.9997, sun) * 1.4;
  color = mix(color, uHorizon * 0.9, smoothstep(0.0, -0.25, dir.y));
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_CHUNKS}
}
`;

/** Dusty butterscotch Martian sky dome, centred on the camera, with a small pale sun. */
export function MarsSky({ zenith, horizon, sunHalo }: { zenith: string; horizon: string; sunHalo: string }) {
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => new SphereGeometry(VISUALS.surface.skyRadius, 48, 24), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: {
          uZenith: { value: new Color(zenith) },
          uHorizon: { value: new Color(horizon) },
          uHalo: { value: new Color(sunHalo) },
          uSunDirection: { value: runtime.sun.direction },
        },
        side: BackSide,
        depthWrite: false,
      }),
    [zenith, horizon, sunHalo],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />;
}
