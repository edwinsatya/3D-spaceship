import { Vector3 } from "three";
import { PHOTO, type PhotoFilterId } from "@/game/config/photo";
import { BODIES } from "@/game/data/planets";
import { PHOTO_TARGETS } from "@/game/data/photoTargets";
import { localize, translate } from "@/game/i18n";
import { useGameStore } from "@/game/stores/gameStore";
import { usePhotoStore } from "@/game/stores/photoStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { spinAngle } from "./bodySpin";
import { gameEvents } from "./events";
import type { PhotoRecord } from "./galleryDb";
import { applyColorMatrix, filterMatrix, scorePhoto, type PhotoCamera } from "./photo";
import { runtime } from "./runtime";
import { submitMissionPhoto } from "./simulation";

export interface CaptureMeta {
  filter: PhotoFilterId;
  /** Photo missions: score of this framing (0 = subject not in the picture); null otherwise. */
  score: number | null;
}

const _forward = new Vector3();
const _up = new Vector3();

/** Scores the current photo-camera framing for the active photo mission (null outside one). */
export function currentPhotoScore(aspect: number): number | null {
  const layout = runtime.layout;
  if (layout?.mission.objective.type !== "photo") return null;
  const target = PHOTO_TARGETS[layout.mission.objective.target];
  const body = BODIES[target.body];
  const camera = runtime.camera;
  const view: PhotoCamera = {
    position: camera.position,
    forward: _forward.set(0, 0, -1).applyQuaternion(camera.quaternion),
    up: _up.set(0, 1, 0).applyQuaternion(camera.quaternion),
    fov: camera.fov,
    aspect,
  };
  return scorePhoto(target, body, spinAngle(body), view, runtime.environment.sunDirection).score;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), type, quality));
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Small caption in the corner: game name and where the photo was taken. */
function drawCaption(context: CanvasRenderingContext2D, height: number, caption: string): void {
  const size = Math.max(14, Math.round(height * 0.024));
  context.font = `600 ${size}px system-ui, sans-serif`;
  context.textBaseline = "bottom";
  context.shadowColor = "rgba(0, 0, 0, 0.8)";
  context.shadowBlur = size * 0.4;
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.fillText(caption, size, height - size * 0.8);
  context.shadowBlur = 0;
}

/**
 * Turns the captured frame into a gallery photo: resize, filter, caption,
 * JPEG + thumbnail, save; photo missions finish with a good enough shot.
 */
export async function processCapture(frame: Promise<ImageBitmap>, meta: CaptureMeta): Promise<void> {
  const bitmap = await frame;
  const scale = Math.min(1, PHOTO.capture.maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (meta.filter !== "none") {
    const pixels = context.getImageData(0, 0, width, height);
    applyColorMatrix(pixels.data, filterMatrix(meta.filter));
    context.putImageData(pixels, 0, 0);
  }
  const locale = useSettingsStore.getState().locale;
  const location = useGameStore.getState().location;
  drawCaption(context, height, `${translate(locale, "app.title")} · ${localize(BODIES[location].name, locale)}`);
  const image = await toBlob(canvas, "image/jpeg", PHOTO.capture.quality);

  const thumbScale = PHOTO.capture.thumbSize / Math.max(width, height);
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.round(width * thumbScale);
  thumbCanvas.height = Math.round(height * thumbScale);
  thumbCanvas.getContext("2d")?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumb = await toBlob(thumbCanvas, "image/jpeg", 0.8);

  const record: PhotoRecord = {
    id: newId(),
    createdAt: Date.now(),
    location,
    missionId: runtime.layout?.mission.id,
    score: meta.score ?? undefined,
    filter: meta.filter,
    width,
    height,
    image,
    thumb,
  };
  await usePhotoStore.getState().addPhoto(record);
  useProgressStore.getState().countPhoto();
  gameEvents.emit("photoTaken", { id: record.id, score: meta.score });
  if (meta.score !== null && submitMissionPhoto(meta.score, URL.createObjectURL(image))) {
    useGameStore.getState().closePhoto();
  }
}
