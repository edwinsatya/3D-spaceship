"use client";

import { useEffect } from "react";
import { LOCALE_TAGS } from "@/game/i18n/types";
import { useSettingsStore } from "@/game/stores/settingsStore";

/** Applies device settings that live outside React components (document language…). */
export function useSettingsEffects() {
  const locale = useSettingsStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale].bcp47;
  }, [locale]);
}
