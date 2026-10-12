"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { TRAIL } from "@/game/config/world";
import { damp, smoothstep } from "@/game/systems/math";
import { runtime } from "@/game/systems/runtime";
import { SHIP_LAYOUT } from "./shipGeometry";

const TRAIL_VERTEX = /* glsl */ `
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const TRAIL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor * vAlpha * vAlpha * uOpacity, 1.0);
}
`;

const TELEPORT_DISTANCE = 60;
const BANK_AXIS = new Vector3(0, 0, 1);

interface Trail {
  /** Universe-space samples, newest first (float64 to survive origin shifts). */
  points: Float64Array;
  geometry: BufferGeometry;
  positions: Float32Array;
  offset: Vector3;
}

function createTrail(offset: readonly [number, number, number]): Trail {
  const count = TRAIL.points;
  const positions = new Float32Array(count * 2 * 3);
  const alphas = new Float32Array(count * 2);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const alpha = 1 - i / (count - 1);
    alphas[i * 2] = alpha;
    alphas[i * 2 + 1] = alpha;
    if (i < count - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(positions, 3);
  position.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", position);
  geometry.setAttribute("aAlpha", new BufferAttribute(alphas, 1));
  geometry.setIndex(indices);
  return { points: new Float64Array(count * 3), geometry, positions, offset: new Vector3(...offset) };
}

const _head = new Vector3();
const _bank = new Quaternion();
const _a = new Vector3();
const _b = new Vector3();
const _dir = new Vector3();
const _view = new Vector3();
const _side = new Vector3();

function resetTrail(trail: Trail, head: Vector3) {
  for (let i = 0; i < trail.points.length; i += 3) {
    trail.points[i] = head.x;
    trail.points[i + 1] = head.y;
    trail.points[i + 2] = head.z;
  }
}

function readPoint(trail: Trail, index: number, target: Vector3): Vector3 {
  return target.set(trail.points[index * 3], trail.points[index * 3 + 1], trail.points[index * 3 + 2]);
}

/** Ribbon trails behind both nozzles, stored in universe space (floating-origin safe). */
export function EngineTrails() {
  const trails = useMemo(() => SHIP_LAYOUT.nozzles.map(createTrail), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: TRAIL_VERTEX,
        fragmentShader: TRAIL_FRAGMENT,
        uniforms: { uColor: { value: new Color(TRAIL.color) }, uOpacity: { value: 0 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const baseColor = useMemo(() => new Color(TRAIL.color).multiplyScalar(1.6), []);
  const boostColor = useMemo(() => new Color(TRAIL.boostColor).multiplyScalar(2.2), []);
  const sampleTimer = useMemo(() => ({ value: 0 }), []);

  useEffect(
    () => () => {
      for (const trail of trails) trail.geometry.dispose();
      material.dispose();
    },
    [trails, material],
  );

  useFrame(({ camera }, delta) => {
    const ship = runtime.ship;
    const count = TRAIL.points;
    sampleTimer.value += delta;
    const sample = sampleTimer.value >= TRAIL.sampleInterval;
    if (sample) sampleTimer.value = 0;
    _bank.setFromAxisAngle(BANK_AXIS, ship.bank);

    for (const trail of trails) {
      _head.copy(trail.offset).applyQuaternion(_bank).applyQuaternion(ship.quaternion).add(ship.position);
      if (readPoint(trail, 0, _a).distanceTo(_head) > TELEPORT_DISTANCE) resetTrail(trail, _head);
      if (sample) {
        trail.points.copyWithin(3, 0, (count - 1) * 3);
        trail.points[0] = _head.x;
        trail.points[1] = _head.y;
        trail.points[2] = _head.z;
      }
      for (let i = 0; i < count; i++) {
        if (i === 0) _a.copy(_head);
        else readPoint(trail, i, _a);
        readPoint(trail, Math.min(i + 1, count - 1), _b);
        if (i === count - 1) readPoint(trail, i - 1, _b);
        _dir.subVectors(_a, _b);
        if (i === count - 1) _dir.negate();
        _a.sub(runtime.origin);
        _view.subVectors(_a, camera.position);
        _side.crossVectors(_dir, _view);
        const length = _side.length();
        const width = (TRAIL.width * (1 - i / count)) / 2;
        if (length > 1e-6) _side.multiplyScalar(width / length);
        else _side.set(0, 0, 0);
        trail.positions[i * 6] = _a.x + _side.x;
        trail.positions[i * 6 + 1] = _a.y + _side.y;
        trail.positions[i * 6 + 2] = _a.z + _side.z;
        trail.positions[i * 6 + 3] = _a.x - _side.x;
        trail.positions[i * 6 + 4] = _a.y - _side.y;
        trail.positions[i * 6 + 5] = _a.z - _side.z;
      }
      trail.geometry.attributes.position.needsUpdate = true;
    }

    const uniforms = material.uniforms;
    uniforms.uOpacity.value = damp(uniforms.uOpacity.value, smoothstep(3, 18, ship.speed), 6, delta);
    uniforms.uColor.value.lerp(ship.boost.active ? boostColor : baseColor, 1 - Math.exp(-8 * delta));
  });

  return (
    <>
      {trails.map((trail, index) => (
        <mesh key={index} geometry={trail.geometry} material={material} frustumCulled={false} renderOrder={4} />
      ))}
    </>
  );
}
