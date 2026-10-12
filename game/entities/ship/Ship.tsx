"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef } from "react";
import type { Group } from "three";
import { ASSET_PATHS, SHIP_ASSETS } from "@/game/config/assets";
import { useGameStore } from "@/game/stores/gameStore";
import { useSelectedShip } from "@/game/stores/useShip";
import { useQualitySettings } from "@/game/scenes/useQualitySettings";
import { runtime } from "@/game/systems/runtime";
import { EngineTrails } from "./EngineTrails";
import { CockpitFrame, ShipModel } from "./ShipModel";

function GLTFShip({ url }: { url: string }) {
  const gltf = useGLTF(url, ASSET_PATHS.dracoDecoder, true);
  return <primitive object={gltf.scene} scale={SHIP_ASSETS.modelScale} />;
}

/**
 * The player ship. GameLoop writes the root transform (render space);
 * this component only adds the visual-only bank/pitch.
 */
export function Ship() {
  const visual = useRef<Group>(null);
  const cockpit = useGameStore((state) => state.cameraMode === "cockpit" && state.phase === "playing");
  const { ship, paint } = useSelectedShip();
  const { trails } = useQualitySettings();
  const registerRoot = useCallback((group: Group | null) => {
    runtime.refs.ship = group;
  }, []);

  useFrame(() => {
    if (!visual.current) return;
    visual.current.rotation.set(runtime.ship.visualPitch, 0, runtime.ship.bank);
  });

  const model = <ShipModel design={ship.design} paint={paint} cockpit={cockpit} />;
  return (
    <>
      <group ref={registerRoot}>
        <group ref={visual}>
          {SHIP_ASSETS.modelUrl ? (
            <Suspense fallback={model}>
              <GLTFShip url={SHIP_ASSETS.modelUrl} />
            </Suspense>
          ) : (
            model
          )}
        </group>
        {cockpit && <CockpitFrame />}
      </group>
      {trails && <EngineTrails nozzles={ship.design.engines.nozzles} color={paint.trail} />}
    </>
  );
}
