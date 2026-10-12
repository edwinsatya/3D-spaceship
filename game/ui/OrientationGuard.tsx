"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { useMediaQuery } from "./useMediaQuery";

/** Phones are played in landscape: ask to rotate (and pause) when held upright. */
export function OrientationGuard() {
  const t = useT();
  const device = useGameStore((state) => state.device);
  const portrait = useMediaQuery("(orientation: portrait)");
  const show = device === "touch" && portrait;

  useEffect(() => {
    if (show) useGameStore.getState().pause();
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-space/95 p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-labelledby="rotate-title"
        >
          <motion.div
            className="h-24 w-14 rounded-xl border-4 border-hud"
            animate={{ rotate: [0, 0, 90, 90, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.2, 0.5, 0.8, 1] }}
          />
          <h2 id="rotate-title" className="font-display text-2xl font-bold">
            {t("orientation.title")}
          </h2>
          <p className="max-w-xs text-white/80">{t("orientation.body")}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
