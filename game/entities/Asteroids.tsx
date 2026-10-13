"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  IcosahedronGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import type { AsteroidSpec } from "@/game/systems/course";
import { createRandom } from "@/game/systems/random";
import { runtime } from "@/game/systems/runtime";

const VARIANTS = 3;

function createRockGeometry(seed: number) {
  const random = createRandom(seed);
  const noise = new SimplexNoise({ random: random.next });
  const geometry = new IcosahedronGeometry(1, 2);
  const position = geometry.attributes.position;
  const vertex = new Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).normalize();
    const bump =
      1 +
      0.28 * noise.noise3d(vertex.x * 1.4, vertex.y * 1.4, vertex.z * 1.4) +
      0.1 * noise.noise3d(vertex.x * 3.6 + 7, vertex.y * 3.6, vertex.z * 3.6);
    vertex.multiplyScalar(bump);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

interface InstanceMotion {
  spec: AsteroidSpec;
  axis: Vector3;
  speed: number;
  scale: Vector3;
  phase: number;
}

const _matrix = new Matrix4();
const _rotation = new Quaternion();
const _scale = new Vector3();

/** Rocky obstacles drawn with one InstancedMesh per shape variant. */
export function Asteroids({ asteroids }: { asteroids: AsteroidSpec[] }) {
  const geometries = useMemo(() => Array.from({ length: VARIANTS }, (_, i) => createRockGeometry(1000 + i * 77)), []);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: "#8d8178", roughness: 0.95, metalness: 0.05, flatShading: true }),
    [],
  );
  const groups = useMemo(() => {
    const buckets: InstanceMotion[][] = Array.from({ length: VARIANTS }, () => []);
    asteroids.forEach((spec) => {
      const random = createRandom(spec.seed);
      buckets[spec.seed % VARIANTS].push({
        spec,
        axis: new Vector3(random.range(-1, 1), random.range(-1, 1), random.range(-1, 1)).normalize(),
        speed: random.range(0.05, 0.35),
        scale: new Vector3(random.range(0.85, 1.2), random.range(0.75, 1.05), random.range(0.85, 1.2)),
        phase: random.range(0, Math.PI * 2),
      });
    });
    return buckets;
  }, [asteroids]);
  const meshes = useRef<(InstancedMesh | null)[]>([]);

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
    },
    [geometries, material],
  );

  useFrame(() => {
    for (let variant = 0; variant < groups.length; variant++) {
      const mesh = meshes.current[variant];
      if (!mesh) continue;
      const bucket = groups[variant];
      for (let index = 0; index < bucket.length; index++) {
        const motion = bucket[index];
        _rotation.setFromAxisAngle(motion.axis, motion.phase + runtime.clock * motion.speed);
        _scale.copy(motion.scale).multiplyScalar(motion.spec.radius);
        _matrix.compose(motion.spec.position, _rotation, _scale);
        mesh.setMatrixAt(index, _matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {groups.map((bucket, variant) => (
        <instancedMesh
          key={variant}
          ref={(mesh) => {
            meshes.current[variant] = mesh;
          }}
          args={[geometries[variant], material, Math.max(1, bucket.length)]}
          count={bucket.length}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
