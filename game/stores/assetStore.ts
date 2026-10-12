import type { Texture } from "three";
import { create } from "zustand";

export type TextureSlot = "sky" | "earthDay" | "earthNight" | "moon" | "detail";

interface AssetStore {
  textures: Partial<Record<TextureSlot, Texture>>;
  /** Owners to dispose (render targets or loaded textures). */
  disposers: Partial<Record<TextureSlot, () => void>>;
  setTexture: (slot: TextureSlot, texture: Texture, dispose: () => void) => void;
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
