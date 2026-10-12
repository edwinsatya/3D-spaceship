"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { runtime } from "@/game/systems/runtime";
import { formatTime } from "@/game/systems/scoring";
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
  const ringsPassed = useSessionStore((state) => state.ringsPassed);
  const totalRings = useSessionStore((state) => state.totalRings);
  const timer = useRef<HTMLSpanElement>(null);
  const freeObjective = useRef<HTMLSpanElement>(null);

  useHudFrame(() => {
    if (mode === "mission") setText(timer.current, formatTime(runtime.mission.elapsedMs));
    else setText(freeObjective.current, t(runtime.target.kind === "earth" ? "hud.objectiveReturn" : "hud.objectiveFree"));
  });

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="hud-panel flex items-center gap-4 rounded-2xl px-4 py-2">
        {mode === "mission" ? (
          <>
            <div className="flex flex-col gap-1">
              <motion.span
                key={ringsPassed}
                initial={{ scale: 1.25, color: "#9dffb0" }}
                animate={{ scale: 1, color: "#ffffff" }}
                className="font-display text-xs font-bold tracking-widest sm:text-sm"
              >
                {t("hud.objectiveRings", { current: Math.min(ringsPassed + 1, totalRings), total: totalRings })}
              </motion.span>
              <RingPips passed={ringsPassed} total={totalRings} />
            </div>
            <div className="h-8 w-px bg-cyan-200/20" />
            <span
              ref={timer}
              className="hud-text min-w-[5.5ch] font-display text-xl font-bold tabular-nums text-white sm:text-2xl"
              aria-label={t("hud.time")}
            >
              0:00.00
            </span>
          </>
        ) : (
          <span ref={freeObjective} className="font-display text-xs font-bold tracking-widest sm:text-sm">
            {t("hud.objectiveFree")}
          </span>
        )}
      </div>
    </div>
  );
}
