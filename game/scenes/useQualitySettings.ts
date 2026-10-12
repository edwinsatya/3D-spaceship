"use client";

import { QUALITY, type QualitySettings } from "@/game/config/quality";
import { useQualityStore } from "@/game/stores/qualityStore";

export function useQualitySettings(): QualitySettings {
  const tier = useQualityStore((state) => state.tier);
  return QUALITY[tier];
}
