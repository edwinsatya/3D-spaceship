"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { HUD } from "@/game/config/hud";
import { SPACE_FACTS } from "@/game/data/facts";
import { translate, type Locale } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { currentTask, overallProgress, useLoadingStore } from "@/game/stores/loadingStore";
import { OrbitIcon } from "./icons";

interface LoadingViewProps {
  /** 0..1, or null while the game script itself is still downloading. */
  progress: number | null;
  title: string;
  label: string;
  factTitle: string;
  fact: string;
}

function LoadingView({ progress, title, label, factTitle, fact }: LoadingViewProps) {
  const percent = progress === null ? null : Math.round(progress * 100);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[radial-gradient(ellipse_at_center,#0b1a33_0%,#02030a_70%)] px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <OrbitIcon className="animate-[spin_6s_linear_infinite] text-6xl text-hud drop-shadow-[0_0_14px_rgba(125,249,255,0.6)]" />
        <h1 className="font-display text-2xl font-black tracking-[0.18em] text-white sm:text-4xl">{title}</h1>
      </div>
      <div className="w-full max-w-md">
        <div
          className="h-3 overflow-hidden rounded-full border border-cyan-300/30 bg-white/5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          aria-label={label}
        >
          {percent === null ? (
            <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-cyan-300/60" />
          ) : (
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-300 shadow-[0_0_14px_rgba(125,249,255,0.7)] transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
        <div className="mt-3 flex justify-between font-display text-xs tracking-widest text-cyan-100/80">
          <span>{label}</span>
          <span>{percent === null ? "" : `${percent}%`}</span>
        </div>
      </div>
      <div className="hud-panel min-h-24 w-full max-w-md rounded-2xl px-5 py-4">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-star">{factTitle}</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={fact}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="mt-2 text-sm leading-relaxed text-white/90 sm:text-base"
          >
            {fact}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Server-rendered placeholder shown while the game bundle downloads. */
export function StaticLoadingScreen({ locale = "id" }: { locale?: Locale }) {
  return (
    <LoadingView
      progress={null}
      title={translate(locale, "app.title")}
      label={translate(locale, "loading.tasks.script")}
      factTitle={translate(locale, "loading.didYouKnow")}
      fact={SPACE_FACTS[0][locale]}
    />
  );
}

export function LoadingScreen() {
  const t = useT();
  const locale = useLocale();
  const progress = useLoadingStore((state) => state.progress);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setFactIndex((index) => (index + 1) % SPACE_FACTS.length),
      HUD.factInterval * 1000,
    );
    return () => clearInterval(timer);
  }, []);

  const task = currentTask(progress);
  return (
    <LoadingView
      progress={overallProgress(progress)}
      title={t("app.title")}
      label={task ? t(`loading.tasks.${task}`) : t("loading.title")}
      factTitle={t("loading.didYouKnow")}
      fact={SPACE_FACTS[factIndex][locale]}
    />
  );
}
