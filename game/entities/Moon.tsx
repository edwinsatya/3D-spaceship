"use client";

import { Detailed } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { MathUtils, SphereGeometry, Vector3 } from "three";
import { MOON, EARTH } from "@/game/data/planets";
import { useQualitySettings } from "@/game/scenes/useQualitySettings";
import { useAssetStore } from "@/game/stores/assetStore";

const LOD_DISTANCES = [0, 700, 1800];

/** The Moon is tidally locked: its near side always faces Earth. */
function faceEarthRotation(): [number, number, number] {
  const toEarth = new Vector3(...EARTH.position).sub(new Vector3(...MOON.position)).normalize();
  const yaw = Math.atan2(toEarth.x, toEarth.z);
  return [MathUtils.degToRad(MOON.axialTilt), yaw, 0];
}

export function Moon() {
  const map = useAssetStore((state) => state.textures.moon);
  const { planetSegments } = useQualitySettings();
  const lods = useMemo(
    () => [
      new SphereGeometry(MOON.radius, planetSegments * 0.75, planetSegments * 0.375),
      new SphereGeometry(MOON.radius, 40, 20),
      new SphereGeometry(MOON.radius, 20, 10),
    ],
    [planetSegments],
  );
  const rotation = useMemo(() => faceEarthRotation(), []);

  useEffect(() => () => lods.forEach((geometry) => geometry.dispose()), [lods]);

  if (!map) return null;
  return (
    <group position={MOON.position} rotation={rotation}>
      <Detailed distances={LOD_DISTANCES}>
        {lods.map((geometry, index) => (
          <mesh key={index} geometry={geometry}>
            <meshStandardMaterial map={map} bumpMap={map} bumpScale={2.2} roughness={1} metalness={0} />
          </mesh>
        ))}
      </Detailed>
    </group>
  );
}
