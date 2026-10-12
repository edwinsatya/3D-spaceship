import { create } from "zustand";
import type { BodyId } from "@/game/data/planets";

/** Overlays that can open on top of any phase (menu, pause…). */
interface UiStore {
  encyclopedia: { open: boolean; selected: BodyId | null };
  openEncyclopedia: (selected?: BodyId | null) => void;
  closeEncyclopedia: () => void;
  selectEntry: (id: BodyId) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  encyclopedia: { open: false, selected: null },
  openEncyclopedia: (selected = null) => set({ encyclopedia: { open: true, selected } }),
  closeEncyclopedia: () => set((state) => ({ encyclopedia: { ...state.encyclopedia, open: false } })),
  selectEntry: (id) => set((state) => ({ encyclopedia: { ...state.encyclopedia, selected: id } })),
}));
