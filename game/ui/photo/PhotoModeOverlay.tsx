"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { audio } from "@/game/audio/audioManager";
import { PHOTO, PHOTO_FILTER_ORDER } from "@/game/config/photo";
import { PHOTO_TARGETS } from "@/game/data/photoTargets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { usePhotoStore } from "@/game/stores/photoStore";
import { useUiStore } from "@/game/stores/uiStore";
import { gameEvents } from "@/game/systems/events";
import { currentPhotoScore } from "@/game/systems/photoCapture";
import { dollyPhotoCamera, rotatePhotoCamera } from "@/game/systems/photoMode";
import { runtime } from "@/game/systems/runtime";
import { rateMission } from "@/game/systems/scoring";
import { GalleryIcon, PhotoIcon } from "../icons";
import { useBlobUrl } from "../useBlobUrl";
import { setText, useHudFrame } from "../useHudFrame";

/** Press the shutter: the capture runs right after the next frame is drawn. */
function takePhoto() {
  runtime.photo.captureRequested = true;
  usePhotoStore.getState().shutter();
  audio.play("star", { rate: 1.6, volume: 0.6 });
}

/** Drag to look around, wheel / pinch to move the camera; a tap brings hidden controls back. */
function useCameraGestures(element: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    let moved = 0;
    const onDown = (event: PointerEvent) => {
      target.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      moved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1) rotatePhotoCamera(dx, dy);
      else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        dollyPhotoCamera((pinch - distance) * 2.5);
        pinch = distance;
      }
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      // A tap (no drag) on the empty view shows the hidden controls again.
      if (moved < 6 && usePhotoStore.getState().hideUi) usePhotoStore.getState().setHideUi(false);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      dollyPhotoCamera(event.deltaY);
    };
    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
    target.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      target.removeEventListener("pointerdown", onDown);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      target.removeEventListener("wheel", onWheel);
    };
  }, [element]);
}

/** Live framing score for photo missions, written straight to the DOM. */
function FramingMeter() {
  const t = useT();
  const value = useRef<HTMLSpanElement>(null);
  const stars = useRef<HTMLSpanElement>(null);
  useHudFrame(() => {
    const score = currentPhotoScore(window.innerWidth / Math.max(1, window.innerHeight));
    if (score === null) return;
    setText(value.current, String(score));
    const rating = runtime.layout?.mission.rating;
    const earned = score > 0 && rating ? rateMission(score, rating) : 0;
    setText(stars.current, "★".repeat(earned) + "☆".repeat(3 - earned));
  });
  return (
    <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wider">
      <span className="text-cyan-100/80">{t("photo.framing")}</span>
      <span ref={value} className="min-w-[3ch] text-lg tabular-nums text-white">
        0
      </span>
      <span ref={stars} className="text-lg text-star" aria-hidden="true">
        ☆☆☆
      </span>
    </p>
  );
}

/** Thumbnail + "Photo saved!" after each shot, or why a mission shot did not count. */
function ShotFeedback() {
  const t = useT();
  const locale = useLocale();
  const openGallery = useUiStore((state) => state.openGallery);
  const photos = usePhotoStore((state) => state.photos);
  const [shot, setShot] = useState<{ id: string; missed: boolean } | null>(null);
  const record = shot ? photos.find((photo) => photo.id === shot.id) : undefined;
  const url = useBlobUrl(record?.thumb);

  useEffect(
    () =>
      gameEvents.on("photoTaken", ({ id, score }) => {
        setShot({ id, missed: score === 0 });
      }),
    [],
  );
  useEffect(() => {
    if (!shot) return;
    const timer = setTimeout(() => setShot(null), 3500);
    return () => clearTimeout(timer);
  }, [shot]);

  const objective = runtime.layout?.mission.objective;
  const targetName = objective?.type === "photo" ? localize(PHOTO_TARGETS[objective.target].name, locale) : "";
  return (
    <AnimatePresence>
      {shot && url && (
        <motion.div
          key={shot.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          className="hud-panel pointer-events-auto flex items-center gap-3 rounded-2xl p-2 pr-4"
          role="status"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={url} alt="" className="h-14 w-24 rounded-lg object-cover" />
          <div className="flex flex-col gap-1">
            <p className={`text-sm font-bold ${shot.missed ? "text-star" : "text-emerald-300"}`}>
              {shot.missed ? t("photo.missed", { name: targetName }) : t("photo.saved")}
            </p>
            <button type="button" onClick={() => openGallery()} className="flex items-center gap-1 self-start text-xs text-cyan-100 underline-offset-2 hover:underline">
              <GalleryIcon /> {t("photo.openGallery")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Photo mode: frozen world, free camera, filters, shutter. */
export function PhotoModeOverlay() {
  const t = useT();
  const locale = useLocale();
  const touch = useGameStore((state) => state.device === "touch");
  const closePhoto = useGameStore((state) => state.closePhoto);
  const { filter, hideShip, hideUi, shots, setFilter, toggleShip, setHideUi } = usePhotoStore();
  const gestures = useRef<HTMLDivElement>(null);
  useCameraGestures(gestures);
  const objective = runtime.layout?.mission.objective;
  const target = objective?.type === "photo" ? PHOTO_TARGETS[objective.target] : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        takePhoto();
      } else if (event.code === "KeyH") setHideUi(!usePhotoStore.getState().hideUi);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setHideUi]);

  const { min, max } = PHOTO.camera.fov;
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div ref={gestures} className="pointer-events-auto absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />

      {/* Shutter flash. */}
      {shots > 0 && (
        <motion.div
          key={shots}
          className="pointer-events-none absolute inset-0 bg-white"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      )}

      {hideUi ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-white/50">{t("photo.showUi")}</p>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 short:p-2">
          <div className="flex items-start justify-between gap-3">
            <div className="hud-panel pointer-events-auto flex max-w-md flex-col gap-1 rounded-2xl px-4 py-2 short:py-1.5">
              <h2 className="font-display text-sm font-black uppercase tracking-[0.25em] text-hud">{t("photo.title")}</h2>
              {target && <p className="text-xs leading-snug text-white/90 short:hidden">{localize(target.brief, locale)}</p>}
              {target && <FramingMeter />}
              <p className="text-[11px] text-white/60 short:hidden">
                {touch ? t("photo.dragHintTouch") : `${t("photo.dragHint")} · ${t("photo.keysHint")}`}
              </p>
            </div>
            <button
              type="button"
              onClick={closePhoto}
              className="hud-panel pointer-events-auto rounded-2xl px-4 py-2 font-display text-sm font-bold tracking-wider hover:bg-white/10 active:scale-95"
            >
              {t("photo.close")}
            </button>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <ShotFeedback />
              <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl p-2">
                {PHOTO_FILTER_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    aria-pressed={filter === id}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                      filter === id ? "bg-hud text-slate-900" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {t(`photo.filters.${id}`)}
                  </button>
                ))}
              </div>
              <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2 text-xs">
                <label className="flex items-center gap-2">
                  <span className="font-bold">{t("photo.zoom")}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    defaultValue={Math.round(((max - runtime.photo.fov) / (max - min)) * 100)}
                    onChange={(event) => {
                      runtime.photo.fov = max - (Number(event.target.value) / 100) * (max - min);
                    }}
                    className="w-28 accent-cyan-300"
                  />
                </label>
                <button
                  type="button"
                  onClick={toggleShip}
                  aria-pressed={!hideShip}
                  className={`rounded-xl px-3 py-1.5 font-bold ${hideShip ? "bg-white/10" : "bg-white/25"}`}
                >
                  {t("photo.ship")}: {hideShip ? "✕" : "✓"}
                </button>
                <button type="button" onClick={() => setHideUi(true)} className="rounded-xl bg-white/10 px-3 py-1.5 font-bold hover:bg-white/20">
                  {t("photo.hideUi")}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={takePhoto}
              aria-label={t("photo.shutter")}
              className="pointer-events-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white/90 bg-white/20 text-3xl text-white shadow-[0_0_30px_rgba(255,255,255,0.35)] transition-transform active:scale-90 short:h-16 short:w-16"
            >
              <PhotoIcon />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
