"use client";

import { useMemo } from "react";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { createTranslator, type Translator } from "./index";

export function useT(): Translator {
  const locale = useSettingsStore((state) => state.locale);
  return useMemo(() => createTranslator(locale), [locale]);
}

export function useLocale() {
  return useSettingsStore((state) => state.locale);
}
