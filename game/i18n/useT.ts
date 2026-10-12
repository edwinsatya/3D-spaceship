"use client";

import { useMemo } from "react";
import { useProgressStore } from "@/game/stores/progressStore";
import { createTranslator, type Translator } from "./index";

export function useT(): Translator {
  const locale = useProgressStore((state) => state.settings.locale);
  return useMemo(() => createTranslator(locale), [locale]);
}

export function useLocale() {
  return useProgressStore((state) => state.settings.locale);
}
