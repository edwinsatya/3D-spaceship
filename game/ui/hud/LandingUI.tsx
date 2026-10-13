"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EXPLORATION } from "@/game/config/exploration";
import { HUD } from "@/game/config/hud";
import { BODIES, type BodyId } from "@/game/data/planets";
import { SURFACES, type PointOfInterest, type SurfaceId } from "@/game/data/surfaces";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { gameEvents } from "@/game/systems/events";
import { landingFade, landingHeat } from "@/game/systems/landing";
import { runtime } from "@/game/systems/runtime";
import { PlanetIcon } from "../PlanetIcon";
import { useHudFrame } from "../useHudFrame";

const POINTS_OF_INTEREST = new Map<string, PointOfInterest>(
  Object.values(SURFACES).flatMap((surface) => surface.pointsOfInterest.map((poi) => [poi.id, poi] as const)),
);

/** Black fade between space and the surface, heat glow on Mars entry, and a caption. */
export function LandingOverlay() {
  const t = useT();
  const fade = useRef<HTMLDivElement>(null);
  const heat = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  const written = useRef({ fade: 0, heat: 0, caption: false });
  const [text, setText] = useState("");

  useEffect(() => {
    const offStart = gameEvents.on("landingStart", ({ body }) =>
      setText(t(body === "mars" ? "landing.descentMars" : "landing.descentMoon")),
    );
    const offTakeOff = gameEvents.on("takeOffStart", () => setText(t("landing.ascent")));
    return () => {
      offStart();
      offTakeOff();
    };
  }, [t]);

  useHudFrame(() => {
    const landing = runtime.landing;
    const timings = EXPLORATION.landing;
    const nextFade = landingFade(landing, timings);
    // No air on the Moon, so no glowing heat shield there (only engine shake).
    const nextHeat = landing.body === "mars" ? landingHeat(landing, timings) : 0;
    const leaving = landing.phase === "descent" || landing.phase === "ascent";
    const fadingOut = landing.phase === "fadeToSurface" || landing.phase === "fadeToSpace";
    const showCaption = leaving || (fadingOut && nextFade < 0.5);
    const state = written.current;
    if (fade.current && Math.abs(nextFade - state.fade) > 0.005) {
      state.fade = nextFade;
      fade.current.style.opacity = String(nextFade);
    }
    if (heat.current && Math.abs(nextHeat - state.heat) > 0.01) {
      state.heat = nextHeat;
      heat.current.style.opacity = String(nextHeat);
    }
    if (caption.current && showCaption !== state.caption) {
      state.caption = showCaption;
      caption.current.style.opacity = showCaption ? "1" : "0";
    }
  });

  return (
    <>
      <div
        ref={heat}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(255,120,40,0.55)_80%,rgba(255,200,120,0.75)_100%)] opacity-0"
      />
      <p
        ref={caption}
        className="hud-text pointer-events-none absolute inset-x-0 top-[34%] px-6 text-center font-display text-lg font-black tracking-widest opacity-0 sm:text-2xl"
        role="status"
      >
        {text}
      </p>
      <div ref={fade} className="pointer-events-none absolute inset-0 bg-black opacity-0" />
    </>
  );
}

/** "Landed on Mars!" with the real place name. */
export function LandingBanner() {
  const t = useT();
  const locale = useLocale();
  const [landed, setLanded] = useState<{ body: SurfaceId; first: boolean } | null>(null);

  useEffect(() => gameEvents.on("landed", (payload) => setLanded(payload)), []);
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setLanded(null), HUD.landedDuration);
    return () => clearTimeout(timer);
  }, [landed]);

  return (
    <AnimatePresence>
      {landed && (
        <motion.div
          key={landed.body}
          initial={{ y: -20, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="hud-panel flex items-center gap-4 rounded-3xl border-success/60 px-6 py-4 shadow-[0_0_40px_color-mix(in_srgb,var(--color-success)_20%,transparent)] short:max-w-[36vw] short:gap-3 short:px-4 short:py-2"
          role="status"
        >
          <div className="shrink-0 short:*:size-10">
            <PlanetIcon id={landed.body} size={56} />
          </div>
          <div>
            {landed.first && (
              <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-star">
                {t("landing.firstLanding")}
              </p>
            )}
            <p className="hud-text font-display text-2xl font-black tracking-wider sm:text-3xl short:text-lg">
              {t("landing.landed", { name: localize(BODIES[landed.body].name, locale) })}
            </p>
            <p className="text-sm text-cyan-100/80 short:hidden">
              {t("landing.welcome", { place: localize(SURFACES[landed.body].place, locale) })}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The scientific reason you can't land on the Sun, Venus, gas giants… */
export function LandingRefusedCard() {
  const t = useT();
  const locale = useLocale();
  const [body, setBody] = useState<BodyId | null>(null);

  useEffect(() => gameEvents.on("landingRefused", ({ body: next }) => setBody(next)), []);
  useEffect(() => {
    if (!body) return;
    const timer = setTimeout(() => setBody(null), HUD.refusedDuration);
    return () => clearTimeout(timer);
  }, [body]);

  const data = body ? BODIES[body] : null;
  const reason = data && !data.landing.landable ? localize(data.landing.reason, locale) : "";
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.id}
          initial={{ y: 20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="hud-panel pointer-events-auto flex max-w-md items-start gap-4 rounded-3xl border-star/60 p-5 short:max-w-[44vw] short:gap-3 short:p-3"
          role="alert"
        >
          <div className="shrink-0 short:hidden">
            <PlanetIcon id={data.id} size={52} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-display text-base font-black tracking-wide text-star sm:text-lg">
              {t("landing.refusedTitle", { name: localize(data.name, locale) })}
            </p>
            <p className="text-sm leading-relaxed text-white/90 short:text-xs">{reason}</p>
            <button
              type="button"
              onClick={() => setBody(null)}
              className="self-end rounded-xl border border-cyan-200/40 bg-white/10 px-4 py-1.5 font-display text-xs font-bold tracking-wider hover:bg-white/20 active:scale-95"
            >
              {t("landing.ok")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Fact card when you reach the Apollo 11 site, Perseverance, Ingenuity… */
export function PointOfInterestCard() {
  const t = useT();
  const locale = useLocale();
  const [visit, setVisit] = useState<{ id: string; first: boolean } | null>(null);
  const onSurface = useGameStore((state) => state.surface !== null);

  useEffect(() => {
    const offVisit = gameEvents.on("pointOfInterest", (payload) => setVisit(payload));
    const offTakeOff = gameEvents.on("takeOffStart", () => setVisit(null));
    return () => {
      offVisit();
      offTakeOff();
    };
  }, []);
  useEffect(() => {
    if (!visit) return;
    const timer = setTimeout(() => setVisit(null), HUD.pointOfInterestDuration);
    return () => clearTimeout(timer);
  }, [visit]);

  const poi = visit && onSurface ? POINTS_OF_INTEREST.get(visit.id) : undefined;
  return (
    <div className="absolute top-16 left-0 w-80 max-w-[42vw] sm:top-20 short:top-[4.5rem] short:max-w-[30vw]">
      <AnimatePresence>
        {poi && visit && (
          <motion.aside
            key={poi.id}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="hud-panel pointer-events-none flex flex-col gap-2 rounded-2xl p-4 short:gap-1 short:p-3"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.25em] text-success">
                {t("landing.pointOfInterest")}
              </p>
              {visit.first && (
                <span className="rounded-full bg-star px-2 py-0.5 font-display text-[0.625rem] font-black text-slate-900">
                  {t("landing.newSite")}
                </span>
              )}
            </div>
            <h3 className="font-display text-lg font-bold leading-tight">{localize(poi.name, locale)}</h3>
            <p className="text-xs leading-relaxed text-white/85 sm:text-sm">{localize(poi.fact, locale)}</p>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
