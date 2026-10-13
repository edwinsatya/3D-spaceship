"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Group, type Mesh } from "three";
import { STATION } from "@/game/data/station";
import { runtime } from "@/game/systems/runtime";
import { useShadows } from "./SunDirectionalLight";
import { stationLayout } from "@/game/systems/station";

/** Blue cells with thin gold borders, tiled along each solar wing. */
function createSolarTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#c9a54a";
    context.fillRect(0, 0, 64, 128);
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 4; column++) {
        context.fillStyle = (row + column) % 3 === 0 ? "#1d3d7a" : "#173266";
        context.fillRect(column * 16 + 1, row * 16 + 1, 14, 14);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

function useStationMaterials() {
  const materials = useMemo(() => {
    const solar = createSolarTexture();
    solar.repeat.set(1, 3);
    return {
      truss: new MeshStandardMaterial({ color: "#a9adb3", roughness: 0.55, metalness: 0.35, flatShading: true }),
      module: new MeshStandardMaterial({ color: "#e9e7e1", roughness: 0.6, metalness: 0.15 }),
      moduleBand: new MeshStandardMaterial({ color: "#9aa1aa", roughness: 0.5, metalness: 0.3 }),
      solar: new MeshStandardMaterial({ map: solar, roughness: 0.35, metalness: 0.25, emissive: new Color("#0a1a3a"), emissiveIntensity: 0.6 }),
      radiator: new MeshStandardMaterial({ color: "#f4f4f2", roughness: 0.8, metalness: 0 }),
      dock: new MeshStandardMaterial({ color: "#7d838c", roughness: 0.45, metalness: 0.4 }),
      dockGlow: new MeshStandardMaterial({ color: "#5fe6ff", emissive: new Color("#5fe6ff"), emissiveIntensity: 2.2, toneMapped: false }),
      red: new MeshStandardMaterial({ color: "#ff3b4a", emissive: new Color("#ff3b4a"), emissiveIntensity: 4, toneMapped: false }),
      green: new MeshStandardMaterial({ color: "#3bff8a", emissive: new Color("#3bff8a"), emissiveIntensity: 4, toneMapped: false }),
    };
  }, []);
  useEffect(
    () => () => {
      materials.solar.map?.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );
  return materials;
}

/** Procedural orbital station (GLB slot: see ASSETS.md); collision spheres live in systems/station.ts. */
export function Station() {
  const layout = stationLayout();
  const materials = useStationMaterials();
  const lights = useRef<(Mesh | null)[]>([]);
  const root = useShadows<Group>();
  const { truss, solarWings, modules, dock } = STATION;
  const halfTruss = truss.length / 2;

  useFrame(() => {
    // Slow navigation-light blink; the dock ring pulses to invite you in.
    const on = Math.sin(runtime.clock * 3) > 0.2;
    for (const light of lights.current) if (light) light.visible = on;
    materials.dockGlow.emissiveIntensity = 1.6 + Math.sin(runtime.clock * 2.4) * 0.8;
  });

  return (
    <group ref={root} position={layout.center} quaternion={layout.quaternion} scale={STATION.scale}>
      {/* Main truss with cross braces. */}
      <mesh material={materials.truss}>
        <boxGeometry args={[truss.length, truss.thickness, truss.thickness]} />
      </mesh>
      {Array.from({ length: 13 }, (_, index) => -halfTruss + 4 + index * 6.33).map((x) => (
        <mesh key={x} material={materials.truss} position={[x, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <boxGeometry args={[0.5, truss.thickness * 1.5, 0.5]} />
        </mesh>
      ))}

      {/* Solar wings: a panel above and below the truss at each station. */}
      {solarWings.x.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={materials.truss}>
            <cylinderGeometry args={[0.35, 0.35, solarWings.length * 2 + 4, 6]} />
          </mesh>
          {[1, -1].map((side) => (
            <mesh key={side} material={materials.solar} position={[0, side * (solarWings.length / 2 + 2), 0]}>
              <boxGeometry args={[solarWings.width, solarWings.length, 0.3]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Radiators sticking back from the truss. */}
      {[-14, 14].map((x) => (
        <mesh key={x} material={materials.radiator} position={[x, 0, -9]}>
          <boxGeometry args={[6, 0.25, 14]} />
        </mesh>
      ))}

      {/* Pressurised modules along Z, with nodes and bands. */}
      <mesh material={materials.module} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[modules.radius, modules.radius, modules.length, 20]} />
      </mesh>
      {[-modules.length / 2, -6, 6, modules.length / 2].map((z) => (
        <mesh key={z} material={materials.moduleBand} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[modules.radius + 0.25, modules.radius + 0.25, 1, 20]} />
        </mesh>
      ))}
      <mesh material={materials.module} position={[0, 0, 0]}>
        <sphereGeometry args={[modules.radius * 1.35, 20, 12]} />
      </mesh>
      <mesh material={materials.module} position={[0, modules.radius + 2, 8]}>
        <cylinderGeometry args={[2.2, 2.2, 6, 16]} />
      </mesh>

      {/* Docking port: a short tunnel and the glowing gate you fly through. */}
      <mesh material={materials.dock} position={[0, 0, modules.length / 2 + 3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2.4, 6, 16]} />
      </mesh>
      <mesh material={materials.dockGlow} position={[0, 0, dock.z]}>
        <torusGeometry args={[dock.radius, 0.45, 8, 48]} />
      </mesh>

      {/* Navigation lights at the truss tips. */}
      {[
        { x: -halfTruss, material: materials.red },
        { x: halfTruss, material: materials.green },
      ].map(({ x, material }, index) => (
        <mesh
          key={x}
          ref={(mesh) => {
            lights.current[index] = mesh;
          }}
          material={material}
          position={[x, 0, 0]}
        >
          <sphereGeometry args={[0.8, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}
