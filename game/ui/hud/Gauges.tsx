"use client";

import { useEffect, useRef } from "react";
import { HUD } from "@/game/config/hud";
import { useLocale, useT } from "@/game/i18n/useT";
import { gameEvents } from "@/game/systems/events";
import { runtime } from "@/game/systems/runtime";
import { BoltIcon } from "../icons";
import { setText, useHudFrame } from "../useHudFrame";
import { formatNumber, speedToKmh } from "./format";

export function SpeedGauge({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const value = useRef<HTMLSpanElement>(null);
  const speedBar = useRef<HTMLDivElement>(null);
  const throttleMark = useRef<HTMLDivElement>(null);
  const lastKmh = useRef(-1);

  useHudFrame(() => {
    const kmh = speedToKmh(runtime.ship.speed);
    if (kmh !== lastKmh.current) {
      lastKmh.current = kmh;
      setText(value.current, formatNumber(kmh, locale));
    }
    if (speedBar.current) speedBar.current.style.transform = `scaleX(${Math.min(1, runtime.ship.speed / runtime.flight.boostSpeed)})`;
    if (throttleMark.current) {
      const throttle = runtime.input?.input.throttle ?? 0;
      const position = (throttle * runtime.flight.maxSpeed) / runtime.flight.boostSpeed;
      throttleMark.current.style.left = `${position * 100}%`;
    }
  });

  return (
    <div className={`hud-panel rounded-2xl ${compact ? "px-3 py-1.5" : "px-4 py-2.5"}`}>
      <p className="font-display text-[0.625rem] font-bold uppercase tracking-[0.25em] text-hud">{t("hud.speed")}</p>
      <p className="flex items-baseline gap-1.5">
        <span
          ref={value}
          className={`hud-text font-display font-black tabular-nums ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}
        >
          0
        </span>
        <span className="text-xs text-cyan-100/70">{t("hud.speedUnit")}</span>
      </p>
      <div className={`relative mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 ${compact ? "w-28" : "w-40"}`}>
        <div
          ref={speedBar}
          className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-boost"
          style={{ transform: "scaleX(0)" }}
        />
        <div ref={throttleMark} className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: "0%" }} />
      </div>
    </div>
  );
}

export function BoostGauge() {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const state = useRef({ low: false, active: false });

  useEffect(
    () =>
      gameEvents.on("boostDenied", () => {
        root.current?.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 260 },
        );
      }),
    [],
  );

  useHudFrame(() => {
    const boost = runtime.ship.boost;
    if (fill.current) fill.current.style.transform = `scaleX(${boost.energy})`;
    const low = boost.energy < HUD.lowBoost;
    if (root.current && low !== state.current.low) {
      state.current.low = low;
      root.current.dataset.low = String(low);
    }
    if (root.current && boost.active !== state.current.active) {
      state.current.active = boost.active;
      root.current.dataset.active = String(boost.active);
    }
  });

  return (
    <div
      ref={root}
      className="group hud-panel rounded-2xl px-4 py-2.5 data-[active=true]:border-boost/80 data-[active=true]:shadow-[0_0_20px_rgba(255,179,71,0.45)]"
    >
      <p className="flex items-center gap-1 font-display text-[0.625rem] font-bold uppercase tracking-[0.25em] text-boost">
        <BoltIcon /> {t("hud.boost")}
      </p>
      <div className="mt-1.5 h-2.5 w-40 overflow-hidden rounded-full bg-white/10 group-data-[low=true]:animate-pulse">
        <div
          ref={fill}
          className="h-full origin-left rounded-full bg-gradient-to-r from-amber-300 to-boost shadow-[0_0_10px_rgba(255,179,71,0.8)] group-data-[low=true]:from-danger group-data-[low=true]:to-danger"
          style={{ transform: "scaleX(1)" }}
        />
      </div>
    </div>
  );
}
