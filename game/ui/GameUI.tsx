"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGameStore } from "@/game/stores/gameStore";
import { useUiStore } from "@/game/stores/uiStore";
import { Encyclopedia } from "./encyclopedia/Encyclopedia";
import { HangarScreen } from "./hangar/HangarScreen";
import { MissionSelect } from "./missions/MissionSelect";
import { Gallery } from "./gallery/Gallery";
import { PhotoModeOverlay } from "./photo/PhotoModeOverlay";
import { SolarSystemMap } from "./map/SolarSystemMap";
import { Hud } from "./hud/Hud";
import { LoadingScreen } from "./LoadingScreen";
import { OrientationGuard } from "./OrientationGuard";
import { PauseMenu } from "./PauseMenu";
import { ResultScreen } from "./ResultScreen";
import { TitleMenu } from "./TitleMenu";

/** DOM layer above the canvas, switched by the game phase. */
export function GameUI() {
  const phase = useGameStore((state) => state.phase);
  const runId = useGameStore((state) => state.runId);
  const encyclopediaOpen = useUiStore((state) => state.encyclopedia.open);
  const missionsOpen = useUiStore((state) => state.missions.open);
  const galleryOpen = useUiStore((state) => state.gallery);
  const loading = phase === "boot" || phase === "loading";

  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      <AnimatePresence>
        {loading && (
          <motion.div key="loading" className="absolute inset-0 z-40" exit={{ opacity: 0, transition: { duration: 0.6 } }}>
            <LoadingScreen />
          </motion.div>
        )}
        {phase === "menu" && <TitleMenu key="menu" />}
        {phase === "hangar" && <HangarScreen key="hangar" />}
        {(phase === "playing" || phase === "paused" || phase === "map") && <Hud key={`hud-${runId}`} />}
        {phase === "paused" && <PauseMenu key="pause" />}
        {phase === "map" && <SolarSystemMap key="map" />}
        {phase === "photo" && <PhotoModeOverlay key="photo" />}
        {phase === "result" && <ResultScreen key={`result-${runId}`} />}
        {encyclopediaOpen && <Encyclopedia key="encyclopedia" />}
        {missionsOpen && <MissionSelect key="missions" />}
        {galleryOpen && <Gallery key="gallery" />}
      </AnimatePresence>
      <OrientationGuard />
    </div>
  );
}
