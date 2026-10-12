"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  ExtrudeGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  type Group,
} from "three";
import { BILLBOARD_VERTEX } from "@/game/scenes/shaders/common";
import type { PickupSpec } from "@/game/systems/course";
import { clamp01 } from "@/game/systems/math";
import { runtime } from "@/game/systems/runtime";

const COLLECT_ANIMATION = 0.45;
const STAR_SIZE = 1.5;

const HALO_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float glow = exp(-r * 4.0) * 0.9 + exp(-r * 9.0) * 0.8;
  gl_FragColor = vec4(vec3(1.0, 0.78, 0.25) * glow * uOpacity, 1.0);
}
`;

function createStarGeometry() {
  const shape = new Shape();
  const points = 5;
  for (let i = 0; i <= points * 2; i++) {
    const radius = i % 2 === 0 ? STAR_SIZE : STAR_SIZE * 0.45;
    const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.45,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.12,
    bevelSegments: 1,
  });
  geometry.center();
  return geometry;
}

/** Collectible boost refills: spinning stars with a soft halo. */
export function EnergyStars({ pickups }: { pickups: PickupSpec[] }) {
  const geometry = useMemo(() => createStarGeometry(), []);
  const halo = useMemo(() => new PlaneGeometry(2, 2), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffd84d",
        emissive: "#ffb000",
        emissiveIntensity: 2.4,
        flatShading: true,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
      }),
    [],
  );
  const haloMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader: HALO_FRAGMENT,
        uniforms: { uSize: { value: 4.5 }, uOpacity: { value: 1 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const groups = useRef<(Group | null)[]>([]);

  useEffect(
    () => () => {
      geometry.dispose();
      halo.dispose();
      material.dispose();
      haloMaterial.dispose();
    },
    [geometry, halo, material, haloMaterial],
  );

  useFrame(() => {
    const { active, collectedAt } = runtime.pickups;
    groups.current.forEach((group, index) => {
      if (!group) return;
      const spin = group.children[0];
      if (spin) spin.rotation.y = runtime.clock * 2.2 + index;
      group.position.copy(pickups[index].position);
      group.position.y += Math.sin(runtime.clock * 2 + index * 1.7) * 0.4;
      if (active[index]) {
        group.visible = true;
        group.scale.setScalar(1);
        return;
      }
      const t = clamp01((runtime.clock - (collectedAt[index] ?? -Infinity)) / COLLECT_ANIMATION);
      group.visible = t < 1;
      group.scale.setScalar(1 + t * 1.8);
    });
  });

  return (
    <group>
      {pickups.map((pickup, index) => (
        <group
          key={index}
          position={pickup.position}
          ref={(group) => {
            groups.current[index] = group;
          }}
        >
          <mesh geometry={geometry} material={material} />
          <mesh geometry={halo} material={haloMaterial} renderOrder={2} />
        </group>
      ))}
    </group>
  );
}
