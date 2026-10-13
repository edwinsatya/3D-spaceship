"use client";

import { useEffect, useSyncExternalStore } from "react";
import { PALETTES } from "@/game/config/palette";
import { SETTINGS } from "@/game/config/settings";
import { LOCALE_TAGS } from "@/game/i18n/types";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { accessibility, resolveReducedMotion, setPalette } from "@/game/systems/accessibility";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The OS asks for less motion (follows changes live). */
function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** Reduce-motion in effect: the player's choice, or the OS when set to "system". */
export function useReducedMotion(): boolean {
  const preference = useSettingsStore((state) => state.accessibility.motion);
  return resolveReducedMotion(preference, useSystemReducedMotion());
}

/** Applies device settings that live outside React components (document language, colours, motion, text size). */
export function useSettingsEffects() {
  const locale = useSettingsStore((state) => state.locale);
  const colorVision = useSettingsStore((state) => state.accessibility.colorVision);
  const textSize = useSettingsStore((state) => state.accessibility.textSize);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale].bcp47;
  }, [locale]);

  useEffect(() => {
    accessibility.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    setPalette(colorVision);
    const palette = PALETTES[colorVision];
    const style = document.documentElement.style;
    style.setProperty("--color-success", palette.success);
    style.setProperty("--color-success-soft", palette.successSoft);
    style.setProperty("--color-danger", palette.danger);
  }, [colorVision]);

  useEffect(() => {
    // Tailwind sizes are in rem: scaling the root scales the whole interface.
    document.documentElement.style.fontSize = `${SETTINGS.textScale[textSize] * 100}%`;
  }, [textSize]);
}
