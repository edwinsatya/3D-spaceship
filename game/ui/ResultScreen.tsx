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
import { localize } from "@/game/i18n";
import { useUiStore } from "@/game/stores/uiStore";
import { BODIES } from "@/game/data/planets";
import { SHIPS_BY_ID } from "@/game/data/ships";
import type { UnlockItem } from "@/game/systems/unlocks";
import { PlanetIcon } from "./PlanetIcon";
import { formatTime, nextStarGoal } from "@/game/systems/scoring";
import { HomeIcon, RestartIcon, RocketIcon } from "./icons";
import { GameButton, Panel, STAR_POP, StarRow } from "./primitives";

const COUNT_UP_SECONDS = HUD.resultCountUp;

const formatScore = (score: number) => String(Math.round(score));

/** One chip per newly unlocked item: a colour dot or icon and a short label. */
function UnlockChip({ item }: { item: UnlockItem }) {
  const t = useT();
  const locale = useLocale();
  const label =
    item.kind === "mission"
      ? t("unlock.mission", { name: localize(MISSIONS[item.id].name, locale) })
      : item.kind === "ship"
        ? t("unlock.ship", { name: localize(SHIPS_BY_ID[item.id].name, locale) })
        : item.kind === "decal"
          ? t("unlock.decal", { name: t(`hangar.decals.${item.id}`) })
          : item.kind === "location"
            ? t("unlock.location", { name: localize(BODIES[item.id].name, locale) })
            : t(item.kind === "paint" ? "unlock.paint" : "unlock.trail");
  return (
    <li className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-xs font-semibold">
      {item.kind === "paint" || item.kind === "trail" ? (
        <span className="h-5 w-5 rounded-full border border-white/40" style={{ background: item.color }} />
      ) : item.kind === "location" ? (
        <PlanetIcon id={item.id} size={20} />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-star text-[11px] text-slate-900">★</span>
      )}
      {label}
    </li>
  );
}

/** Time (or score) counts up from zero for a bit of drama. */
function AnimatedValue({ value, format }: { value: number; format: (value: number) => string }) {
  const element = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: COUNT_UP_SECONDS,
      ease: "easeOut",
      onUpdate: (current) => {
        if (element.current) element.current.textContent = format(current);
      },
    });
    return () => controls.stop();
  }, [value, format]);
  return (
    <span ref={element} className="tabular-nums">
      {format(0)}
    </span>
  );
}

export function ResultScreen() {
  const t = useT();
  const locale = useLocale();
  const result = useSessionStore((state) => state.result);
  const restart = useGameStore((state) => state.restart);
  const toMenu = useGameStore((state) => state.toMenu);
  const openMissions = useUiStore((state) => state.openMissions);

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
  const mission = MISSIONS[result.missionId];
  const timed = mission.rating.kind === "time";
  const next = nextStarGoal(result.stars, mission.rating);
  // Varies from run to run without impure randomness during render.
  const fact = SPACE_FACTS[Math.floor(result.value / 10) % SPACE_FACTS.length];
  const showMissions = () => {
    toMenu();
    openMissions(result.missionId);
  };

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
        <Panel className="flex flex-col items-center gap-4 px-6 py-7 text-center short:gap-2 short:py-4">
          <div>
            <h2 id="result-title" className="hud-text font-display text-3xl font-black tracking-[0.12em] sm:text-4xl short:text-2xl">
              {t("result.title")}
            </h2>
            <p className="mt-1 font-display text-sm tracking-widest text-cyan-100/80">{localize(mission.name, locale)}</p>
          </div>
          {result.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- the mission photo (local object URL)
            <img src={result.photoUrl} alt="" className="max-h-40 w-full rounded-2xl object-cover short:max-h-24" />
          )}
          <StarRow count={result.stars} size="text-6xl short:text-4xl" animate label={t("a11y.stars", { count: result.stars })} />
          <div className="flex w-full justify-center gap-8">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-hud">
                {timed ? t("result.time") : t("result.score")}
              </p>
              <p className="font-display text-3xl font-black">
                <AnimatedValue value={result.value} format={timed ? formatTime : formatScore} />
              </p>
            </div>
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-hud">{t("result.best")}</p>
              <p className="font-display text-3xl font-black text-white/85 tabular-nums">
                {timed ? formatTime(result.best) : formatScore(result.best)}
              </p>
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
          {result.unlocked.length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: COUNT_UP_SECONDS + 0.3, type: "spring", stiffness: 260, damping: 18 }}
              className="w-full rounded-2xl border border-star/40 bg-star/10 px-4 py-3"
            >
              <p className="font-display text-xs font-black uppercase tracking-[0.25em] text-star">{t("result.unlocked")}</p>
              <ul className="mt-2 flex flex-wrap justify-center gap-2">
                {result.unlocked.map((item) => (
                  <UnlockChip key={`${item.kind}:${"id" in item ? item.id : item.color}`} item={item} />
                ))}
              </ul>
            </motion.div>
          )}
          <p className="text-sm text-cyan-100/85">
            {!next
              ? t("result.maxStars")
              : timed
                ? t("result.nextStar", { time: formatTime(next.value), stars: next.stars })
                : t("result.nextStarScore", { score: next.value, stars: next.stars })}
          </p>
          <div className="w-full rounded-2xl bg-white/5 px-4 py-3 text-left short:hidden">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-star">
              {t("result.didYouKnow")}
            </p>
            <p className="mt-1 text-sm text-white/85">{fact[locale]}</p>
          </div>
          <div className="flex w-full gap-3">
            <GameButton icon={<RestartIcon />} onClick={restart} className="flex-1" autoFocus>
              {t("result.retry")}
            </GameButton>
            <GameButton variant="secondary" icon={<RocketIcon />} onClick={showMissions} className="flex-1">
              {t("result.missions")}
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
