"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import type { PerspectiveCamera } from "three";
import { useGameStore } from "@/game/stores/gameStore";
import { getMissionLayout } from "./missionLayout";
import { notifyHud } from "./runtime";
import { beginRun, placeShipForMenu, stepSimulation } from "./simulation";

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
        if (state.runId !== previous.runId) beginRun(state.mode, layout, previous.phase === "menu");
        else if (state.phase === "menu" && previous.phase !== "menu") placeShipForMenu(layout);
      }),
    [layout],
  );

  useFrame((_, delta) => {
    stepSimulation(layout, camera, delta);
    notifyHud();
  }, SIMULATION_PRIORITY);

  return null;
}
