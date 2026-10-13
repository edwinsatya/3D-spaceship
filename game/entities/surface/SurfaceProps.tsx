"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  MeshStandardMaterial,
  ShaderMaterial,
  SRGBColorSpace,
} from "three";
import { ASSET_PATHS, SURFACE_PROP_ASSETS } from "@/game/config/assets";
import { VISUALS } from "@/game/config/visuals";
import type { PointOfInterestKind } from "@/game/data/surfaces";
import { useProgressStore } from "@/game/stores/progressStore";
import { accessibility } from "@/game/systems/accessibility";
import { runtime } from "@/game/systems/runtime";

/**
 * Procedural stand-ins for the real hardware at each landing site
 * (GLB slots: see ASSETS.md). Built in metres-ish units, scaled by propScale.
 */

function useStandardMaterial(color: string, metalness = 0.1, roughness = 0.7, emissive?: string) {
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color,
        metalness,
        roughness,
        flatShading: true,
        emissive: emissive ?? "#000000",
        emissiveIntensity: emissive ? 1.5 : 0,
      }),
    [color, metalness, roughness, emissive],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/** Stars and stripes drawn on a small canvas. */
function useFlagTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 80;
    const context = canvas.getContext("2d");
    if (context) {
      for (let stripe = 0; stripe < 13; stripe++) {
        context.fillStyle = stripe % 2 === 0 ? "#b22234" : "#ffffff";
        context.fillRect(0, (stripe * 80) / 13, 128, 80 / 13 + 0.5);
      }
      context.fillStyle = "#3c3b6e";
      context.fillRect(0, 0, 52, 43);
      context.fillStyle = "#ffffff";
      for (let row = 0; row < 5; row++) {
        for (let column = 0; column < 6; column++) {
          context.fillRect(4 + column * 8, 4 + row * 8, 2, 2);
        }
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const LEG_ANGLES = [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4];

/** Apollo 11 "Eagle" descent stage (the ascent stage flew back up) and the flag. */
function ApolloLander() {
  // Low metalness: there is no environment map to reflect, so metals would render dark.
  const foil = useStandardMaterial("#e2b448", 0.3, 0.45);
  const frame = useStandardMaterial("#a9a9a4", 0.25, 0.5);
  const dark = useStandardMaterial("#2c2c2c", 0.3, 0.6);
  const flag = useFlagTexture();
  const legTilt = Math.atan2(1.3, 1.1);
  return (
    <group>
      <mesh material={foil} position={[0, 1.9, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 1.6, 8]} />
      </mesh>
      <mesh material={dark} position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.35, 0.6, 0.6, 10]} />
      </mesh>
      {LEG_ANGLES.map((angle) => (
        <group key={angle} rotation={[0, -angle, 0]}>
          <mesh material={frame} position={[2.65, 0.65, 0]} rotation={[0, 0, legTilt]}>
            <cylinderGeometry args={[0.1, 0.1, 1.75, 6]} />
          </mesh>
          <mesh material={frame} position={[3.3, 0.06, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.12, 10]} />
          </mesh>
        </group>
      ))}
      <group position={[5.2, 0, 2.2]}>
        <mesh material={frame} position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 3.2, 6]} />
        </mesh>
        <mesh material={frame} position={[0.8, 3.15, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
        </mesh>
        <mesh position={[0.8, 2.65, 0]}>
          <planeGeometry args={[1.6, 1]} />
          <meshStandardMaterial map={flag} side={DoubleSide} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

const WHEEL_X = [-1.2, 0, 1.2];

/** Perseverance: white body, six wheels on rocker-bogies, mast camera, RTG at the back. */
function Rover() {
  const body = useStandardMaterial("#e9e6df", 0.2, 0.55);
  const metal = useStandardMaterial("#9d9d99", 0.25, 0.5);
  const dark = useStandardMaterial("#2a2a2a", 0.2, 0.8);
  return (
    <group>
      <mesh material={body} position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 0.8, 2.1]} />
      </mesh>
      {[-1.3, 1.3].map((z) => (
        <group key={z}>
          <mesh material={metal} position={[0, 0.95, z]}>
            <boxGeometry args={[2.7, 0.14, 0.14]} />
          </mesh>
          {WHEEL_X.map((x) => (
            <mesh key={x} material={dark} position={[x, 0.45, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.4, 12]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={metal} position={[1.05, 2.8, 0.6]}>
        <cylinderGeometry args={[0.09, 0.09, 1.8, 6]} />
      </mesh>
      <mesh material={body} position={[1.05, 3.8, 0.6]}>
        <boxGeometry args={[0.45, 0.35, 0.7]} />
      </mesh>
      <mesh material={metal} position={[-1.75, 1.85, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.32, 0.32, 1.1, 8]} />
      </mesh>
      <mesh material={metal} position={[-0.4, 2.0, -0.6]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 12]} />
      </mesh>
      <mesh material={metal} position={[1.9, 1.3, -0.5]} rotation={[0, 0, -0.9]}>
        <boxGeometry args={[1.3, 0.12, 0.12]} />
      </mesh>
    </group>
  );
}

/** Ingenuity: small body on four legs, two stacked rotors and a solar panel on top. */
function Helicopter() {
  const body = useStandardMaterial("#c9c4b8", 0.3, 0.6);
  const metal = useStandardMaterial("#8d8d8a", 0.25, 0.5);
  const blade = useStandardMaterial("#3a3a3a", 0.2, 0.5);
  const solar = useStandardMaterial("#1d2b4a", 0.5, 0.3);
  return (
    <group>
      <mesh material={body} position={[0, 1.2, 0]}>
        <boxGeometry args={[0.7, 0.55, 0.7]} />
      </mesh>
      {LEG_ANGLES.map((angle) => (
        <group key={angle} rotation={[0, -angle, 0]}>
          <mesh material={metal} position={[0.8, 0.5, 0]} rotation={[0, 0, Math.atan2(1, 0.9)]}>
            <cylinderGeometry args={[0.035, 0.035, 1.35, 5]} />
          </mesh>
        </group>
      ))}
      <mesh material={metal} position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1, 6]} />
      </mesh>
      <mesh material={blade} position={[0, 1.75, 0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[3.6, 0.04, 0.22]} />
      </mesh>
      <mesh material={blade} position={[0, 2.1, 0]} rotation={[0, -0.9, 0]}>
        <boxGeometry args={[3.6, 0.04, 0.22]} />
      </mesh>
      <mesh material={solar} position={[0, 2.5, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.6]} />
      </mesh>
    </group>
  );
}

/** A few boulders on a low ridge: the spot to look up at Earth. */
function Lookout() {
  const rock = useStandardMaterial("#5a5956", 0, 0.95);
  return (
    <group>
      {[
        [-3, 1.2, 1, 2.4],
        [2.5, 0.9, -1.5, 1.8],
        [0.5, 0.6, 3, 1.2],
      ].map(([x, y, z, size]) => (
        <mesh key={x} material={rock} position={[x, y, z]} scale={[size, size * 0.7, size]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  );
}

/** Layered sediment slabs where the old river dropped its mud and sand. */
function DeltaLayers({ color }: { color: string }) {
  const layer = useStandardMaterial(color, 0, 0.95);
  return (
    <group>
      {[
        [0, 0.8, 0, 22, 1.6],
        [4, 2.2, -2, 16, 1.2],
        [7, 3.3, -3, 10, 1],
        [-14, 0.6, 9, 12, 1.2],
      ].map(([x, y, z, radius, height]) => (
        <mesh key={x} material={layer} position={[x, y, z]}>
          <cylinderGeometry args={[radius * 0.9, radius, height, 9]} />
        </mesh>
      ))}
    </group>
  );
}

const BEACON_VERTEX = /* glsl */ `
varying float vHeight;
void main() {
  vHeight = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BEACON_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying float vHeight;
void main() {
  // clamp: pow() of a tiny negative base is NaN, and bloom spreads NaN over the whole screen.
  float fade = pow(clamp(1.0 - vHeight, 0.0, 1.0), 2.6) * smoothstep(0.0, 0.06, vHeight);
  float pulse = 0.75 + 0.25 * sin(uTime * 2.4 - vHeight * 8.0);
  gl_FragColor = vec4(uColor * fade * pulse * uOpacity * 0.55, 1.0);
}
`;


/** Light pillar marking a point of interest; dims once visited. */
function Beacon({ id }: { id: string }) {
  const visited = useProgressStore((state) => state.pointsOfInterest.includes(id));
  const { height, radius, visitedOpacity } = VISUALS.surface.beacon;
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: BEACON_VERTEX,
        fragmentShader: BEACON_FRAGMENT,
        // Shared colour object: follows the colour-blind palette without rebuilding the material.
        uniforms: { uColor: { value: accessibility.colors.success }, uOpacity: { value: 1 }, uTime: { value: 0 } },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.uOpacity.value = visited ? visitedOpacity : 1;
  }, [material, visited, visitedOpacity]);
  useFrame(() => {
    material.uniforms.uTime.value = runtime.clock;
  });
  return (
    <mesh material={material} position={[0, height / 2, 0]} renderOrder={3}>
      <cylinderGeometry args={[radius, radius * 1.6, height, 16, 1, true]} />
    </mesh>
  );
}

function GLTFProp({ url, scale }: { url: string; scale: number }) {
  const gltf = useGLTF(url, ASSET_PATHS.dracoDecoder, true);
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  return <primitive object={scene} scale={scale} />;
}

/** Uses the GLB from SURFACE_PROP_ASSETS when one is configured, else the procedural model. */
function WithModel({ slot, children }: { slot: keyof typeof SURFACE_PROP_ASSETS; children: ReactNode }) {
  const { url, scale } = SURFACE_PROP_ASSETS[slot];
  if (!url) return children;
  return (
    <Suspense fallback={children}>
      <GLTFProp url={url} scale={scale} />
    </Suspense>
  );
}

export function PointOfInterestProp({ id, kind, accent }: { id: string; kind: PointOfInterestKind; accent: string }) {
  const scale = VISUALS.surface.propScale;
  const beaconOffset: [number, number, number] = kind === "crater" || kind === "delta" ? [0, 0, 0] : [-7, 0, -5];
  return (
    <group>
      <group scale={scale}>
        {kind === "lander" && (
          <WithModel slot="lander">
            <ApolloLander />
          </WithModel>
        )}
        {kind === "rover" && (
          <WithModel slot="rover">
            <Rover />
          </WithModel>
        )}
        {kind === "helicopter" && (
          // The real one is only 49 cm tall: shown bigger so you can spot it.
          <group scale={2}>
            <WithModel slot="helicopter">
              <Helicopter />
            </WithModel>
          </group>
        )}
        {kind === "earthrise" && <Lookout />}
        {kind === "delta" && <DeltaLayers color={accent} />}
      </group>
      <group position={beaconOffset}>
        <Beacon id={id} />
      </group>
    </group>
  );
}
