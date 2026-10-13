"use client";

import { motion } from "motion/react";
import { useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { ControlsReference } from "./ControlsReference";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { useUiStore } from "@/game/stores/uiStore";
import { BookIcon, GalleryIcon, HangarIcon, HomeIcon, PlayIcon, RestartIcon, SettingsIcon, SoundOffIcon, SoundOnIcon, TrophyIcon } from "./icons";
import { GameButton, Panel } from "./primitives";

export function PauseMenu() {
  const t = useT();
  const mode = useGameStore((state) => state.mode);
  const device = useGameStore((state) => state.device);
  const resume = useGameStore((state) => state.resume);
  const restart = useGameStore((state) => state.restart);
  const toMenu = useGameStore((state) => state.toMenu);
  const endTestFlight = useGameStore((state) => state.endTestFlight);
  const muted = useSettingsStore((state) => state.muted);
  const toggleMuted = useSettingsStore((state) => state.toggleMuted);
  const openEncyclopedia = useUiStore((state) => state.openEncyclopedia);
  const openGallery = useUiStore((state) => state.openGallery);
  const openBadges = useUiStore((state) => state.openBadges);
  const openSettings = useUiStore((state) => state.openSettings);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row"
      >
        <Panel className="flex flex-1 flex-col gap-3 p-6 short:gap-2 short:p-4">
          <h2 id="pause-title" className="hud-text font-display text-3xl font-black tracking-[0.2em] short:text-2xl">
            {t("pause.title")}
          </h2>
          <GameButton icon={<PlayIcon />} onClick={resume} autoFocus>
            {t("pause.resume")}
          </GameButton>
          {mode === "mission" && (
            <GameButton variant="secondary" icon={<RestartIcon />} onClick={restart}>
              {t("pause.restart")}
            </GameButton>
          )}
          <GameButton variant="secondary" icon={<BookIcon />} onClick={() => openEncyclopedia()}>
            {t("pause.encyclopedia")}
          </GameButton>
          <GameButton variant="secondary" icon={<GalleryIcon />} onClick={openGallery}>
            {t("pause.gallery")}
          </GameButton>
          <GameButton variant="secondary" icon={<TrophyIcon />} onClick={openBadges}>
            {t("pause.badges")}
          </GameButton>
          {/* Sound is an icon toggle so long labels (e.g. "Pengaturan") get the rest of the row. */}
          <div className="flex gap-3 short:gap-2">
            <GameButton
              variant="secondary"
              onClick={toggleMuted}
              aria-label={`${t("pause.sound")}: ${muted ? t("pause.off") : t("pause.on")}`}
              aria-pressed={!muted}
              title={`${t("pause.sound")}: ${muted ? t("pause.off") : t("pause.on")}`}
              className="!px-4 text-xl"
            >
              {muted ? <SoundOffIcon /> : <SoundOnIcon />}
            </GameButton>
            <GameButton variant="secondary" icon={<SettingsIcon />} onClick={() => openSettings()} className="min-w-0 flex-1">
              {t("pause.settings")}
            </GameButton>
          </div>
          {mode === "testflight" ? (
            <GameButton variant="ghost" icon={<HangarIcon />} onClick={endTestFlight}>
              {t("pause.hangar")}
            </GameButton>
          ) : (
            <GameButton variant="ghost" icon={<HomeIcon />} onClick={toMenu}>
              {t("pause.menu")}
            </GameButton>
          )}
        </Panel>
        <Panel className="flex-1 p-6 short:p-4">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-hud">
            {t("controls.title")}
          </h3>
          <ControlsReference device={device} />
        </Panel>
      </motion.div>
    </motion.div>
  );
}
