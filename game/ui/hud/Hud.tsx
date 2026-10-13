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
import { DiscoveryBanner } from "./DiscoveryBanner";
import { PlanetInfoCard } from "./PlanetInfoCard";
import { LandingBanner, LandingOverlay, LandingRefusedCard, PointOfInterestCard } from "./LandingUI";
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
  const onSurface = useGameStore((state) => state.surface !== null);
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
            {mode === "freeflight" && !onSurface && (
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
          <PointOfInterestCard />
        </div>
      </div>
      {/* One column, so simultaneous banners stack instead of overlapping. */}
      <div className="pointer-events-none absolute inset-x-0 top-[20%] flex flex-col items-center gap-2 px-4 short:top-[15%]">
        <DiscoveryBanner />
        <LandingBanner />
        <LandingRefusedCard />
        {touch && (
          <div className="short:hidden">
            <HintBanner placement="stack" />
          </div>
        )}
      </div>
      {touch ? (
        // Landscape phones have no room under the banners: sit just above the context buttons.
        <div className="hidden short:block">
          <HintBanner placement="abovePrompts" />
        </div>
      ) : (
        <HintBanner placement="bottom" />
      )}
      <LandingOverlay />
    </motion.div>
  );
}
