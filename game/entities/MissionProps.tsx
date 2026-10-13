"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { MISSION } from "@/game/config/mission";
import { VISUALS } from "@/game/config/visuals";
import { BILLBOARD_VERTEX } from "@/game/scenes/shaders/common";
import type { PickupSpec, RingSpec } from "@/game/systems/course";
import { getShipForward, orientationFromForwardUp, SHIP_UP } from "@/game/systems/flight";
import { clamp01 } from "@/game/systems/math";
import { CRYSTAL_RADIUS } from "@/game/systems/objectives";
import { runtime } from "@/game/systems/runtime";

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float glow = exp(-r * 4.0) * 0.8 + exp(-r * 10.0) * 0.6;
  gl_FragColor = vec4(uColor * glow * uOpacity, 1.0);
}
`;

function useHalo(color: string, size: number) {
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader: HALO_FRAGMENT,
        uniforms: { uSize: { value: size }, uColor: { value: new Color(color) }, uOpacity: { value: 1 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [color, size],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return { geometry, material };
}

/** Collect missions: spinning violet crystals that burst when you fly through them. */
export function Crystals({ crystals }: { crystals: PickupSpec[] }) {
  const geometry = useMemo(() => new OctahedronGeometry(1, 0), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#c9a8ff",
        emissive: "#9a5cff",
        emissiveIntensity: 2.6,
        roughness: 0.2,
        metalness: 0.1,
        flatShading: true,
        transparent: true,
      }),
    [],
  );
  const halo = useHalo("#b48cff", CRYSTAL_RADIUS * 3.2);
  const groups = useRef<(Group | null)[]>([]);
  const { collectAnimation, collectScale } = VISUALS.energyStar;

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const { collected, collectedAt } = runtime.objective;
    for (let index = 0; index < groups.current.length; index++) {
      const group = groups.current[index];
      if (!group) continue;
      const spin = group.children[0];
      if (spin) spin.rotation.set(Math.sin(runtime.clock * 0.7 + index) * 0.3, runtime.clock * 1.6 + index, 0);
      if (!collected[index]) {
        group.visible = true;
        group.scale.setScalar(1 + Math.sin(runtime.clock * 3 + index) * 0.06);
        continue;
      }
      const t = clamp01((runtime.clock - (collectedAt[index] ?? -Infinity)) / collectAnimation);
      group.visible = t < 1;
      group.scale.setScalar(1 + t * collectScale);
    }
  });

  return (
    <group>
      {crystals.map((crystal, index) => (
        <group
          key={index}
          position={crystal.position}
          ref={(group) => {
            groups.current[index] = group;
          }}
        >
          <mesh geometry={geometry} material={material} scale={[CRYSTAL_RADIUS * 0.7, CRYSTAL_RADIUS * 1.5, CRYSTAL_RADIUS * 0.7]} />
          <mesh geometry={halo.geometry} material={halo.material} renderOrder={2} />
        </group>
      ))}
    </group>
  );
}

const _forward = new Vector3();
const _towPoint = new Vector3();
const _tether = new Vector3();
const _towQuaternion = new Quaternion();
const _shipUp = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);

/** Delivery missions: cargo pods; the one you picked up is towed behind the ship on a tether. */
export function CargoPods({ pods }: { pods: PickupSpec[] }) {
  const geometries = useMemo(
    () => ({ body: new BoxGeometry(2.2, 2.2, 3.4), band: new BoxGeometry(2.3, 2.3, 0.4), tether: new CylinderGeometry(0.08, 0.08, 1, 5) }),
    [],
  );
  const materials = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: "#f39a2b", roughness: 0.55, metalness: 0.2 }),
      band: new MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.6 }),
      light: new MeshStandardMaterial({ color: "#ffe08a", emissive: "#ffcc33", emissiveIntensity: 3, toneMapped: false }),
      tether: new MeshStandardMaterial({ color: "#d9dde3", emissive: "#5fe6ff", emissiveIntensity: 0.6 }),
    }),
    [],
  );
  const halo = useHalo("#ffb347", 4.5);
  const groups = useRef<(Group | null)[]>([]);
  const tether = useRef<Mesh>(null);

  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
    [geometries, materials],
  );

  useFrame(() => {
    const { collected, carrying } = runtime.objective;
    const ship = runtime.ship;
    materials.light.emissiveIntensity = Math.sin(runtime.clock * 5) > 0 ? 3.5 : 0.6;
    for (let index = 0; index < groups.current.length; index++) {
      const group = groups.current[index];
      if (!group) continue;
      if (index === carrying) {
        getShipForward(ship, _forward);
        _shipUp.copy(SHIP_UP).applyQuaternion(ship.quaternion);
        _towPoint
          .copy(ship.position)
          .addScaledVector(_shipUp, -MISSION.podTow.below)
          .addScaledVector(_forward, -MISSION.podTow.behind);
        // Lag a little behind so the pod swings when you turn.
        group.position.lerp(_towPoint, 0.25);
        group.quaternion.slerp(ship.quaternion, 0.2);
        group.visible = true;
        continue;
      }
      group.visible = !collected[index];
      if (!group.visible) continue;
      group.position.copy(pods[index].position);
      group.rotation.set(Math.sin(runtime.clock * 0.4 + index) * 0.4, runtime.clock * 0.3 + index, 0);
    }
    const line = tether.current;
    const towed = carrying >= 0 ? groups.current[carrying] : null;
    if (line) {
      line.visible = Boolean(towed);
      if (towed) {
        _tether.subVectors(ship.position, towed.position);
        const length = _tether.length();
        line.position.copy(towed.position).addScaledVector(_tether, 0.5);
        line.scale.set(1, Math.max(0.01, length - 2), 1);
        _towQuaternion.setFromUnitVectors(Y_AXIS, _tether.normalize());
        line.quaternion.copy(_towQuaternion);
      }
    }
  });

  return (
    <group>
      {pods.map((pod, index) => (
        <group
          key={index}
          position={pod.position}
          ref={(group) => {
            groups.current[index] = group;
          }}
        >
          <mesh geometry={geometries.body} material={materials.body} />
          {[-1, 1].map((z) => (
            <mesh key={z} geometry={geometries.band} material={materials.band} position={[0, 0, z]} />
          ))}
          <mesh material={materials.light} position={[0, 1.35, 0]}>
            <sphereGeometry args={[0.4, 8, 6]} />
          </mesh>
          <mesh geometry={halo.geometry} material={halo.material} renderOrder={2} />
        </group>
      ))}
      <mesh ref={tether} geometry={geometries.tether} material={materials.tether} visible={false} />
    </group>
  );
}

const PORTAL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float rim = smoothstep(0.5, 1.0, r);
  float waves = 0.5 + 0.5 * sin(r * 12.0 - uTime * 5.0);
  gl_FragColor = vec4(vec3(1.0, 0.8, 0.3) * (rim * 0.6 + waves * 0.15) * uOpacity, 1.0);
}
`;

const PORTAL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Delivery missions: the docking gate lights up gold while you tow a pod. */
export function DockPortal({ gate }: { gate: RingSpec }) {
  const geometry = useMemo(() => new CircleGeometry(gate.radius - 0.5, 40), [gate.radius]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PORTAL_VERTEX,
        fragmentShader: PORTAL_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const quaternion = useMemo(() => orientationFromForwardUp(gate.normal, gate.up, new Quaternion()), [gate]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(() => {
    const target = runtime.objective.carrying >= 0 ? 1 : 0;
    const uniforms = material.uniforms;
    uniforms.uOpacity.value += (target - uniforms.uOpacity.value) * 0.1;
    uniforms.uTime.value = runtime.clock;
  });
  return <mesh geometry={geometry} material={material} position={gate.position} quaternion={quaternion} renderOrder={2} />;
}
