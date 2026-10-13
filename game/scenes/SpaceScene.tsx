"use client";

import { useCallback, useMemo } from "react";
import type { Group } from "three";
import { Asteroids } from "@/game/entities/Asteroids";
import { Earth } from "@/game/entities/Earth";
import { EnergyStars } from "@/game/entities/EnergyStars";
import { Moon } from "@/game/entities/Moon";
import { CargoPods, Crystals, DockPortal } from "@/game/entities/MissionProps";
import { Rings } from "@/game/entities/Rings";
import { Station } from "@/game/entities/Station";
import { Ship } from "@/game/entities/ship/Ship";
import { PlanetBody } from "@/game/entities/planet/PlanetBody";
import { SunBody } from "@/game/entities/planet/SunBody";
import { Sun, SunLight } from "@/game/entities/Sun";
import { BODIES, type LocationId } from "@/game/data/planets";
import { LOCATION_BODIES } from "@/game/data/solarSystem";
import { buildEnvironment } from "@/game/systems/environment";
import { useGameStore } from "@/game/stores/gameStore";
import { GameLoop } from "@/game/systems/GameLoop";
import { getMissionLayout, type MissionLayout } from "@/game/systems/missionLayout";
import { DEBUG_HANDLE_ENABLED } from "@/game/systems/debug";
import { runtime } from "@/game/systems/runtime";
import { DebugBridge } from "./DebugBridge";
import { Effects } from "./Effects";
import { NebulaGas } from "./NebulaGas";
import { PhotoCapture } from "./PhotoCapture";
import { Preloader } from "./Preloader";
import { QualityManager } from "./QualityManager";
import { SkyBackground } from "./SkyBackground";
import { SpaceDust } from "./SpaceDust";
import { SpeedLines } from "./SpeedLines";
import { StarLayers } from "./StarLayers";
import { WarpTunnel } from "./WarpTunnel";
import { EarthInSky, MarsSky, SurfaceFog, SurfaceLight, SurfaceScene, TerrainPrebuilder } from "./surface/SurfaceScene";
import { SURFACES } from "@/game/data/surfaces";
import { useQualitySettings } from "./useQualitySettings";

/** Everything positioned in universe coordinates; shifted by the floating origin. */
function WorldRoot({ children }: { children: React.ReactNode }) {
  const register = useCallback((group: Group | null) => {
    runtime.refs.worldRoot = group;
  }, []);
  return <group ref={register}>{children}</group>;
}

/** The planet(s) of the current location and the rocks that belong to it. */
function LocationContent({ location }: { location: LocationId }) {
  const environment = useMemo(() => buildEnvironment(location), [location]);
  return (
    <>
      {location === "sun" ? (
        <SunBody />
      ) : location === "earth" ? (
        <>
          <Earth />
          <Moon />
          <Station />
        </>
      ) : (
        LOCATION_BODIES[location].map((id) => <PlanetBody key={id} body={BODIES[id]} />)
      )}
      {environment.asteroids.length > 0 && <Asteroids asteroids={environment.asteroids} />}
    </>
  );
}

/**
 * Mission props at the current location (the title screen shows the Orbit
 * Rings course) and the energy stars gameplay is using (see currentPickups).
 */
function MissionContent({ location, layout }: { location: LocationId; layout: MissionLayout | null }) {
  const pickups = useMemo(
    () => (layout && layout.mission.location === location ? layout.energyStars : buildEnvironment(location).pickups),
    [layout, location],
  );
  const here = layout && layout.mission.location === location ? layout : null;
  const type = here?.mission.objective.type;
  return (
    <>
      <EnergyStars pickups={pickups} />
      {here && type === "rings" && <Rings rings={here.gates} />}
      {here && type === "collect" && <Crystals crystals={here.collectibles} />}
      {here && type === "delivery" && (
        <>
          <CargoPods pods={here.collectibles} />
          <DockPortal gate={here.gates[0]} />
        </>
      )}
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
  const missionId = useGameStore((state) => state.missionId);
  const inRun = phase === "playing" || phase === "paused" || phase === "result";
  const flying = mode === "mission" && inRun ? getMissionLayout(missionId) : null;
  // The title screen shows off the first course; menus and free flight have no mission.
  const layout = phase === "menu" ? getMissionLayout("orbit-rings") : flying;
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
          <LocationContent key={location} location={location} />
          {/* Gameplay starts its run in the same frame; the props must match runtime.layout. */}
          <MissionContent key={`${location}:${layout?.mission.id ?? "none"}`} location={location} layout={layout} />
        </group>
        {surface && <SurfaceScene key={surface} surface={surface} />}
      </WorldRoot>
      <Ship />
      <SpaceDust />
      {speedLines && <SpeedLines />}
      <WarpTunnel />
      <TerrainPrebuilder />
      <GameLoop />
      {loaded && <QualityManager />}
      <Effects />
      {phase === "photo" && <PhotoCapture />}
      {DEBUG_HANDLE_ENABLED && <DebugBridge />}
    </>
  );
}
