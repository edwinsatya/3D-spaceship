"use client";

import { motion } from "motion/react";
import { useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { CameraIcon, MapIcon, PauseIcon } from "../icons";
import { MuteButton } from "../MuteButton";
import { IconButton } from "../primitives";
import { BoostGauge, SpeedGauge } from "./Gauges";
import { BoostGlow, CollisionFlash, Countdown, HintBanner, Toasts, WarpLabel } from "./Overlays";
import { Reticle } from "./Reticle";
import { TargetMarker } from "./TargetMarker";
import { TopBar } from "./TopBar";
import { ContextPrompts } from "./ContextPrompts";
import { PlanetInfoCard } from "./PlanetInfoCard";
import { TouchControls } from "./TouchControls";

const SAFE_AREA = "pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]";

export function Hud() {
  const t = useT();
  const device = useGameStore((state) => state.device);
  const mode = useGameStore((state) => state.mode);
  const playing = useGameStore((state) => state.phase === "playing");
  const pause = useGameStore((state) => state.pause);
  const toggleCamera = useGameStore((state) => state.toggleCamera);
  const openMap = useGameStore((state) => state.openMap);
  const touch = device === "touch";

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <BoostGlow />
      <CollisionFlash />
      <TargetMarker />
      <Reticle showCursor={!touch && playing} />
      <Toasts />
      {mode === "mission" && <Countdown />}
      <WarpLabel />

      <div className={`absolute inset-0 ${SAFE_AREA}`}>
        <div className="relative h-full w-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <TopBar />
          </div>
          <div className="absolute top-0 right-0 flex gap-2">
            {mode === "freeflight" && (
              <IconButton label={t("a11y.map")} onClick={openMap}>
                <MapIcon />
              </IconButton>
            )}
            {touch && (
              <IconButton label={t("a11y.camera")} onClick={toggleCamera}>
                <CameraIcon />
              </IconButton>
            )}
            <MuteButton />
            <IconButton label={t("a11y.pause")} onClick={pause}>
              <PauseIcon />
            </IconButton>
          </div>
          {touch ? (
            <div className="absolute top-0 left-0">
              <SpeedGauge compact />
            </div>
          ) : (
            <>
              <div className="absolute bottom-0 left-0">
                <SpeedGauge />
              </div>
              <div className="absolute right-0 bottom-0">
                <BoostGauge />
              </div>
            </>
          )}
        </div>
      </div>

      {touch && <TouchControls />}
      <ContextPrompts />
      <div className={`pointer-events-none absolute inset-0 ${SAFE_AREA}`}>
        <div className="relative h-full w-full">
          <PlanetInfoCard />
        </div>
      </div>
      <HintBanner placement={touch ? "top" : "bottom"} />
    </motion.div>
  );
}
