"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { PALETTES } from "@/game/config/palette";
import { LOCALES, type Locale } from "@/game/i18n/types";
import { useT } from "@/game/i18n/useT";
import { useQualityStore } from "@/game/stores/qualityStore";
import { useSettingsStore, type QualityPreference, type VolumeChannel } from "@/game/stores/settingsStore";
import { useUiStore } from "@/game/stores/uiStore";
import { GameButton, Panel } from "../primitives";
import { ControlsSection, keyCapture } from "./ControlsSection";
import { Segmented, SettingRow, Slider, Toggle } from "./fields";

export type SettingsTab = "audio" | "display" | "controls" | "accessibility" | "language";
const TABS: readonly SettingsTab[] = ["audio", "display", "controls", "accessibility", "language"];

/** Language names are shown in their own language so anyone can find theirs. */
const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", id: "Bahasa Indonesia" };

function LanguageSection() {
  const t = useT();
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const analytics = useSettingsStore((state) => state.privacy.analytics);
  const setAnalytics = useSettingsStore((state) => state.setAnalytics);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/75">{t("settings.languageHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("settings.tabs.language")}>
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === locale}
            lang={option}
            onClick={() => setLocale(option)}
            className={`rounded-2xl border px-4 py-3 text-left font-display text-base font-bold transition-colors ${
              option === locale ? "border-hud/80 bg-cyan-400/15" : "border-white/10 hover:border-cyan-200/40"
            }`}
          >
            {LANGUAGE_NAMES[option]}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <SettingRow label={t("settings.analytics")} hint={t("settings.analyticsHint")}>
          <Toggle checked={analytics} onChange={setAnalytics} label={t("settings.analytics")} />
        </SettingRow>
      </div>
    </div>
  );
}

const VOLUME_CHANNELS: readonly VolumeChannel[] = ["master", "music", "effects", "engine"];

function AudioSection() {
  const t = useT();
  const muted = useSettingsStore((state) => state.muted);
  const volume = useSettingsStore((state) => state.volume);
  const setMuted = useSettingsStore((state) => state.setMuted);
  const setVolume = useSettingsStore((state) => state.setVolume);
  return (
    <div>
      <SettingRow label={t("settings.sound")}>
        <Toggle checked={!muted} onChange={(on) => setMuted(!on)} label={t("settings.sound")} />
      </SettingRow>
      {VOLUME_CHANNELS.map((channel) => (
        <SettingRow key={channel} label={t(`settings.volume.${channel}`)} hint={channel === "engine" ? t("settings.engineHint") : undefined}>
          <Slider value={volume[channel]} onChange={(value) => setVolume(channel, value)} label={t(`settings.volume.${channel}`)} />
        </SettingRow>
      ))}
    </div>
  );
}

const QUALITY_OPTIONS: readonly QualityPreference[] = ["auto", "low", "medium", "high"];

function DisplaySection() {
  const t = useT();
  const display = useSettingsStore((state) => state.display);
  const setDisplay = useSettingsStore((state) => state.setDisplay);
  const unlockAuto = useQualityStore((state) => state.unlock);
  return (
    <div>
      <SettingRow label={t("settings.qualityLabel")} hint={t(`settings.qualityHint.${display.quality}`)}>
        <Segmented
          label={t("settings.qualityLabel")}
          value={display.quality}
          options={QUALITY_OPTIONS.map((value) => ({ value, label: t(`settings.quality.${value}`) }))}
          onChange={(quality) => {
            if (quality === "auto") unlockAuto();
            setDisplay({ quality });
          }}
        />
      </SettingRow>
      <SettingRow label={t("settings.showFps")} hint={t("settings.showFpsHint")}>
        <Toggle checked={display.showFps} onChange={(showFps) => setDisplay({ showFps })} label={t("settings.showFps")} />
      </SettingRow>
    </div>
  );
}

function AccessibilitySection() {
  const t = useT();
  const accessibility = useSettingsStore((state) => state.accessibility);
  const setAccessibility = useSettingsStore((state) => state.setAccessibility);
  const palette = PALETTES[accessibility.colorVision];
  return (
    <div>
      <SettingRow label={t("settings.motion")} hint={t(`settings.motionHint.${accessibility.motion}`)}>
        <Segmented
          label={t("settings.motion")}
          value={accessibility.motion}
          options={(["system", "reduced", "full"] as const).map((value) => ({ value, label: t(`settings.motionOptions.${value}`) }))}
          onChange={(motion) => setAccessibility({ motion })}
        />
      </SettingRow>
      <SettingRow label={t("settings.colorVision")} hint={t("settings.colorVisionHint")}>
        <span className="flex gap-1" aria-hidden="true">
          {[palette.success, palette.danger, palette.target.ring].map((color) => (
            <span key={color} className="h-4 w-4 rounded-full border border-white/30" style={{ background: color }} />
          ))}
        </span>
        <Segmented
          label={t("settings.colorVision")}
          value={accessibility.colorVision}
          options={(["standard", "colorblind"] as const).map((value) => ({ value, label: t(`settings.colorVisionOptions.${value}`) }))}
          onChange={(colorVision) => setAccessibility({ colorVision })}
        />
      </SettingRow>
      <SettingRow label={t("settings.textSize")} hint={t("settings.textSizeHint")}>
        <Segmented
          label={t("settings.textSize")}
          value={accessibility.textSize}
          options={(["normal", "large", "xlarge"] as const).map((value) => ({ value, label: t(`settings.textSizeOptions.${value}`) }))}
          onChange={(textSize) => setAccessibility({ textSize })}
        />
      </SettingRow>
    </div>
  );
}

/** Sections are added by the features they configure. */
const SECTIONS: Partial<Record<SettingsTab, () => ReactNode>> = {
  audio: AudioSection,
  display: DisplaySection,
  controls: ControlsSection,
  accessibility: AccessibilitySection,
  language: LanguageSection,
};

/** Device settings: every change applies immediately and is remembered on this device. */
export function SettingsScreen() {
  const t = useT();
  const close = useUiStore((state) => state.closeSettings);
  const initialTab = useUiStore((state) => state.settingsTab);
  const tabs = TABS.filter((tab) => SECTIONS[tab]);
  const [tab, setTab] = useState<SettingsTab>(initialTab && SECTIONS[initialTab] ? initialTab : tabs[0]);
  const Section = SECTIONS[tab];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape" && !keyCapture.active) {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [close]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm short:p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <Panel className="flex h-full max-h-[40rem] w-full max-w-3xl flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="settings-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
              {t("settings.title")}
            </h2>
            <p className="text-xs text-cyan-100/70 short:hidden">{t("settings.subtitle")}</p>
          </div>
          <GameButton variant="secondary" onClick={close}>
            {t("settings.close")}
          </GameButton>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row short:flex-row">
          <div className="flex shrink-0 gap-1 overflow-x-auto sm:w-44 sm:flex-col short:w-36 short:flex-col" role="tablist">
            {tabs.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`shrink-0 rounded-xl px-3 py-2 text-left font-display text-xs font-bold uppercase tracking-widest transition-colors ${
                  tab === value ? "bg-cyan-400/20 text-white" : "text-white/60 hover:bg-white/5"
                }`}
              >
                {t(`settings.tabs.${value}`)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1" role="tabpanel">
            {Section && <Section />}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
