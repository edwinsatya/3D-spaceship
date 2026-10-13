"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { NoColorSpace, SRGBColorSpace, type Texture, type WebGLRenderer } from "three";
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
import {
  bakeDetail,
  bakeEarthDay,
  bakeEarthNight,
  packEarthDay,
  packEarthNight,
  type PlanetBakeSize,
} from "./procedural/planetBakes";
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

/** Bakes a procedural texture into its slot once (files, if any, replace it later). */
function provide(slot: TextureSlot, bake: Baker) {
  if (useAssetStore.getState().textures[slot]) return;
  const { texture, dispose } = bake();
  useAssetStore.getState().setTexture(slot, texture, dispose);
}

/**
 * Swaps Earth's procedural maps for the real ones in the background (loading
 * never waits for the network): the files are packed into the channel layout
 * the Earth shader expects, then the sources are freed.
 */
async function upgradeEarth(renderer: WebGLRenderer, size: PlanetBakeSize): Promise<void> {
  const files = EARTH.textures;
  const store = useAssetStore.getState;
  const pack = async (
    slot: "earthDay" | "earthNight",
    urls: readonly [string | undefined, string | undefined],
    colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
    packer: (a: Texture, b: Texture) => { texture: Texture; dispose: () => void },
  ) => {
    const [first, second] = urls;
    if (!first || !second) return;
    const placeholder = store().textures[slot];
    try {
      const [a, b] = await Promise.all([loadTexture(renderer, first, colorSpace), loadTexture(renderer, second, NoColorSpace)]);
      // Released (renderer remount) or already replaced while downloading: drop the result.
      if (store().textures[slot] === placeholder) {
        const { texture, dispose } = packer(a, b);
        texture.userData.file = true;
        store().setTexture(slot, texture, dispose);
      }
      a.dispose();
      b.dispose();
    } catch (error) {
      console.warn(`[assets] Earth ${slot} files failed, keeping procedural`, error);
    }
  };
  await Promise.all([
    pack("earthDay", [files?.day, files?.ocean], SRGBColorSpace, (color, ocean) => {
      const target = packEarthDay(renderer, color, ocean, size);
      return { texture: target.texture, dispose: () => target.dispose() };
    }),
    pack("earthNight", [files?.night, files?.clouds], NoColorSpace, (lights, clouds) => {
      const target = packEarthNight(renderer, lights, clouds, size);
      return { texture: target.texture, dispose: () => target.dispose() };
    }),
  ]);
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
      provide("sky", () => {
        const target = bakeSky(gl, SKY.cubeSize[tier]);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      complete("sky");

      await nextFrame();
      provide("earthDay", () => {
        const target = bakeEarthDay(gl, EARTH.seed, size);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      setProgress("planets", 0.4);
      await nextFrame();
      provide("earthNight", () => {
        const target = bakeEarthNight(gl, EARTH.seed, size);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      setProgress("planets", 0.8);
      await nextFrame();
      ensureSurface(gl, MOON);
      provide("detail", () => {
        const target = bakeDetail(gl, VISUALS.detail.size, anisotropy);
        return { texture: target.texture, dispose: () => target.dispose() };
      });
      complete("planets");
      void upgradeEarth(gl, size);

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
