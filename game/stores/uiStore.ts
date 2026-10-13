import { create } from "zustand";
import type { MissionId } from "@/game/data/missions";
import type { BodyId } from "@/game/data/planets";

/** Overlays that can open on top of any phase (menu, pause…). */
interface UiStore {
  encyclopedia: { open: boolean; selected: BodyId | null };
  missions: { open: boolean; selected: MissionId | null };
  gallery: boolean;
  openGallery: () => void;
  closeGallery: () => void;
  openMissions: (selected?: MissionId | null) => void;
  closeMissions: () => void;
  selectMission: (id: MissionId) => void;
  openEncyclopedia: (selected?: BodyId | null) => void;
  closeEncyclopedia: () => void;
  selectEntry: (id: BodyId) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  encyclopedia: { open: false, selected: null },
  missions: { open: false, selected: null },
  gallery: false,
  openGallery: () => set({ gallery: true }),
  closeGallery: () => set({ gallery: false }),
  openMissions: (selected = null) => set((state) => ({ missions: { open: true, selected: selected ?? state.missions.selected } })),
  closeMissions: () => set((state) => ({ missions: { ...state.missions, open: false } })),
  selectMission: (id) => set((state) => ({ missions: { ...state.missions, selected: id } })),
  openEncyclopedia: (selected = null) => set({ encyclopedia: { open: true, selected } }),
  closeEncyclopedia: () => set((state) => ({ encyclopedia: { ...state.encyclopedia, open: false } })),
  selectEntry: (id) => set((state) => ({ encyclopedia: { ...state.encyclopedia, selected: id } })),
}));
