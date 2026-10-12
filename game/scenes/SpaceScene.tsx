"use client";

import { useCallback, useMemo } from "react";
import type { Group } from "three";
import { Asteroids } from "@/game/entities/Asteroids";
import { Earth } from "@/game/entities/Earth";
import { EnergyStars } from "@/game/entities/EnergyStars";
import { Moon } from "@/game/entities/Moon";
import { Rings } from "@/game/entities/Rings";
import { Ship } from "@/game/entities/ship/Ship";
import { PlanetBody } from "@/game/entities/planet/PlanetBody";
import { SunBody } from "@/game/entities/planet/SunBody";
import { Sun, SunLight } from "@/game/entities/Sun";
import { BODIES, type LocationId } from "@/game/data/planets";
import { LOCATION_BODIES } from "@/game/data/solarSystem";
import { buildEnvironment } from "@/game/systems/environment";
import { useGameStore } from "@/game/stores/gameStore";
import { GameLoop } from "@/game/systems/GameLoop";
import { getMissionLayout } from "@/game/systems/missionLayout";
import { DEBUG_HANDLE_ENABLED } from "@/game/systems/debug";
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
import { WarpTunnel } from "./WarpTunnel";
import { EarthInSky, MarsSky, SurfaceFog, SurfaceLight, SurfaceScene } from "./surface/SurfaceScene";
import { SURFACES } from "@/game/data/surfaces";
import { useQualitySettings } from "./useQualitySettings";

/** Everything positioned in universe coordinates; shifted by the floating origin. */
function WorldRoot({ children }: { children: React.ReactNode }) {
  const register = useCallback((group: Group | null) => {
    runtime.refs.worldRoot = group;
  }, []);
  return <group ref={register}>{children}</group>;
}

/** The planet(s) of the current location; Earth adds the Phase 1 mission props. */
function LocationContent({ location, showRings }: { location: LocationId; showRings: boolean }) {
  const missionId = useGameStore((state) => state.missionId);
  const layout = useMemo(() => getMissionLayout(missionId), [missionId]);
  const pickups = useMemo(() => buildEnvironment(location).pickups, [location]);
  if (location === "sun") {
    return (
      <>
        <SunBody />
        <EnergyStars pickups={pickups} />
      </>
    );
  }
  if (location === "earth") {
    return (
      <>
        <Earth />
        <Moon />
        <Asteroids asteroids={layout.asteroids} />
        <EnergyStars pickups={layout.energyStars} />
        {showRings && <Rings rings={layout.course.rings} />}
      </>
    );
  }
  return (
    <>
      {LOCATION_BODIES[location].map((id) => (
        <PlanetBody key={id} body={BODIES[id]} />
      ))}
      <EnergyStars pickups={pickups} />
    </>
  );
}

export function SpaceScene() {
  const phase = useGameStore((state) => state.phase);
  const mode = useGameStore((state) => state.mode);
  const location = useGameStore((state) => state.location);
  const surface = useGameStore((state) => state.surface);
  const { speedLines } = useQualitySettings();
  const sky = surface ? SURFACES[surface].sky : null;
  const spaceSky = sky?.type !== "atmosphere";
  const inRun = phase === "playing" || phase === "paused" || phase === "result";
  const showRings = phase === "menu" || (mode === "mission" && inRun);
  const loaded = phase !== "boot" && phase !== "loading";

  return (
    <>
      <Preloader />
      {spaceSky && <SkyBackground />}
      {surface ? <SurfaceLight surface={surface} /> : <SunLight />}
      {surface && <SurfaceFog surface={surface} />}
      {spaceSky && <Sun />}
      {spaceSky && <StarLayers />}
      {spaceSky && <NebulaGas />}
      {sky?.type === "atmosphere" && <MarsSky zenith={sky.zenith} horizon={sky.horizon} sunHalo={sky.sunHalo} />}
      {sky?.type === "space" && <EarthInSky direction={sky.earthDirection} />}
      <WorldRoot>
        {/* Kept mounted (hidden) while landed so its baked textures survive the round trip. */}
        <group visible={!surface}>
          <LocationContent key={location} location={location} showRings={showRings} />
        </group>
        {surface && <SurfaceScene key={surface} surface={surface} />}
      </WorldRoot>
      <Ship />
      <SpaceDust />
      {speedLines && <SpeedLines />}
      <WarpTunnel />
      <GameLoop />
      {loaded && <QualityManager />}
      <Effects />
      {DEBUG_HANDLE_ENABLED && <DebugBridge />}
    </>
  );
}
