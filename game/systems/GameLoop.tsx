"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import type { PerspectiveCamera } from "three";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { beginIntroBlend } from "./cameraRig";
import { getMissionLayout } from "./missionLayout";
import { notifyHud, runtime } from "./runtime";
import { applySelectedShip, beginRun, enterLocation, placeShipForMenu, stepSimulation } from "./simulation";

/** Runs before everything else each frame (priority -1); the composer renders last. */
const SIMULATION_PRIORITY = -1;

/**
 * The single per-frame driver: input → flight → collisions → mission →
 * camera → transforms → HUD. No React state is touched per frame.
 */
export function GameLoop() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const missionId = useGameStore((state) => state.missionId);
  const layout = useMemo(() => getMissionLayout(missionId), [missionId]);

  useLayoutEffect(() => {
    placeShipForMenu(layout);
  }, [layout]);

  useEffect(
    () =>
      useGameStore.subscribe((state, previous) => {
        if (state.runId !== previous.runId) {
          beginRun(state.mode, layout, previous.phase === "menu" || previous.phase === "hangar");
          return;
        }
        // Mid-run location change (warp arrival or a debug jump).
        if (state.location !== previous.location && (state.phase === "playing" || state.phase === "paused")) {
          enterLocation(state.location, layout);
        }
        if (state.phase === previous.phase) return;
        const showroom = (phase: string) => phase === "menu" || phase === "hangar";
        // Menu ⇄ hangar: glide between the two framings; from a run: reset to the spawn.
        if (showroom(state.phase) && showroom(previous.phase)) beginIntroBlend(runtime.camera);
        else if (showroom(state.phase)) placeShipForMenu(layout);
      }),
    [layout],
  );

  useEffect(
    () =>
      useProgressStore.subscribe((state, previous) => {
        if (state.ships.selected !== previous.ships.selected) applySelectedShip();
      }),
    [],
  );

  useFrame((_, delta) => {
    stepSimulation(layout, camera, delta);
    notifyHud();
  }, SIMULATION_PRIORITY);

  return null;
}
