"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { BODIES } from "@/game/data/planets";
import { MISSIONS } from "@/game/data/missions";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { usePhotoStore } from "@/game/stores/photoStore";
import { useUiStore } from "@/game/stores/uiStore";
import type { PhotoRecord } from "@/game/systems/galleryDb";
import { GameButton, Panel } from "../primitives";
import { useBlobUrl } from "../useBlobUrl";

function Thumbnail({ photo, onOpen }: { photo: PhotoRecord; onOpen: () => void }) {
  const url = useBlobUrl(photo.thumb);
  const locale = useLocale();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:border-cyan-200/60"
      aria-label={localize(BODIES[photo.location].name, locale)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
      {url && <img src={url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
    </button>
  );
}

function fileName(photo: PhotoRecord): string {
  const date = new Date(photo.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `space-explorer-${photo.location}-${date}.jpg`;
}

function Viewer({ photo, onBack }: { photo: PhotoRecord; onBack: () => void }) {
  const t = useT();
  const locale = useLocale();
  const url = useBlobUrl(photo.image);
  const remove = usePhotoStore((state) => state.removePhoto);
  const [confirm, setConfirm] = useState(false);
  const file = typeof File !== "undefined" ? new File([photo.image], fileName(photo), { type: "image/jpeg" }) : null;
  const canShare = Boolean(file && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }));

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: t("app.title") });
    } catch {
      // Cancelled or not allowed: nothing to do.
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        {url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/80">
          {localize(BODIES[photo.location].name, locale)} · {new Date(photo.createdAt).toLocaleString(locale)}
          {photo.missionId && ` · ${localize(MISSIONS[photo.missionId].name, locale)}`}
          {photo.score !== undefined && ` · ${t("gallery.score", { score: photo.score })}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <GameButton variant="secondary" onClick={onBack} className="!min-h-10 !py-1.5 !text-xs">
            {t("gallery.back")}
          </GameButton>
          {url && (
            <a
              href={url}
              download={fileName(photo)}
              className="inline-flex min-h-10 items-center rounded-2xl border border-cyan-200/40 bg-white/10 px-4 font-display text-xs font-bold uppercase tracking-widest hover:bg-white/20"
            >
              {t("gallery.download")}
            </a>
          )}
          {canShare && (
            <GameButton variant="secondary" onClick={() => void share()} className="!min-h-10 !py-1.5 !text-xs">
              {t("gallery.share")}
            </GameButton>
          )}
          <GameButton
            variant="ghost"
            onClick={() => {
              if (!confirm) {
                setConfirm(true);
                return;
              }
              void remove(photo.id);
              onBack();
            }}
            className="!min-h-10 !py-1.5 !text-xs !text-danger"
          >
            {confirm ? t("gallery.confirmDelete") : t("gallery.delete")}
          </GameButton>
        </div>
      </div>
    </div>
  );
}

/** Photos taken in photo mode, stored on this device (IndexedDB). */
export function Gallery() {
  const t = useT();
  const close = useUiStore((state) => state.closeGallery);
  const photos = usePhotoStore((state) => state.photos);
  const loadGallery = usePhotoStore((state) => state.loadGallery);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = photos.find((photo) => photo.id === openId) ?? null;

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [close]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm short:p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
    >
      <Panel className="flex h-full max-h-[44rem] w-full max-w-5xl flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="gallery-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
              {t("gallery.title")}
            </h2>
            <p className="text-sm text-cyan-100/75">{t("gallery.count", { count: photos.length })}</p>
          </div>
          <GameButton variant="secondary" onClick={close}>
            {t("gallery.close")}
          </GameButton>
        </div>
        {open ? (
          <Viewer photo={open} onBack={() => setOpenId(null)} />
        ) : photos.length === 0 ? (
          <p className="m-auto max-w-sm text-center text-sm leading-relaxed text-white/75">{t("gallery.empty")}</p>
        ) : (
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4 short:grid-cols-4 short:gap-2">
            {photos.map((photo) => (
              <Thumbnail key={photo.id} photo={photo} onOpen={() => setOpenId(photo.id)} />
            ))}
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
