"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BODIES, type BodyId } from "@/game/data/planets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { gameEvents } from "@/game/systems/events";
import { PlanetIcon } from "../PlanetIcon";

/** Facts about the body you are orbiting: size, distance, temperature, a fun fact. */
export function PlanetInfoCard() {
  const t = useT();
  const locale = useLocale();
  const [body, setBody] = useState<BodyId | null>(null);
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    const offStart = gameEvents.on("orbitStart", ({ body: next }) => {
      setBody(next);
      setShowReason(false);
    });
    const offEnd = gameEvents.on("orbitEnd", () => setBody(null));
    const offWarp = gameEvents.on("warpStart", () => setBody(null));
    return () => {
      offStart();
      offEnd();
      offWarp();
    };
  }, []);

  const data = body ? BODIES[body] : null;
  return (
    <div className="absolute top-16 left-0 w-80 max-w-[42vw] sm:top-20 short:top-14">
      <AnimatePresence>
        {data && (
          <motion.aside
            key={data.id}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="hud-panel pointer-events-auto flex flex-col gap-2 rounded-2xl p-4 short:gap-1 short:p-3"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <PlanetIcon id={data.id} size={44} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-hud">
                  {t("info.orbiting")}
                </p>
                <h3 className="font-display text-lg font-bold">{localize(data.name, locale)}</h3>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs sm:text-sm">
              <dt className="text-cyan-100/70">{t("info.diameter")}</dt>
              <dd>{localize(data.facts.diameter, locale)}</dd>
              <dt className="text-cyan-100/70">{t("info.distance")}</dt>
              <dd>{localize(data.facts.distance, locale)}</dd>
              <dt className="text-cyan-100/70">{t("info.temperature")}</dt>
              <dd>{localize(data.facts.temperature, locale)}</dd>
            </dl>
            <p className="text-xs leading-relaxed text-white/85 sm:text-sm short:hidden">
              {localize(data.facts.funFact, locale)}
            </p>
            {data.landing.landable ? (
              <p className="text-xs font-bold text-emerald-300">{t("info.landable")}</p>
            ) : (
              <div className="text-xs">
                <button
                  type="button"
                  onClick={() => setShowReason((value) => !value)}
                  className="font-bold text-star underline-offset-2 hover:underline"
                  aria-expanded={showReason}
                >
                  {t("info.notLandable")}
                </button>
                {showReason && <p className="mt-1 leading-relaxed text-white/80">{localize(data.landing.reason, locale)}</p>}
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
