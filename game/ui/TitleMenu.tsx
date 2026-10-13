"use client";

import { motion } from "motion/react";
import { unlockAudioFromGesture } from "@/game/audio/useGameAudio";
import { MISSION_ORDER, type MissionId } from "@/game/data/missions";
import { useT } from "@/game/i18n/useT";
import { useGameStore, type GameMode } from "@/game/stores/gameStore";
import { totalStars, useProgressStore } from "@/game/stores/progressStore";
import { useUiStore } from "@/game/stores/uiStore";
import { BookIcon, GalleryIcon, HangarIcon, OrbitIcon, RocketIcon, SettingsIcon, TrophyIcon } from "./icons";
import { MuteButton } from "./MuteButton";
import { AccountButton } from "./account/AccountButton";
import { GameButton, IconButton } from "./primitives";

/** Best effort: fullscreen + landscape lock on phones (needs the click gesture). */
async function requestImmersive() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.("landscape");
  } catch {
    // Unsupported (e.g. iOS Safari): the rotate-device overlay still guides the player.
  }
}

export function startGame(mode: GameMode, missionId?: MissionId) {
  unlockAudioFromGesture();
  if (useGameStore.getState().device === "touch") void requestImmersive();
  useGameStore.getState().startRun(mode, missionId);
}

export function TitleMenu() {
  const t = useT();
  const device = useGameStore((state) => state.device);
  const stars = useProgressStore((state) => totalStars(state.missions));
  const openMissions = useUiStore((state) => state.openMissions);
  const openHangar = useGameStore((state) => state.openHangar);
  const openEncyclopedia = useUiStore((state) => state.openEncyclopedia);
  const openGallery = useUiStore((state) => state.openGallery);
  const openBadges = useUiStore((state) => state.openBadges);
  const openSettings = useUiStore((state) => state.openSettings);
  const openCredits = useUiStore((state) => state.openCredits);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 lg:p-12 short:p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <div className="flex items-start justify-between gap-4">
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <h1 className="hud-text font-display text-3xl font-black leading-tight tracking-[0.12em] sm:text-5xl lg:text-6xl short:text-2xl">
            {t("app.title")}
          </h1>
          <p className="mt-2 text-base text-cyan-100/90 sm:text-lg short:mt-0.5 short:text-sm">{t("app.tagline")}</p>
        </motion.div>
        <div className="flex gap-2">
          <AccountButton />
          <IconButton label={t("settings.title")} onClick={() => openSettings()}>
            <SettingsIcon />
          </IconButton>
          <MuteButton />
        </div>
      </div>

      <motion.div
        className="flex max-w-md flex-col gap-3 short:gap-2"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="grid grid-cols-2 gap-3 short:gap-2">
          <GameButton
            icon={<RocketIcon />}
            onClick={() => openMissions()}
            className="col-span-2 short:col-span-1"
            autoFocus
          >
            {t("menu.missions")}
            <span className="ml-2 text-sm opacity-80">★ {stars}/{MISSION_ORDER.length * 3}</span>
          </GameButton>
          <GameButton variant="secondary" icon={<OrbitIcon />} onClick={() => startGame("freeflight")}>
            {t("menu.freeFlight")}
          </GameButton>
          <GameButton variant="secondary" icon={<HangarIcon />} onClick={openHangar}>
            {t("menu.hangar")}
          </GameButton>
          <GameButton variant="secondary" icon={<BookIcon />} onClick={() => openEncyclopedia()}>
            {t("menu.encyclopedia")}
          </GameButton>
          <GameButton variant="secondary" icon={<GalleryIcon />} onClick={openGallery}>
            {t("menu.gallery")}
          </GameButton>
          <GameButton variant="secondary" icon={<TrophyIcon />} onClick={openBadges} className="col-span-2 short:col-span-1">
            {t("menu.badges")}
          </GameButton>
        </div>
        <p className="text-xs text-white/60 short:hidden">
          {device === "touch" ? t("menu.controlsTouch") : t("menu.controlsDesktop")}
        </p>
      </motion.div>
      {/* CC BY 4.0 attribution, plus the full Credits screen. */}
      <p className="pointer-events-auto absolute right-4 bottom-3 text-[0.625rem] text-white/50 sm:right-8 sm:bottom-4 lg:right-12">
        <button type="button" onClick={openCredits} className="mr-2 font-bold text-white/70 underline-offset-2 hover:text-white hover:underline">
          {t("menu.credits")}
        </button>
        {t("menu.textureCredit")}{" "}
        <a
          href="https://www.solarsystemscope.com/textures/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-white/80 hover:underline"
        >
          Solar System Scope
        </a>{" "}
        (
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-white/80 hover:underline"
        >
          CC BY 4.0
        </a>
        )
      </p>
    </motion.div>
  );
}
