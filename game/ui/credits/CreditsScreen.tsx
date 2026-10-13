"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { ASSET_CREDITS, LIBRARY_CREDITS } from "@/game/data/credits";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useUiStore } from "@/game/stores/uiStore";
import { GameButton, Panel } from "../primitives";

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-hud underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

/** Who made what: textures, fonts and open-source libraries, with their licences. */
export function CreditsScreen() {
  const t = useT();
  const locale = useLocale();
  const close = useUiStore((state) => state.closeCredits);

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
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm short:p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-title"
    >
      <Panel className="flex max-h-full w-full max-w-3xl flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="credits-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
            {t("credits.title")}
          </h2>
          <GameButton variant="secondary" onClick={close}>
            {t("credits.close")}
          </GameButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-sm">
          <p className="text-white/80">{t("credits.intro")}</p>
          <h3 className="mt-4 font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-star">{t("credits.assets")}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {ASSET_CREDITS.map((credit) => (
              <li key={credit.name} className="rounded-2xl bg-white/5 px-4 py-3">
                <p className="font-semibold">
                  <ExternalLink href={credit.url}>{credit.name}</ExternalLink>
                </p>
                <p className="text-xs text-white/75">
                  {credit.author} ·{" "}
                  {credit.licenseUrl ? <ExternalLink href={credit.licenseUrl}>{credit.license}</ExternalLink> : credit.license}
                </p>
                <p className="mt-0.5 text-xs text-white/60">{localize(credit.use, locale)}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-star">{t("credits.libraries")}</h3>
          <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {LIBRARY_CREDITS.map((credit) => (
              <li key={credit.name} className="text-xs">
                <ExternalLink href={credit.url}>{credit.name}</ExternalLink> <span className="text-white/55">· {credit.license}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-star">{t("credits.facts")}</h3>
          <p className="mt-1 text-xs text-white/75">{t("credits.factsBody")}</p>
          <h3 className="mt-4 font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-star">{t("credits.made")}</h3>
          <p className="mt-1 text-xs text-white/75">{t("credits.madeBody")}</p>
        </div>
      </Panel>
    </motion.div>
  );
}
