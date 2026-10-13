"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useReducedMotion } from "./useSettingsEffects";
import { useGameStore } from "@/game/stores/gameStore";
import { useUiStore } from "@/game/stores/uiStore";
import { Encyclopedia } from "./encyclopedia/Encyclopedia";
import { HangarScreen } from "./hangar/HangarScreen";
import { MissionSelect } from "./missions/MissionSelect";
import { Gallery } from "./gallery/Gallery";
import { BadgesScreen } from "./badges/BadgesScreen";
import { AccountPanel } from "./account/AccountPanel";
import { SettingsScreen } from "./settings/SettingsScreen";
import { CreditsScreen } from "./credits/CreditsScreen";
import { FpsCounter } from "./hud/FpsCounter";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { useAccountStore } from "@/game/stores/accountStore";
import { BadgeToasts } from "./badges/BadgeToasts";
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
  const badgesOpen = useUiStore((state) => state.badges);
  const accountOpen = useAccountStore((state) => state.panelOpen);
  const settingsOpen = useUiStore((state) => state.settings);
  const creditsOpen = useUiStore((state) => state.credits);
  const showFps = useSettingsStore((state) => state.display.showFps);
  const reducedMotion = useReducedMotion();
  const loading = phase === "boot" || phase === "loading";

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
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
          {badgesOpen && <BadgesScreen key="badges" />}
          {accountOpen && <AccountPanel key="account" />}
          {settingsOpen && <SettingsScreen key="settings" />}
          {creditsOpen && <CreditsScreen key="credits" />}
        </AnimatePresence>
        <BadgeToasts />
        {showFps && <FpsCounter />}
        <OrientationGuard />
      </div>
    </MotionConfig>
  );
}
