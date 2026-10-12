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
import { useQualityStore } from "@/game/stores/qualityStore";
import { useSessionStore } from "@/game/stores/sessionStore";
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
  if (process.env.NODE_ENV === "production") return;
  Object.assign(window, {
    __game: { runtime, config: { CAMERA, FLIGHT, WORLD }, useGameStore, useSessionStore, useQualityStore },
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
          frameloop={paused ? "demand" : "always"}
        >
          <SpaceScene />
        </Canvas>
      )}
      <GameUI />
    </div>
  );
}
