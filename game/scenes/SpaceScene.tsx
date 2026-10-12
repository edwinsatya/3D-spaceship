"use client";

import { useCallback, useMemo } from "react";
import type { Group } from "three";
import { Asteroids } from "@/game/entities/Asteroids";
import { Earth } from "@/game/entities/Earth";
import { EnergyStars } from "@/game/entities/EnergyStars";
import { Moon } from "@/game/entities/Moon";
import { Rings } from "@/game/entities/Rings";
import { Ship } from "@/game/entities/ship/Ship";
import { Sun, SunLight } from "@/game/entities/Sun";
import { useGameStore } from "@/game/stores/gameStore";
import { GameLoop } from "@/game/systems/GameLoop";
import { getMissionLayout } from "@/game/systems/missionLayout";
import { runtime } from "@/game/systems/runtime";
import { DebugBridge } from "./DebugBridge";
import { Effects } from "./Effects";
import { NebulaGas } from "./NebulaGas";
import { Preloader } from "./Preloader";
import { QualityManager } from "./QualityManager";
import { SkyBackground } from "./SkyBackground";
import { SpaceDust } from "./SpaceDust";
import { SpeedLines } from "./SpeedLines";
import { StarLayers } from "./StarLayers";
import { useQualitySettings } from "./useQualitySettings";

/** Everything positioned in universe coordinates; shifted by the floating origin. */
function WorldRoot({ children }: { children: React.ReactNode }) {
  const register = useCallback((group: Group | null) => {
    runtime.refs.worldRoot = group;
  }, []);
  return <group ref={register}>{children}</group>;
}

export function SpaceScene() {
  const phase = useGameStore((state) => state.phase);
  const mode = useGameStore((state) => state.mode);
  const missionId = useGameStore((state) => state.missionId);
  const layout = useMemo(() => getMissionLayout(missionId), [missionId]);
  const { speedLines } = useQualitySettings();
  const inRun = phase === "playing" || phase === "paused" || phase === "result";
  const showRings = phase === "menu" || (mode === "mission" && inRun);
  const loaded = phase !== "boot" && phase !== "loading";

  return (
    <>
      <Preloader />
      <SkyBackground />
      <SunLight />
      <Sun />
      <StarLayers />
      <NebulaGas />
      <WorldRoot>
        <Earth />
        <Moon />
        <Asteroids asteroids={layout.asteroids} />
        <EnergyStars pickups={layout.energyStars} />
        {showRings && <Rings rings={layout.course.rings} />}
      </WorldRoot>
      <Ship />
      <SpaceDust />
      {speedLines && <SpeedLines />}
      <GameLoop />
      {loaded && <QualityManager />}
      <Effects />
      {process.env.NODE_ENV !== "production" && <DebugBridge />}
    </>
  );
}
