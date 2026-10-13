"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { MISSION_ORDER, MISSIONS, ROUTE_ORDER, ROUTES, type MissionDefinition, type MissionId } from "@/game/data/missions";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useProgressStore, totalStars, type MissionProgress } from "@/game/stores/progressStore";
import { useUiStore } from "@/game/stores/uiStore";
import { formatTime } from "@/game/systems/scoring";
import { LockIcon, RocketIcon } from "../icons";
import { MISSION_UNLOCKS } from "@/game/data/unlocks";
import { missionUnlocked } from "@/game/systems/unlocks";
import { PlanetIcon } from "../PlanetIcon";
import { GameButton, Panel, StarRow } from "../primitives";
import { startGame } from "../TitleMenu";

const MAX_STARS = MISSION_ORDER.length * 3;

/** Best result in the mission's own unit (time or photo score). */
function formatBest(mission: MissionDefinition, progress: MissionProgress | undefined): string | null {
  if (progress?.best == null) return null;
  return mission.rating.kind === "time" ? formatTime(progress.best) : String(Math.round(progress.best));
}

function MissionDetail({ mission, locked }: { mission: MissionDefinition; locked: number }) {
  const t = useT();
  const locale = useLocale();
  const progress = useProgressStore((state) => state.missions[mission.id]);
  const close = useUiStore((state) => state.closeMissions);
  const best = formatBest(mission, progress);
  const { rating } = mission;
  const goal = (stars: 2 | 3) => {
    const threshold = stars === 3 ? rating.three : rating.two;
    return rating.kind === "time"
      ? t("missions.goalTime", { stars, time: formatTime(threshold * 1000).slice(0, -3) })
      : t("missions.goalScore", { stars, score: threshold });
  };

  return (
    <motion.div key={mission.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 short:gap-2">
      <div className="flex items-center gap-4">
        <PlanetIcon id={ROUTES[mission.route].icon} size={64} />
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.25em] text-hud">
            {t(`missions.objective.${mission.objective.type}`)} · {localize(ROUTES[mission.route].name, locale)}
          </p>
          <h3 className="font-display text-2xl font-bold short:text-xl">{localize(mission.name, locale)}</h3>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-white/90">{localize(mission.description, locale)}</p>
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3">
        <div>
          <p className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-hud">{t("missions.best")}</p>
          <p className="font-display text-xl font-bold tabular-nums">{best ?? t("missions.noBest")}</p>
        </div>
        <StarRow count={progress?.bestStars ?? 0} label={t("a11y.stars", { count: progress?.bestStars ?? 0 })} />
      </div>
      <div className="text-sm">
        <p className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-star">{t("missions.goals")}</p>
        <ul className="mt-1 flex flex-col gap-0.5 text-white/85">
          <li>{goal(3)}</li>
          <li>{goal(2)}</li>
          <li>{t("missions.goalFinish")}</li>
        </ul>
      </div>
      {locked > 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-star/40 bg-star/10 px-4 py-3 font-display text-sm font-bold text-star">
          <LockIcon /> {t("missions.unlockAt", { stars: locked })}
        </p>
      ) : (
        <GameButton
          icon={<RocketIcon />}
          onClick={() => {
            close();
            startGame("mission", mission.id);
          }}
          autoFocus
        >
          {t("missions.start")}
        </GameButton>
      )}
    </motion.div>
  );
}

/** Every mission, grouped by route, with best results and star goals. */
export function MissionSelect() {
  const t = useT();
  const locale = useLocale();
  const progress = useProgressStore((state) => state.missions);
  const selected = useUiStore((state) => state.missions.selected);
  const select = useUiStore((state) => state.selectMission);
  const close = useUiStore((state) => state.closeMissions);
  const current: MissionId = selected ?? MISSION_ORDER[0];
  const owned = totalStars(progress);
  const lockOf = (id: MissionId) => (missionUnlocked(id, owned) ? 0 : MISSION_UNLOCKS[id]);

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
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm short:p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="missions-title"
    >
      <Panel className="flex max-h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="missions-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
              {t("missions.title")}
            </h2>
            <p className="text-sm text-cyan-100/75">{t("missions.stars", { count: owned, total: MAX_STARS })}</p>
          </div>
          <GameButton variant="secondary" onClick={close}>
            {t("missions.close")}
          </GameButton>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row short:flex-row">
          <div className="flex shrink-0 flex-col gap-3 overflow-y-auto sm:w-[20rem] short:w-[17rem] short:gap-2">
            {ROUTE_ORDER.map((routeId) => {
              const missions = MISSION_ORDER.filter((id) => MISSIONS[id].route === routeId);
              if (missions.length === 0) return null;
              return (
                <section key={routeId} className="flex flex-col gap-1.5">
                  <h3 className="flex items-center gap-2 font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-cyan-100/70">
                    <PlanetIcon id={ROUTES[routeId].icon} size={18} />
                    {localize(ROUTES[routeId].name, locale)}
                  </h3>
                  {missions.map((id) => {
                    const active = id === current;
                    const stars = progress[id]?.bestStars ?? 0;
                    const locked = lockOf(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => select(id)}
                        aria-pressed={active}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition-colors ${
                          active ? "border-hud/80 bg-cyan-400/15" : "border-white/10 hover:border-cyan-200/40"
                        }`}
                      >
                        <span className={`font-semibold ${locked > 0 ? "text-white/50" : ""}`}>{localize(MISSIONS[id].name, locale)}</span>
                        {locked > 0 ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-star">
                            <LockIcon /> {locked}★
                          </span>
                        ) : (
                          <StarRow count={stars} size="text-sm" label={t("a11y.stars", { count: stars })} />
                        )}
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <MissionDetail mission={MISSIONS[current]} locked={lockOf(current)} />
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
