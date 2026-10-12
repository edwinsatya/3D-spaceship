"use client";

import { motion } from "motion/react";
import { unlockAudioFromGesture } from "@/game/audio/useGameAudio";
import { ORBIT_RINGS } from "@/game/data/missions";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore, type GameMode } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { formatTime } from "@/game/systems/scoring";
import { OrbitIcon, RocketIcon } from "./icons";
import { MuteButton } from "./MuteButton";
import { GameButton, Panel, StarRow } from "./primitives";

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

export function startGame(mode: GameMode) {
  unlockAudioFromGesture();
  if (useGameStore.getState().device === "touch") void requestImmersive();
  useGameStore.getState().startRun(mode);
}

export function TitleMenu() {
  const t = useT();
  const locale = useLocale();
  const device = useGameStore((state) => state.device);
  const progress = useProgressStore((state) => state.missions[ORBIT_RINGS.id]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 lg:p-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <div className="flex items-start justify-between gap-4">
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <h1 className="hud-text font-display text-3xl font-black leading-tight tracking-[0.12em] sm:text-5xl lg:text-6xl">
            {t("app.title")}
          </h1>
          <p className="mt-2 text-base text-cyan-100/90 sm:text-lg">{t("app.tagline")}</p>
        </motion.div>
        <MuteButton />
      </div>

      <motion.div
        className="flex max-w-md flex-col gap-3"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Panel className="pointer-events-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-hud">
                {t("menu.missionLabel")}
              </p>
              <h2 className="font-display text-xl font-bold">{localize(ORBIT_RINGS.name, locale)}</h2>
            </div>
            <StarRow count={progress?.bestStars ?? 0} label={t("a11y.stars", { count: progress?.bestStars ?? 0 })} />
          </div>
          <p className="mt-1 text-sm text-white/80">{localize(ORBIT_RINGS.description, locale)}</p>
          <p className="mt-2 font-display text-xs tracking-widest text-cyan-100/70">
            {t("menu.bestTime")}: {progress?.bestTimeMs != null ? formatTime(progress.bestTimeMs) : t("menu.noBestTime")}
          </p>
        </Panel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <GameButton icon={<RocketIcon />} onClick={() => startGame("mission")} className="flex-1" autoFocus>
            {t("menu.startMission")}
          </GameButton>
          <GameButton variant="secondary" icon={<OrbitIcon />} onClick={() => startGame("freeflight")} className="flex-1">
            {t("menu.freeFlight")}
          </GameButton>
        </div>
        <p className="text-xs text-white/60">
          {device === "touch" ? t("menu.controlsTouch") : t("menu.controlsDesktop")}
        </p>
      </motion.div>
    </motion.div>
  );
}
