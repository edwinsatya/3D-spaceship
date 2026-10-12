"use client";

import { useAssetStore } from "@/game/stores/assetStore";

/** Baked nebula/galaxy/star cube map as the infinitely distant background layer. */
export function SkyBackground() {
  const sky = useAssetStore((state) => state.textures.sky);
  if (!sky) return null;
  return <primitive attach="background" object={sky} />;
}
