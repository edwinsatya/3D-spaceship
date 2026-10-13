"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect } from "react";
import type { PerspectiveCamera } from "three";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { beginIntroBlend } from "./cameraRig";
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

  useLayoutEffect(() => {
    placeShipForMenu();
  }, []);

  useEffect(
    () =>
      useGameStore.subscribe((state, previous) => {
        if (state.runId !== previous.runId) {
          beginRun(state.mode, previous.phase === "menu" || previous.phase === "hangar");
          return;
        }
        // Mid-run location change (warp arrival or a debug jump).
        if (state.location !== previous.location && (state.phase === "playing" || state.phase === "paused")) {
          enterLocation(state.location);
        }
        if (state.phase === previous.phase) return;
        // Back from a menu overlay: the cursor sits on its button, re-arm mouse steering.
        if (state.phase === "playing" && (previous.phase === "paused" || previous.phase === "map")) {
          runtime.input?.resetForRun();
        }
        const showroom = (phase: string) => phase === "menu" || phase === "hangar";
        // Menu ⇄ hangar: glide between the two framings; from a run: reset to the spawn.
        if (showroom(state.phase) && showroom(previous.phase)) beginIntroBlend(runtime.camera);
        else if (showroom(state.phase)) placeShipForMenu();
      }),
    [],
  );

  useEffect(
    () =>
      useProgressStore.subscribe((state, previous) => {
        if (state.ships.selected !== previous.ships.selected) applySelectedShip();
      }),
    [],
  );

  useFrame((_, delta) => {
    stepSimulation(camera, delta);
    notifyHud();
  }, SIMULATION_PRIORITY);

  return null;
}
