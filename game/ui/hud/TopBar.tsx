"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { MISSIONS } from "@/game/data/missions";
import { PHOTO_TARGETS } from "@/game/data/photoTargets";
import { BODIES } from "@/game/data/planets";
import { SURFACES } from "@/game/data/surfaces";
import { useProgressStore } from "@/game/stores/progressStore";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { runtime } from "@/game/systems/runtime";
import { formatTime } from "@/game/systems/scoring";
import { GameButton } from "../primitives";
import { setText, useHudFrame } from "../useHudFrame";

function RingPips({ passed, total }: { passed: number; total: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 w-3 rounded-full transition-colors duration-300 sm:w-4 ${
            index < passed
              ? "bg-emerald-300 shadow-[0_0_6px_rgba(110,255,170,0.8)]"
              : index === passed
                ? "animate-pulse bg-star"
                : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

/** Objective, ring progress and race timer. */
export function TopBar() {
  const t = useT();
  const mode = useGameStore((state) => state.mode);
  const done = useSessionStore((state) => state.objectiveDone);
  const total = useSessionStore((state) => state.objectiveTotal);
  const carrying = useSessionStore((state) => state.carrying);
  const missionId = useGameStore((state) => state.missionId);
  const endTestFlight = useGameStore((state) => state.endTestFlight);
  const location = useGameStore((state) => state.location);
  const surface = useGameStore((state) => state.surface);
  const locale = useLocale();
  const objective = MISSIONS[missionId].objective;
  const timed = MISSIONS[missionId].rating.kind === "time";
  const missionText =
    objective.type === "photo"
      ? t("hud.objectivePhoto", { name: localize(PHOTO_TARGETS[objective.target].name, locale) })
      : objective.type === "collect"
        ? t("hud.objectiveCollect", { done, total })
        : objective.type === "delivery"
          ? t(carrying ? "hud.objectiveDock" : "hud.objectivePickup", { done, total })
          : t("hud.objectiveRings", { current: Math.min(done + 1, total), total });
  const placeName = localize(BODIES[location].name, locale);
  const surfaceText = () => {
    if (!surface) return null;
    const sites = SURFACES[surface].pointsOfInterest;
    const seen = useProgressStore.getState().pointsOfInterest;
    let visited = 0;
    for (const site of sites) if (seen.includes(site.id)) visited++;
    if (visited === sites.length) return t("hud.objectiveSurfaceDone");
    return t("hud.objectiveSurface", { place: localize(SURFACES[surface].place, locale), visited, total: sites.length });
  };
  const objectiveText = (returning: boolean) =>
    surfaceText() ??
    (returning
      ? t("hud.objectiveReturn", { name: placeName })
      : location === "earth"
        ? t("hud.objectiveFree")
        : t("hud.objectiveExplore", { name: placeName }));
  const timer = useRef<HTMLSpanElement>(null);
  const freeObjective = useRef<HTMLSpanElement>(null);

  useHudFrame(() => {
    if (mode === "mission") setText(timer.current, formatTime(runtime.mission.elapsedMs));
    else if (mode === "testflight") setText(timer.current, formatTime(runtime.testFlightRemaining * 1000).slice(0, -3));
    else setText(freeObjective.current, objectiveText(runtime.target.returning));
  });

  if (mode === "testflight") {
    return (
      <div className="hud-panel flex items-center gap-3 rounded-2xl py-1.5 pr-1.5 pl-4">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-hud">{t("hud.testFlight")}</span>
        <span ref={timer} className="hud-text min-w-[4ch] font-display text-xl font-bold tabular-nums">
          0:45
        </span>
        <GameButton variant="secondary" onClick={endTestFlight} className="!min-h-9 !px-3 !py-1 !text-xs">
          {t("hud.backToHangar")}
        </GameButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="hud-panel flex items-center gap-4 rounded-2xl px-4 py-2">
        {mode === "mission" ? (
          <>
            <div className="flex flex-col gap-1">
              <motion.span
                key={done}
                initial={{ scale: 1.25, color: "#9dffb0" }}
                animate={{ scale: 1, color: "#ffffff" }}
                className="font-display text-xs font-bold tracking-widest sm:text-sm"
              >
                {missionText}
              </motion.span>
              {timed && <RingPips passed={done} total={total} />}
            </div>
            {timed && (
              <>
                <div className="h-8 w-px bg-cyan-200/20" />
                <span
                  ref={timer}
                  className="hud-text min-w-[5.5ch] font-display text-xl font-bold tabular-nums text-white sm:text-2xl"
                  aria-label={t("hud.time")}
                >
                  0:00.00
                </span>
              </>
            )}
          </>
        ) : (
          <span
            ref={freeObjective}
            className="block max-w-[44vw] truncate font-display text-xs font-bold tracking-widest sm:text-sm short:text-[11px]"
          >
            {objectiveText(false)}
          </span>
        )}
      </div>
    </div>
  );
}
