"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { BODIES, LOCATION_ORDER, type LocationId } from "@/game/data/planets";
import { MAP_LAYOUT, mapPosition } from "@/game/data/solarSystem";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { beginWarp } from "@/game/systems/simulation";
import { RocketIcon } from "../icons";
import { PlanetIcon } from "../PlanetIcon";
import { GameButton, Panel } from "../primitives";

/** Squash orbits vertically for a tilted, readable "perspective" map. */
const TILT = 0.55;

function iconRadius(id: LocationId): number {
  if (id === "sun") return 0.075;
  return 0.016 + 0.012 * Math.log2(BODIES[id].radius / 100 + 1);
}

export function SolarSystemMap() {
  const t = useT();
  const locale = useLocale();
  const current = useGameStore((state) => state.location);
  const closeMap = useGameStore((state) => state.closeMap);
  const [selected, setSelected] = useState<LocationId>(current === "earth" ? "mars" : current);
  const body = BODIES[selected];
  const isHere = selected === current;

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-40 flex flex-col bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6 short:p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-title"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 id="map-title" className="hud-text font-display text-2xl font-black tracking-[0.18em] short:text-xl">
            {t("map.title")}
          </h2>
          <p className="text-sm text-cyan-100/70 short:hidden">{t("map.hint")}</p>
        </div>
        <GameButton variant="secondary" onClick={closeMap}>
          {t("map.close")}
        </GameButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-stretch gap-4 sm:flex-row short:flex-row">
        <svg
          viewBox="-1.08 -0.62 2.16 1.24"
          className="min-h-0 w-full flex-1"
          role="group"
          aria-label={t("a11y.map")}
        >
          <defs>
            <radialGradient id="map-sun-glow">
              <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle r="0.22" fill="url(#map-sun-glow)" />
          {/* The asteroid belt between Mars and Jupiter, where Ceres orbits. */}
          <ellipse
            rx={MAP_LAYOUT.ceres.orbitRadius}
            ry={MAP_LAYOUT.ceres.orbitRadius * TILT}
            fill="none"
            stroke="#c9b89a"
            strokeOpacity={0.22}
            strokeWidth={0.035}
            strokeDasharray="0.003 0.011"
          />
          {LOCATION_ORDER.filter((id) => id !== "sun").map((id) => (
            <ellipse
              key={`orbit-${id}`}
              rx={MAP_LAYOUT[id].orbitRadius}
              ry={MAP_LAYOUT[id].orbitRadius * TILT}
              fill="none"
              stroke="#7df9ff"
              strokeOpacity={id === selected ? 0.55 : 0.16}
              strokeWidth={id === selected ? 0.004 : 0.0025}
            />
          ))}
          {LOCATION_ORDER.map((id) => {
            const { x, y } = mapPosition(id);
            const radius = iconRadius(id);
            const px = x;
            const py = y * TILT;
            const active = id === selected;
            return (
              <g
                key={id}
                transform={`translate(${px} ${py})`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={localize(BODIES[id].name, locale)}
                className="cursor-pointer outline-none"
                onClick={() => setSelected(id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelected(id);
                }}
              >
                <circle r={radius * 2.4} fill="transparent" />
                {active && (
                  <circle r={radius * 1.7} fill="none" stroke="#ffd84d" strokeWidth="0.005" className="animate-pulse" />
                )}
                <PlanetIcon id={id} x={-radius * 1.3} y={-radius * 1.3} size={radius * 2.6} />
                {id === current && (
                  <path d={`M 0 ${-radius - 0.02} l -0.016 -0.028 l 0.032 0 z`} fill="#7df9ff">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0 0; 0 -0.018; 0 0"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </path>
                )}
                <text
                  y={radius + 0.045}
                  textAnchor="middle"
                  fontSize="0.034"
                  fill={active ? "#ffffff" : "#cfe9ff"}
                  fillOpacity={active ? 1 : 0.75}
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}
                >
                  {localize(BODIES[id].name, locale)}
                </text>
              </g>
            );
          })}
        </svg>

        <Panel className="flex w-full shrink-0 flex-col gap-3 p-5 sm:w-80 short:w-72 short:gap-2 short:p-3">
          <div className="flex items-center gap-4">
            <PlanetIcon id={selected} size={72} />
            <div>
              <h3 className="font-display text-xl font-bold">{localize(body.name, locale)}</h3>
              {isHere && <p className="text-xs font-bold uppercase tracking-widest text-hud">{t("map.youAreHere")}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {selected !== "sun" && (
              <>
                <dt className="text-cyan-100/70">{t("map.distance")}</dt>
                <dd>{localize(body.facts.distance, locale)}</dd>
              </>
            )}
            <dt className="text-cyan-100/70">{t("map.diameter")}</dt>
            <dd>{localize(body.facts.diameter, locale)}</dd>
          </dl>
          <p className="text-sm leading-relaxed text-white/85 short:hidden">{localize(body.facts.funFact, locale)}</p>
          <GameButton icon={<RocketIcon />} onClick={() => beginWarp(selected)} disabled={isHere} className="mt-auto disabled:opacity-40">
            {isHere ? t("map.youAreHere") : t("map.warp", { name: localize(body.name, locale) })}
          </GameButton>
        </Panel>
      </div>
    </motion.div>
  );
}
