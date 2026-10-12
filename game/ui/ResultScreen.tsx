"use client";

import { animate, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { audio } from "@/game/audio/audioManager";
import { HUD } from "@/game/config/hud";
import { SPACE_FACTS } from "@/game/data/facts";
import { MISSIONS } from "@/game/data/missions";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { formatTime, nextStarTarget } from "@/game/systems/scoring";
import { HomeIcon, RestartIcon } from "./icons";
import { GameButton, Panel, STAR_POP, StarRow } from "./primitives";

const COUNT_UP_SECONDS = HUD.resultCountUp;

/** Time counts up from zero for a bit of drama. */
function AnimatedTime({ timeMs }: { timeMs: number }) {
  const element = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, timeMs, {
      duration: COUNT_UP_SECONDS,
      ease: "easeOut",
      onUpdate: (value) => {
        if (element.current) element.current.textContent = formatTime(value);
      },
    });
    return () => controls.stop();
  }, [timeMs]);
  return (
    <span ref={element} className="tabular-nums">
      {formatTime(0)}
    </span>
  );
}

export function ResultScreen() {
  const t = useT();
  const locale = useLocale();
  const result = useSessionStore((state) => state.result);
  const restart = useGameStore((state) => state.restart);
  const toMenu = useGameStore((state) => state.toMenu);

  useEffect(() => {
    if (!result) return;
    const timers = Array.from({ length: result.stars }, (_, index) =>
      setTimeout(
        () => audio.play("star", { rate: 1 + index * 0.12 }),
        (STAR_POP.delay + index * STAR_POP.stagger) * 1000,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [result]);

  if (!result) return null;
  const next = nextStarTarget(result.stars, MISSIONS[result.missionId].starThresholds);
  // Varies from run to run without impure randomness during render.
  const fact = SPACE_FACTS[Math.floor(result.timeMs / 10) % SPACE_FACTS.length];

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <motion.div initial={{ y: 30, scale: 0.94 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-md">
        <Panel className="flex flex-col items-center gap-4 px-6 py-7 text-center">
          <h2 id="result-title" className="hud-text font-display text-3xl font-black tracking-[0.12em] sm:text-4xl">
            {t("result.title")}
          </h2>
          <StarRow count={result.stars} size="text-6xl" animate label={t("a11y.stars", { count: result.stars })} />
          <div className="flex w-full justify-center gap-8">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-hud">{t("result.time")}</p>
              <p className="font-display text-3xl font-black">
                <AnimatedTime timeMs={result.timeMs} />
              </p>
            </div>
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-hud">{t("result.best")}</p>
              <p className="font-display text-3xl font-black text-white/85 tabular-nums">{formatTime(result.bestTimeMs)}</p>
            </div>
          </div>
          {result.isNewBest && (
            <motion.span
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: -3 }}
              transition={{ delay: COUNT_UP_SECONDS, type: "spring", stiffness: 300, damping: 12 }}
              className="rounded-full bg-star px-4 py-1 font-display text-sm font-black tracking-widest text-slate-900 shadow-[0_0_20px_rgba(255,216,77,0.6)]"
            >
              {t("result.newBest")}
            </motion.span>
          )}
          <p className="text-sm text-cyan-100/85">
            {next
              ? t("result.nextStar", { time: formatTime(next.timeMs), stars: next.stars })
              : t("result.maxStars")}
          </p>
          <div className="w-full rounded-2xl bg-white/5 px-4 py-3 text-left">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-star">
              {t("result.didYouKnow")}
            </p>
            <p className="mt-1 text-sm text-white/85">{fact[locale]}</p>
          </div>
          <div className="flex w-full gap-3">
            <GameButton icon={<RestartIcon />} onClick={restart} className="flex-1" autoFocus>
              {t("result.retry")}
            </GameButton>
            <GameButton variant="secondary" icon={<HomeIcon />} onClick={toMenu} className="flex-1">
              {t("result.menu")}
            </GameButton>
          </div>
        </Panel>
      </motion.div>
    </motion.div>
  );
}
