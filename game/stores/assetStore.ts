import type { Texture } from "three";
import { create } from "zustand";
import type { BodyId } from "@/game/data/planets";

/** Global textures plus per-body surface/ring textures (baked on demand). */
export type TextureSlot = "sky" | "earthDay" | "earthNight" | "detail" | `surface:${BodyId}` | `rings:${BodyId}`;

interface AssetStore {
  textures: Partial<Record<TextureSlot, Texture>>;
  /** Owners to dispose (render targets or loaded textures). */
  disposers: Partial<Record<TextureSlot, () => void>>;
  setTexture: (slot: TextureSlot, texture: Texture, dispose: () => void) => void;
  /** Frees the given slots (e.g. textures of a location you just left). */
  release: (slots: readonly TextureSlot[]) => void;
  disposeAll: () => void;
}

export const useAssetStore = create<AssetStore>()((set, get) => ({
  textures: {},
  disposers: {},
  setTexture: (slot, texture, dispose) => {
    get().disposers[slot]?.();
    set((state) => ({
      textures: { ...state.textures, [slot]: texture },
      disposers: { ...state.disposers, [slot]: dispose },
    }));
  },
  release: (slots) => {
    const { disposers, textures } = get();
    const nextTextures = { ...textures };
    const nextDisposers = { ...disposers };
    for (const slot of slots) {
      try {
        disposers[slot]?.();
      } catch {
        // Renderer already gone: nothing to free.
      }
      delete nextTextures[slot];
      delete nextDisposers[slot];
    }
    set({ textures: nextTextures, disposers: nextDisposers });
  },
  disposeAll: () => {
    for (const dispose of Object.values(get().disposers)) {
      try {
        dispose?.();
      } catch {
        // The owning renderer may already be gone (context lost / unmounted): nothing left to free.
      }
    }
    set({ textures: {}, disposers: {} });
  },
}));
