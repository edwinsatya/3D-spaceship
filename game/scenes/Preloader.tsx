"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { NoColorSpace, SRGBColorSpace, type WebGLRenderer } from "three";
import { PERFORMANCE } from "@/game/config/quality";
import { VISUALS } from "@/game/config/visuals";
import { SKY } from "@/game/config/world";
import { EARTH, MOON } from "@/game/data/planets";
import { useAssetStore, type TextureSlot } from "@/game/stores/assetStore";
import { useGameStore } from "@/game/stores/gameStore";
import { useLoadingStore } from "@/game/stores/loadingStore";
import { useQualityStore } from "@/game/stores/qualityStore";
import { loadTexture } from "@/game/systems/assetLoader";
import { ensureSurface } from "@/game/entities/planet/textures";
import { bakeDetail, bakeEarthDay, bakeEarthNight } from "./procedural/planetBakes";
import { bakeSky } from "./procedural/skyBake";

/** Next animation frame, with a timeout fallback for throttled background tabs. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cancelAnimationFrame(frame);
      resolve();
    }, 60);
    const frame = requestAnimationFrame(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

type Baker = () => { texture: import("three").Texture; dispose: () => void };

/** Uses the texture file when one is configured, otherwise the procedural bake. */
async function provide(
  renderer: WebGLRenderer,
  slot: TextureSlot,
  url: string | undefined,
  colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
  bake: Baker,
) {
  if (useAssetStore.getState().textures[slot]) return;
  if (url) {
    try {
      const texture = await loadTexture(renderer, url, colorSpace);
      useAssetStore.getState().setTexture(slot, texture, () => texture.dispose());
      return;
    } catch (error) {
      console.warn(`[assets] ${url} failed, using procedural ${slot}`, error);
    }
  }
  const { texture, dispose } = bake();
  useAssetStore.getState().setTexture(slot, texture, dispose);
}

/** One pipeline per renderer: GPU textures cannot be shared across WebGL contexts. */
const preloadRuns = new WeakMap<WebGLRenderer, Promise<void>>();

/**
 * Loading pipeline inside the Canvas: bake sky & planets on the GPU (one per
 * frame so the progress bar moves), then pre-compile every shader.
 */
export function Preloader() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    // Effects run twice in dev Strict Mode: share one pipeline per renderer.
    if (preloadRuns.has(gl)) return;
    const run = (async () => {
      // A new renderer (e.g. after a remount) invalidates textures from the previous one.
      useAssetStore.getState().disposeAll();
      const { setProgress, complete } = useLoadingStore.getState();
      const touch = useGameStore.getState().device === "touch";
      const tier = useQualityStore.getState().tier;
      const width = touch ? PERFORMANCE.bakeWidth.touch : PERFORMANCE.bakeWidth.desktop;
      const anisotropy = Math.min(touch ? 4 : 8, gl.capabilities.getMaxAnisotropy());
      const size = { width, anisotropy };

      await nextFrame();
      await provide(gl, "sky", undefined, SRGBColorSpace, () => {
        const target = bakeSky(gl, SKY.cubeSize[tier]);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      complete("sky");

      await nextFrame();
      await provide(gl, "earthDay", EARTH.textures?.day, SRGBColorSpace, () => {
        const target = bakeEarthDay(gl, EARTH.seed, size);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      setProgress("planets", 0.4);
      await nextFrame();
      await provide(gl, "earthNight", EARTH.textures?.night, NoColorSpace, () => {
        const target = bakeEarthNight(gl, EARTH.seed, size);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      setProgress("planets", 0.8);
      await nextFrame();
      await ensureSurface(gl, MOON);
      await provide(gl, "detail", undefined, NoColorSpace, () => {
        const target = bakeDetail(gl, VISUALS.detail.size, anisotropy);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      complete("planets");

      // Let the textured planets mount, then compile all programs up front
      // (KHR_parallel_shader_compile where available) to avoid first-frame hitches.
      await nextFrame();
      await nextFrame();
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        // Compilation also happens lazily on first render; never block loading on it.
      }
      complete("shaders");
    })();
    preloadRuns.set(gl, run);
  }, [gl, scene, camera]);

  return null;
}
