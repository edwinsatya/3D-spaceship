"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { BODIES, BODY_ORDER, type BodyId } from "@/game/data/planets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useProgressStore } from "@/game/stores/progressStore";
import { useUiStore } from "@/game/stores/uiStore";
import { PlanetIcon } from "../PlanetIcon";
import { GameButton, Panel } from "../primitives";

function EntryDetail({ id, unlocked }: { id: BodyId; unlocked: boolean }) {
  const t = useT();
  const locale = useLocale();
  const body = BODIES[id];
  const name = localize(body.name, locale);
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 short:gap-2"
    >
      <div className="flex items-center gap-4">
        <PlanetIcon id={id} size={88} dimmed={!unlocked} />
        <div>
          <h3 className="font-display text-2xl font-bold short:text-xl">{name}</h3>
          {!unlocked && <p className="text-xs font-bold uppercase tracking-widest text-white/50">{t("encyclopedia.locked")}</p>}
        </div>
      </div>
      {unlocked ? (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-cyan-100/70">{t("info.diameter")}</dt>
            <dd>{localize(body.facts.diameter, locale)}</dd>
            <dt className="text-cyan-100/70">{t("info.distance")}</dt>
            <dd>{localize(body.facts.distance, locale)}</dd>
            <dt className="text-cyan-100/70">{t("info.temperature")}</dt>
            <dd>{localize(body.facts.temperature, locale)}</dd>
          </dl>
          <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/90">
            {localize(body.facts.funFact, locale)}
          </p>
          {body.landing.landable ? (
            <p className="text-sm font-bold text-success">{t("info.landable")}</p>
          ) : (
            <div className="text-sm">
              <p className="font-bold text-star">{t("info.notLandable")}</p>
              <p className="mt-1 leading-relaxed text-white/80">{localize(body.landing.reason, locale)}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-white/70">{t("encyclopedia.lockedHint", { name })}</p>
      )}
    </motion.div>
  );
}

/** Collection of every body: unlocked by visiting it in Free Flight. */
export function Encyclopedia() {
  const t = useT();
  const locale = useLocale();
  const discovered = useProgressStore((state) => state.discovered);
  const selected = useUiStore((state) => state.encyclopedia.selected);
  const selectEntry = useUiStore((state) => state.selectEntry);
  const close = useUiStore((state) => state.closeEncyclopedia);
  const current = selected ?? discovered[discovered.length - 1] ?? "earth";

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
      aria-labelledby="encyclopedia-title"
    >
      <Panel className="flex max-h-full w-full max-w-4xl flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="encyclopedia-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
              {t("encyclopedia.title")}
            </h2>
            <p className="text-sm text-cyan-100/75">
              {t("encyclopedia.progress", { count: discovered.length, total: BODY_ORDER.length })}
            </p>
          </div>
          <GameButton variant="secondary" onClick={close}>
            {t("encyclopedia.close")}
          </GameButton>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row short:flex-row">
          <div className="grid shrink-0 grid-cols-5 content-start gap-2 sm:w-[22rem] short:w-[18rem]">
            {BODY_ORDER.map((id) => {
              const unlocked = discovered.includes(id);
              const active = id === current;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectEntry(id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-[0.625rem] transition-colors ${
                    active ? "border-hud/80 bg-cyan-400/15" : "border-white/10 hover:border-cyan-200/40"
                  }`}
                >
                  <PlanetIcon id={id} size={40} dimmed={!unlocked} />
                  <span className={unlocked ? "text-white" : "text-white/45"}>{localize(BODIES[id].name, locale)}</span>
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <EntryDetail id={current} unlocked={discovered.includes(current)} />
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
