"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { useGameAudio } from "@/game/audio/useGameAudio";
import { CAMERA } from "@/game/config/camera";
import { FLIGHT } from "@/game/config/flight";
import { WORLD } from "@/game/config/world";
import { PERFORMANCE } from "@/game/config/quality";
import { SpaceScene } from "@/game/scenes/SpaceScene";
import { useAssetStore } from "@/game/stores/assetStore";
import { useGameStore } from "@/game/stores/gameStore";
import { usePhotoStore } from "@/game/stores/photoStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { useUiStore } from "@/game/stores/uiStore";
import { useBadgeAwards } from "@/game/ui/useBadgeAwards";
import { useSettingsEffects } from "@/game/ui/useSettingsEffects";
import { useAnalytics } from "@/game/ui/useAnalytics";
import { useLeaderboard } from "@/game/ui/useLeaderboard";
import { startAccount } from "@/game/systems/account/service";
import { photoSubject } from "@/game/systems/simulation";
import { useQualityStore } from "@/game/stores/qualityStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { DEBUG_HANDLE_ENABLED } from "@/game/systems/debug";
import { runtime } from "@/game/systems/runtime";
import { installThreeConsoleFilter } from "@/game/systems/threeConsole";
import { useAutoPause, useBoot, useInputSystem } from "@/game/systems/useGameLifecycle";
import { GameUI } from "@/game/ui/GameUI";
import { useFeedback } from "@/game/ui/useFeedback";
import { WebGLFallback } from "@/game/ui/WebGLFallback";

// Before any Canvas exists: R3F creates its (deprecated) THREE.Clock on mount.
installThreeConsoleFilter();

/** Dev-only console handle for inspecting/tuning the running game. */
function exposeDebugHandle() {
  if (!DEBUG_HANDLE_ENABLED) return;
  Object.assign(window, {
    __game: {
      runtime,
      config: { CAMERA, FLIGHT, WORLD },
      useGameStore,
      useSessionStore,
      useQualityStore,
      usePhotoStore,
      useProgressStore,
      useSettingsStore,
      useUiStore,
      photoSubject: () => photoSubject(runtime.layout)?.clone() ?? null,
    },
  });
}

export default function GameApp() {
  const webgl = useGameStore((state) => state.webgl);
  const paused = useGameStore((state) => state.phase === "paused");

  useBoot();
  useInputSystem();
  useAutoPause();
  useGameAudio();
  useFeedback();
  useBadgeAwards();
  useSettingsEffects();
  useAnalytics();
  useLeaderboard();
  useEffect(() => {
    // Offline play after the first visit (production only: dev rebuilds files under the same URLs).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("[pwa] service worker failed", error));
    }
  }, []);
  useEffect(() => {
    void startAccount();
  }, []);

  useEffect(() => () => useAssetStore.getState().disposeAll(), []);
  useEffect(() => exposeDebugHandle(), []);

  if (webgl === "unsupported") return <WebGLFallback />;

  return (
    <div className="fixed inset-0 touch-none overflow-hidden bg-space select-none">
      {webgl === "supported" && (
        <Canvas
          className="!absolute inset-0"
          dpr={[1, PERFORMANCE.maxDpr]}
          gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
          camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: [0, 0, 0] }}
          performance={{ min: PERFORMANCE.minPerformance, max: 1 }}
          // Always on; the sun light only casts on tiers with a shadow map size.
          shadows="percentage"
          frameloop={paused ? "demand" : "always"}
        >
          <SpaceScene />
        </Canvas>
      )}
      <GameUI />
    </div>
  );
}
