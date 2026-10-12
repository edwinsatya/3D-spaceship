"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  type Group,
} from "three";
import { FLIGHT } from "@/game/config/flight";
import { TRAIL } from "@/game/config/world";
import { clamp01, damp } from "@/game/systems/math";
import { runtime } from "@/game/systems/runtime";
import { createShipGeometries, disposeShipGeometries, SHIP_LAYOUT } from "./shipGeometry";

export interface ShipColors {
  body: string;
  accent: string;
  glow: string;
}

export const DEFAULT_SHIP_COLORS: ShipColors = {
  body: "#cfd8e6",
  accent: "#ff6b3d",
  glow: TRAIL.color,
};

const FLAME_VERTEX = /* glsl */ `
varying float vAlong;
varying vec3 vNormalV;
void main() {
  vAlong = position.z;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FLAME_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying float vAlong;
varying vec3 vNormalV;
void main() {
  float flicker = 0.85 + 0.15 * sin(uTime * 48.0 + vAlong * 9.0);
  float fade = pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.6);
  float edge = pow(abs(vNormalV.z), 1.5);
  vec3 core = mix(uColor, vec3(1.0), fade * 0.6);
  gl_FragColor = vec4(core * fade * edge * uIntensity * flicker, 1.0);
}
`;

const GLOW_INTENSITY = 6;
const BOOST_COLOR = new Color(TRAIL.boostColor);

function useShipMaterials(colors: ShipColors) {
  return useMemo(() => {
    const glow = new Color(colors.glow);
    return {
      body: new MeshStandardMaterial({ color: colors.body, flatShading: true, roughness: 0.45, metalness: 0.25 }),
      accent: new MeshStandardMaterial({ color: colors.accent, flatShading: true, roughness: 0.45, metalness: 0.3 }),
      fin: new MeshStandardMaterial({ color: colors.accent, flatShading: true, roughness: 0.5, side: DoubleSide }),
      glass: new MeshStandardMaterial({
        color: "#0d2a5c",
        emissive: "#1a5cff",
        emissiveIntensity: 0.35,
        flatShading: true,
        roughness: 0.12,
        metalness: 0.6,
      }),
      nozzle: new MeshBasicMaterial({ color: glow.clone().multiplyScalar(GLOW_INTENSITY), toneMapped: false }),
      navLights: SHIP_LAYOUT.navLights.map(
        (light) => new MeshBasicMaterial({ color: new Color(light.color).multiplyScalar(3), toneMapped: false }),
      ),
      flame: new ShaderMaterial({
        vertexShader: FLAME_VERTEX,
        fragmentShader: FLAME_FRAGMENT,
        uniforms: { uColor: { value: glow.clone() }, uIntensity: { value: 2.5 }, uTime: { value: 0 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
      glowColor: glow,
    };
  }, [colors.body, colors.accent, colors.glow]);
}

/** Procedural low-poly ship. Colors are props so the Phase 2 hangar can recolor it. */
export function ShipModel({ colors = DEFAULT_SHIP_COLORS, cockpit = false }: { colors?: ShipColors; cockpit?: boolean }) {
  const geometries = useMemo(() => createShipGeometries(), []);
  const materials = useShipMaterials(colors);
  const flames = useRef<Group>(null);
  const flameLength = useRef(0.4);

  useEffect(() => () => disposeShipGeometries(geometries), [geometries]);
  useEffect(
    () => () => {
      const { glowColor: _glow, navLights, ...rest } = materials;
      for (const material of [...Object.values(rest), ...navLights]) material.dispose();
    },
    [materials],
  );

  useFrame((_, delta) => {
    const ship = runtime.ship;
    const speed01 = clamp01(ship.speed / FLIGHT.maxSpeed);
    const boosting = ship.boost.active;
    flameLength.current = damp(flameLength.current, boosting ? 2.6 : 0.35 + speed01 * 1.2, 8, delta);
    if (flames.current) {
      for (const flame of flames.current.children) flame.scale.z = flameLength.current;
    }
    const uniforms = materials.flame.uniforms;
    uniforms.uTime.value += delta;
    uniforms.uIntensity.value = boosting ? 4 : 1.6 + speed01 * 1.6;
    uniforms.uColor.value.copy(boosting ? BOOST_COLOR : materials.glowColor);
    materials.nozzle.color.copy(boosting ? BOOST_COLOR : materials.glowColor).multiplyScalar(GLOW_INTENSITY);
  });

  return (
    <group>
      <group visible={!cockpit}>
        <mesh geometry={geometries.fuselage} material={materials.body} />
        <mesh geometry={geometries.canopy} material={materials.glass} />
        <mesh geometry={geometries.wingLeft} material={materials.body} />
        <mesh geometry={geometries.wingRight} material={materials.body} />
        <mesh geometry={geometries.finLeft} material={materials.fin} />
        <mesh geometry={geometries.finRight} material={materials.fin} />
        {SHIP_LAYOUT.nozzles.map(([x, y, z]) => (
          <mesh key={x} geometry={geometries.engine} material={materials.accent} position={[x, y, z - 0.47]} />
        ))}
        {SHIP_LAYOUT.navLights.map((light, index) => (
          <mesh key={light.color} geometry={geometries.tip} material={materials.navLights[index]} position={light.position} />
        ))}
      </group>
      {SHIP_LAYOUT.nozzles.map(([x, y, z]) => (
        <mesh key={x} geometry={geometries.nozzle} material={materials.nozzle} position={[x, y, z]} />
      ))}
      <group ref={flames}>
        {SHIP_LAYOUT.nozzles.map(([x, y, z]) => (
          <mesh key={x} geometry={geometries.flame} material={materials.flame} position={[x, y, z]} renderOrder={3} />
        ))}
      </group>
    </group>
  );
}

/**
 * Minimal cockpit frame for the first-person view. The eye sits at
 * CAMERA.cockpitOffset; the dash stays in the bottom ~15% of the screen.
 */
export function CockpitFrame() {
  const materials = useMemo(
    () => ({
      dash: new MeshStandardMaterial({ color: "#1b2333", roughness: 0.7, metalness: 0.3, flatShading: true }),
      strut: new MeshStandardMaterial({ color: "#2a3446", roughness: 0.6 }),
      light: new MeshBasicMaterial({ color: new Color("#5fe6ff").multiplyScalar(0.9), toneMapped: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  return (
    <group>
      <mesh position={[0, 0.06, -1.2]} rotation={[-0.35, 0, 0]} material={materials.dash}>
        <boxGeometry args={[1.8, 0.26, 0.5]} />
      </mesh>
      <mesh position={[0, 0.17, -1.0]} rotation={[-0.35, 0, 0]} material={materials.light}>
        <boxGeometry args={[0.36, 0.008, 0.02]} />
      </mesh>
      <mesh position={[-0.78, 0.58, -1.25]} rotation={[0.25, 0, 0.42]} material={materials.strut}>
        <boxGeometry args={[0.05, 1.1, 0.05]} />
      </mesh>
      <mesh position={[0.78, 0.58, -1.25]} rotation={[0.25, 0, -0.42]} material={materials.strut}>
        <boxGeometry args={[0.05, 1.1, 0.05]} />
      </mesh>
    </group>
  );
}
