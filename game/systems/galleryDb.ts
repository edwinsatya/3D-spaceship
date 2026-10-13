import type { PhotoFilterId } from "@/game/config/photo";
import type { MissionId } from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";

/** A saved photo; images are Blobs in IndexedDB (localStorage is far too small). */
export interface PhotoRecord {
  id: string;
  createdAt: number;
  location: LocationId;
  missionId?: MissionId;
  /** Photo missions: the shot's score (0–100). */
  score?: number;
  filter: PhotoFilterId;
  width: number;
  height: number;
  image: Blob;
  thumb: Blob;
}

const DB_NAME = "jelajah-angkasa";
const DB_VERSION = 1;
const STORE = "photos";

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("createdAt", "createdAt");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
  });
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = work(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function galleryAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/** Newest first. */
export async function listPhotos(): Promise<PhotoRecord[]> {
  const records = await run<PhotoRecord[]>("readonly", (store) => store.getAll());
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export function savePhotoRecord(record: PhotoRecord): Promise<IDBValidKey> {
  return run("readwrite", (store) => store.put(record));
}

export function deletePhotoRecord(id: string): Promise<undefined> {
  return run("readwrite", (store) => store.delete(id));
}
