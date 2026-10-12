"use client";

import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { PERFORMANCE, QUALITY } from "@/game/config/quality";
import { useGameStore } from "@/game/stores/gameStore";
import { useQualityStore } from "@/game/stores/qualityStore";

/**
 * Automatic quality: PerformanceMonitor steps the tier (bloom, particles,
 * planet detail) down/up with FPS, and the tier caps R3F's performance
 * factor, which AdaptiveDpr turns into a lower render resolution.
 */
export function QualityManager() {
  const tier = useQualityStore((state) => state.tier);
  const stepDown = useQualityStore((state) => state.stepDown);
  const stepUp = useQualityStore((state) => state.stepUp);
  const lock = useQualityStore((state) => state.lock);
  const device = useGameStore((state) => state.device);
  const setThree = useThree((state) => state.set);

  useEffect(() => {
    const factor = QUALITY[tier].dprFactor;
    setThree((state) => ({ performance: { ...state.performance, max: factor, current: factor } }));
  }, [tier, setThree]);

  const bounds = device === "touch" ? PERFORMANCE.touchBounds : PERFORMANCE.desktopBounds;

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
