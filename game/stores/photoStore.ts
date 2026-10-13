import { create } from "zustand";
import { PHOTO, type PhotoFilterId } from "@/game/config/photo";
import { deletePhotoRecord, galleryAvailable, listPhotos, savePhotoRecord, type PhotoRecord } from "@/game/systems/galleryDb";

/** Photo mode choices and the local gallery (changes on clicks, never per frame). */
interface PhotoStore {
  filter: PhotoFilterId;
  hideShip: boolean;
  /** Hide the photo-mode controls for a clean view (tap to bring them back). */
  hideUi: boolean;
  photos: PhotoRecord[];
  loaded: boolean;
  /** Increments on every shutter press (drives the flash). */
  shots: number;
  setFilter: (filter: PhotoFilterId) => void;
  toggleShip: () => void;
  setHideUi: (hidden: boolean) => void;
  shutter: () => void;
  loadGallery: () => Promise<void>;
  addPhoto: (record: PhotoRecord) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
}

export const usePhotoStore = create<PhotoStore>()((set, get) => ({
  filter: "none",
  hideShip: false,
  hideUi: false,
  photos: [],
  loaded: false,
  shots: 0,
  setFilter: (filter) => set({ filter }),
  toggleShip: () => set((state) => ({ hideShip: !state.hideShip })),
  setHideUi: (hideUi) => set({ hideUi }),
  shutter: () => set((state) => ({ shots: state.shots + 1 })),
  loadGallery: async () => {
    if (get().loaded || !galleryAvailable()) return;
    try {
      set({ photos: await listPhotos(), loaded: true });
    } catch (error) {
      console.warn("[gallery] could not open the photo store", error);
      set({ loaded: true });
    }
  },
  addPhoto: async (record) => {
    await get().loadGallery();
    const photos = [record, ...get().photos];
    const kept = photos.slice(0, PHOTO.capture.galleryLimit);
    set({ photos: kept });
    try {
      await savePhotoRecord(record);
      for (const old of photos.slice(PHOTO.capture.galleryLimit)) await deletePhotoRecord(old.id);
    } catch (error) {
      console.warn("[gallery] could not save the photo", error);
    }
  },
  removePhoto: async (id) => {
    set((state) => ({ photos: state.photos.filter((photo) => photo.id !== id) }));
    try {
      await deletePhotoRecord(id);
    } catch (error) {
      console.warn("[gallery] could not delete the photo", error);
    }
  },
}));
