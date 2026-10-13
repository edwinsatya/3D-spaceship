"use client";

import { useEffect } from "react";
import { audio } from "@/game/audio/audioManager";
import { HUD } from "@/game/config/hud";
import { PERFORMANCE } from "@/game/config/quality";
import { detectInputDevice, supportsWebGL2 } from "@/game/controls/device";
import { GamepadSource } from "@/game/controls/gamepad";
import { InputManager } from "@/game/controls/inputManager";
import { KeyboardMouseSource } from "@/game/controls/keyboardMouse";
import { TouchSource } from "@/game/controls/touch";
import type { ControlAction } from "@/game/controls/types";
import { useGameStore } from "@/game/stores/gameStore";
import { overallProgress, useLoadingStore } from "@/game/stores/loadingStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useQualityStore } from "@/game/stores/qualityStore";
import { runtime } from "./runtime";
import { isWarping } from "./warp";
import { togglePhotoMode } from "./photoMode";


/** boot → loading: capability checks, device detection, audio synthesis. */
export function useBoot() {
  useEffect(() => {
    const game = useGameStore.getState();
    const device = detectInputDevice();
    game.setDevice(device);
    useQualityStore
      .getState()
      .setTier(device === "touch" ? PERFORMANCE.touchStartTier : PERFORMANCE.desktopStartTier);

    if (!supportsWebGL2()) {
      game.setWebGL("unsupported");
      return;
    }
    game.setWebGL("supported");
    game.transition("loading");
    const loading = useLoadingStore.getState();
    loading.complete("script");
    void audio
      .load((progress) => loading.setProgress("audio", Math.min(0.99, progress)))
      .then(() => useLoadingStore.getState().complete("audio"));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useLoadingStore.subscribe((state) => {
      if (timer || overallProgress(state.progress) < 1) return;
      timer = setTimeout(() => useGameStore.getState().transition("menu"), HUD.loadingSettle);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);
}

/** Creates the unified input pipeline and routes discrete actions to the stores. */
export function useInputSystem() {
  useEffect(() => {
    const onAction = (action: ControlAction) => {
      const game = useGameStore.getState();
      if (action === "pause") {
        if (game.phase === "map") game.closeMap();
        else if (game.phase === "photo") game.closePhoto();
        else game.togglePause();
      } else if (action === "toggleCamera") game.toggleCamera();
      else if (action === "mute") useProgressStore.getState().toggleMuted();
      else if (action === "map") {
        if (game.phase === "map") game.closeMap();
        else if (!isWarping(runtime.warp)) {
          game.openMap();
          runtime.tutorial.mapOpened = true;
        }
      } else if (action === "photo") togglePhotoMode();
      else runtime.pendingActions.add(action);
    };
    const keyboard = new KeyboardMouseSource(window, onAction);
    const manager = new InputManager([keyboard, new TouchSource(), new GamepadSource()]);
    runtime.input = manager;
    runtime.cursor = keyboard.cursor;

    // Switch HUD/hints between desktop and touch as soon as the player uses the other one.
    const onPointerDown = (event: PointerEvent) => {
      useGameStore.getState().setDevice(event.pointerType === "touch" ? "touch" : "desktop");
    };
    window.addEventListener("pointerdown", onPointerDown);

    const unsubscribeCamera = useGameStore.subscribe((state, previous) => {
      if (state.cameraMode !== previous.cameraMode) runtime.tutorial.cameraToggled = true;
    });

    return () => {
      manager.dispose();
      runtime.input = null;
      runtime.cursor = null;
      window.removeEventListener("pointerdown", onPointerDown);
      unsubscribeCamera();
    };
  }, []);
}

/** Pause automatically when the tab is hidden or the window loses focus. */
export function useAutoPause() {
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        useGameStore.getState().pause();
        audio.suspend();
      } else {
        audio.resume();
      }
    };
    const onBlur = () => useGameStore.getState().pause();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
