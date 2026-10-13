"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { BADGES } from "@/game/data/badges";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useProgressStore } from "@/game/stores/progressStore";
import { useUiStore } from "@/game/stores/uiStore";
import { GameButton, Panel } from "../primitives";
import { BadgeIcon } from "./BadgeIcon";

/** Every badge, earned ones lit up. */
export function BadgesScreen() {
  const t = useT();
  const locale = useLocale();
  const earned = useProgressStore((state) => state.badges);
  const close = useUiStore((state) => state.closeBadges);

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
      aria-labelledby="badges-title"
    >
      <Panel className="flex max-h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="badges-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
              {t("badges.title")}
            </h2>
            <p className="text-sm text-cyan-100/75">{t("badges.count", { count: earned.length, total: BADGES.length })}</p>
          </div>
          <GameButton variant="secondary" onClick={close}>
            {t("badges.close")}
          </GameButton>
        </div>
        <ul className="grid min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 short:grid-cols-3">
          {BADGES.map((badge) => {
            const has = earned.includes(badge.id);
            return (
              <li
                key={badge.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 short:p-2 ${
                  has ? "border-star/50 bg-star/10" : "border-white/10 bg-white/5"
                }`}
              >
                <BadgeIcon icon={badge.icon} size={44} earned={has} />
                <div className="min-w-0">
                  <p className={`font-display text-sm font-bold ${has ? "text-white" : "text-white/60"}`}>{localize(badge.name, locale)}</p>
                  <p className="text-xs leading-snug text-white/70">{localize(badge.description, locale)}</p>
                  <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest ${has ? "text-star" : "text-white/35"}`}>
                    {has ? t("badges.earned") : t("badges.locked")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </motion.div>
  );
}
