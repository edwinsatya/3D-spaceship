"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { NoColorSpace, SRGBColorSpace, type Texture, type WebGLRenderer } from "three";
import { PERFORMANCE } from "@/game/config/quality";
import type { CelestialBody } from "@/game/data/planets";
import { bakeRings, bakeSurface } from "@/game/scenes/procedural/surfaceBakes";
import { useAssetStore, type TextureSlot } from "@/game/stores/assetStore";
import { useGameStore } from "@/game/stores/gameStore";
import { loadTexture } from "@/game/systems/assetLoader";

/** Textures that stay resident: the home location is revisited constantly. */
const RESIDENT: ReadonlySet<string> = new Set(["earth", "moon"]);

function bakeWidth(body: CelestialBody): number {
  const touch = useGameStore.getState().device === "touch";
  const giant = body.radius >= PERFORMANCE.giantRadius;
  const sizes = giant ? PERFORMANCE.giantBakeWidth : PERFORMANCE.surfaceBakeWidth;
  return touch ? sizes.touch : sizes.desktop;
}

const pending = new Set<TextureSlot>();

/** Loads the configured file or bakes the procedural surface once per renderer. */
export async function ensureSurface(renderer: WebGLRenderer, body: CelestialBody): Promise<void> {
  const slot: TextureSlot = `surface:${body.id}`;
  const store = useAssetStore.getState();
  if (store.textures[slot] || pending.has(slot)) return;
  if (body.surface.type === "earth" || body.surface.type === "star") return;
  pending.add(slot);
  try {
    const url = body.textures?.color;
    if (url) {
      try {
        const texture = await loadTexture(renderer, url, SRGBColorSpace);
        useAssetStore.getState().setTexture(slot, texture, () => texture.dispose());
        return;
      } catch (error) {
        console.warn(`[assets] ${url} failed, using procedural ${body.id}`, error);
      }
    }
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const target = bakeSurface(renderer, body, { width: bakeWidth(body), anisotropy });
    if (target) useAssetStore.getState().setTexture(slot, target.texture, () => target.dispose());
  } finally {
    pending.delete(slot);
  }
}

export function ensureRings(renderer: WebGLRenderer, body: CelestialBody): void {
  const slot: TextureSlot = `rings:${body.id}`;
  if (!body.rings || useAssetStore.getState().textures[slot]) return;
  const target = bakeRings(renderer, body.rings, body.seed);
  target.texture.colorSpace = NoColorSpace;
  useAssetStore.getState().setTexture(slot, target.texture, () => target.dispose());
}

/** Surface (and ring) textures for a body, baked on first use, freed when it unmounts. */
export function useBodyTextures(body: CelestialBody): { surface?: Texture; rings?: Texture } {
  const gl = useThree((state) => state.gl);
  const surface = useAssetStore((state) => state.textures[`surface:${body.id}`]);
  const rings = useAssetStore((state) => state.textures[`rings:${body.id}`]);

  useEffect(() => {
    void ensureSurface(gl, body);
    ensureRings(gl, body);
  }, [gl, body]);

  useEffect(
    () => () => {
      if (RESIDENT.has(body.id)) return;
      useAssetStore.getState().release([`surface:${body.id}`, `rings:${body.id}`]);
    },
    [body],
  );

  return { surface, rings };
}
