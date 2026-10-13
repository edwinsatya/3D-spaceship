"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { NoColorSpace, SRGBColorSpace, type ColorSpace, type Texture, type WebGLRenderer } from "three";
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

/** Placeholders whose file replacement is already on its way. */
const upgrading = new WeakSet<Texture>();

/**
 * Swaps the procedural placeholder for the texture file once it has loaded,
 * unless the slot was released or replaced in the meantime.
 */
async function upgradeSlot(
  renderer: WebGLRenderer,
  slot: TextureSlot,
  url: string,
  colorSpace: ColorSpace,
  placeholder: Texture | undefined,
): Promise<void> {
  if (placeholder) {
    if (upgrading.has(placeholder)) return;
    upgrading.add(placeholder);
  }
  try {
    const texture = await loadTexture(renderer, url, colorSpace);
    if (useAssetStore.getState().textures[slot] !== placeholder) {
      texture.dispose();
      return;
    }
    texture.userData.file = true;
    useAssetStore.getState().setTexture(slot, texture, () => texture.dispose());
  } catch (error) {
    console.warn(`[assets] ${url} failed, keeping procedural ${slot}`, error);
  }
}

function needsUpgrade(texture: Texture | undefined): boolean {
  return !texture?.userData.file;
}

/** Bakes the procedural surface at once (so the planet is never blank), then loads the file if configured. */
export function ensureSurface(renderer: WebGLRenderer, body: CelestialBody): void {
  if (body.surface.type === "earth" || body.surface.type === "star") return;
  const slot: TextureSlot = `surface:${body.id}`;
  let current = useAssetStore.getState().textures[slot];
  if (!current) {
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const target = bakeSurface(renderer, body, { width: bakeWidth(body), anisotropy });
    if (target) {
      useAssetStore.getState().setTexture(slot, target.texture, () => target.dispose());
      current = target.texture;
    }
  }
  const url = body.textures?.color;
  if (url && needsUpgrade(current)) void upgradeSlot(renderer, slot, url, SRGBColorSpace, current);
}

export function ensureRings(renderer: WebGLRenderer, body: CelestialBody): void {
  if (!body.rings) return;
  const slot: TextureSlot = `rings:${body.id}`;
  let current = useAssetStore.getState().textures[slot];
  if (!current) {
    const target = bakeRings(renderer, body.rings, body.seed);
    target.texture.colorSpace = NoColorSpace;
    useAssetStore.getState().setTexture(slot, target.texture, () => target.dispose());
    current = target.texture;
  }
  const url = body.textures?.rings;
  if (url && needsUpgrade(current)) void upgradeSlot(renderer, slot, url, SRGBColorSpace, current);
}

/** A texture file owned by one component (loaded on mount, freed on unmount); null until loaded. */
export function useTextureFile(url: string | undefined, colorSpace: ColorSpace): Texture | null {
  const gl = useThree((state) => state.gl);
  const [loaded, setLoaded] = useState<{ url: string; texture: Texture } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let texture: Texture | null = null;
    loadTexture(gl, url, colorSpace)
      .then((result) => {
        if (cancelled) {
          result.dispose();
          return;
        }
        texture = result;
        setLoaded({ url, texture: result });
      })
      .catch((error) => console.warn(`[assets] ${url} failed`, error));
    return () => {
      cancelled = true;
      texture?.dispose();
    };
  }, [gl, url, colorSpace]);
  return loaded && loaded.url === url ? loaded.texture : null;
}

/** Surface (and ring) textures for a body: baked on first use, upgraded to files, freed when it unmounts. */
export function useBodyTextures(body: CelestialBody): { surface?: Texture; rings?: Texture } {
  const gl = useThree((state) => state.gl);
  const surface = useAssetStore((state) => state.textures[`surface:${body.id}`]);
  const rings = useAssetStore((state) => state.textures[`rings:${body.id}`]);

  useEffect(() => {
    ensureSurface(gl, body);
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
