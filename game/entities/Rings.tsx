"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  type Group,
} from "three";
import { MISSION } from "@/game/config/mission";
import type { RingSpec } from "@/game/systems/course";
import { orientationFromForwardUp } from "@/game/systems/flight";
import { clamp01, easeOutCubic } from "@/game/systems/math";
import { accessibility } from "@/game/systems/accessibility";
import { runtime } from "@/game/systems/runtime";

const COLORS = {
  next: new Color("#ffd84d").multiplyScalar(3.2),
  preview: new Color("#5fe6ff").multiplyScalar(1.8),
  idle: new Color("#3aa7b8").multiplyScalar(0.9),
};

const PORTAL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float rim = smoothstep(0.55, 1.0, r);
  float waves = 0.5 + 0.5 * sin(r * 14.0 - uTime * 4.0);
  vec3 color = vec3(1.0, 0.85, 0.35);
  gl_FragColor = vec4(color * (rim * 0.5 + waves * 0.12) * uOpacity, 1.0);
}
`;

const PORTAL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Race rings: the next one glows gold, the one after previews in cyan. */
export function Rings({ rings }: { rings: RingSpec[] }) {
  const radius = rings[0]?.radius ?? 10;
  const torus = useMemo(() => new TorusGeometry(radius, MISSION.ringTubeRadius, 10, 56), [radius]);
  const portal = useMemo(() => new CircleGeometry(radius - MISSION.ringTubeRadius, 40), [radius]);
  const portalMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PORTAL_VERTEX,
        fragmentShader: PORTAL_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const materials = useMemo(
    () => rings.map(() => new MeshBasicMaterial({ color: COLORS.idle.clone(), transparent: true, toneMapped: false })),
    [rings],
  );
  const groups = useRef<(Group | null)[]>([]);
  const portalGroup = useRef<Group>(null);
  const orientations = useMemo(
    () => rings.map((ring) => orientationFromForwardUp(ring.normal, ring.up, new Quaternion())),
    [rings],
  );

  useEffect(
    () => () => {
      torus.dispose();
      portal.dispose();
      portalMaterial.dispose();
    },
    [torus, portal, portalMaterial],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useFrame(() => {
    const mission = runtime.mission;
    const next = mission.status === "finished" ? rings.length : mission.completed;
    const pulse = 0.75 + 0.25 * Math.sin(runtime.clock * 6);
    portalMaterial.uniforms.uTime.value = runtime.clock;

    for (let index = 0; index < materials.length; index++) {
      const material = materials[index];
      const group = groups.current[index];
      if (!group) continue;
      if (index < next) {
        const passedAt = runtime.gatePassedAt[index] ?? -1;
        const t = passedAt < 0 ? 1 : clamp01((runtime.clock - passedAt) / MISSION.ringPassFadeDuration);
        group.visible = t < 1;
        group.scale.setScalar(1 + easeOutCubic(t) * MISSION.ringPassScaleBoost);
        material.color.copy(accessibility.colors.success).multiplyScalar(3);
        material.opacity = 1 - t;
        continue;
      }
      group.visible = true;
      group.scale.setScalar(1);
      if (index === next) {
        material.color.copy(COLORS.next).multiplyScalar(pulse);
        material.opacity = 1;
      } else if (index === next + 1) {
        material.color.copy(COLORS.preview);
        material.opacity = 0.85;
      } else {
        material.color.copy(COLORS.idle);
        material.opacity = 0.55;
      }
    }

    const portalTarget = portalGroup.current;
    if (portalTarget) {
      const ring = rings[next];
      portalTarget.visible = Boolean(ring);
      if (ring) {
        portalTarget.position.copy(ring.position);
        portalTarget.quaternion.copy(orientations[next]);
      }
    }
  });

  return (
    <group>
      {rings.map((ring, index) => (
        <group
          key={ring.index}
          ref={(group) => {
            groups.current[index] = group;
          }}
          position={ring.position}
          quaternion={orientations[index]}
        >
          <mesh geometry={torus} material={materials[index]} />
        </group>
      ))}
      <group ref={portalGroup}>
        <mesh geometry={portal} material={portalMaterial} renderOrder={2} />
      </group>
    </group>
  );
}
