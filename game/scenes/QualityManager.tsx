"use client";

import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { PERFORMANCE, QUALITY } from "@/game/config/quality";
import { useGameStore } from "@/game/stores/gameStore";
import { useQualityStore } from "@/game/stores/qualityStore";
import { useSettingsStore } from "@/game/stores/settingsStore";

/**
 * Display quality. "Auto": PerformanceMonitor steps the tier (bloom,
 * particles, planet and terrain detail) down/up with FPS, and the tier caps
 * R3F's performance factor, which AdaptiveDpr turns into a lower render
 * resolution. A fixed preset from Settings pins the tier and resolution.
 */
export function QualityManager() {
  const tier = useQualityStore((state) => state.tier);
  const stepDown = useQualityStore((state) => state.stepDown);
  const stepUp = useQualityStore((state) => state.stepUp);
  const lock = useQualityStore((state) => state.lock);
  const setTier = useQualityStore((state) => state.setTier);
  const preference = useSettingsStore((state) => state.display.quality);
  const device = useGameStore((state) => state.device);
  const setThree = useThree((state) => state.set);
  const auto = preference === "auto";

  useEffect(() => {
    if (!auto) setTier(preference);
  }, [auto, preference, setTier]);

  useEffect(() => {
    const factor = QUALITY[tier].dprFactor;
    setThree((state) => ({ performance: { ...state.performance, max: factor, current: factor } }));
  }, [tier, setThree]);

  const bounds = device === "touch" ? PERFORMANCE.touchBounds : PERFORMANCE.desktopBounds;

  if (!auto) return null;
  return (
    <>
      <PerformanceMonitor
        bounds={() => [bounds[0], bounds[1]]}
        flipflops={PERFORMANCE.flipflops}
        onDecline={stepDown}
        onIncline={stepUp}
        onFallback={lock}
      />
      <AdaptiveDpr />
    </>
  );
}
