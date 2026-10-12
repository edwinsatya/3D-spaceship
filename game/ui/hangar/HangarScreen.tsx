"use client";

import { motion } from "motion/react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { HANGAR } from "@/game/config/hangar";
import {
  DECALS,
  PAINT_COLORS,
  SHIPS,
  TRAIL_COLORS,
  type DecalId,
  type ShipCustomization,
  type ShipDefinition,
} from "@/game/data/ships";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useSelectedShip } from "@/game/stores/useShip";
import { runtime } from "@/game/systems/runtime";
import { RocketIcon } from "../icons";
import { startGame } from "../TitleMenu";
import { GameButton, Panel } from "../primitives";

const STAT_MAX = 5;

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-cyan-100/75">{label}</span>
      <div className="flex gap-1" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={STAT_MAX} aria-valuenow={value}>
        {Array.from({ length: STAT_MAX }, (_, index) => (
          <span
            key={index}
            className={`h-2 w-4 rounded-sm ${index < value ? "bg-hud shadow-[0_0_6px_rgba(125,249,255,0.7)]" : "bg-white/15"}`}
          />
        ))}
      </div>
    </div>
  );
}

function ShipCard({ ship, selected, onSelect }: { ship: ShipDefinition; selected: boolean; onSelect: () => void }) {
  const t = useT();
  const locale = useLocale();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`pointer-events-auto w-full rounded-2xl border px-4 py-3 text-left transition-colors short:py-2 ${
        selected
          ? "border-hud/80 bg-cyan-400/15 shadow-[0_0_18px_rgba(125,249,255,0.25)]"
          : "border-white/10 bg-slate-950/40 hover:border-cyan-200/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-base font-bold tracking-wider">{localize(ship.name, locale)}</span>
        {selected && <span className="text-[10px] font-bold uppercase tracking-widest text-hud">{t("hangar.selected")}</span>}
      </div>
      <p className="mt-0.5 text-xs text-white/70 short:hidden">{localize(ship.description, locale)}</p>
      <div className="mt-2 flex flex-col gap-1 short:mt-1">
        <StatBar label={t("hangar.stats.speed")} value={ship.stats.speed} />
        <StatBar label={t("hangar.stats.handling")} value={ship.stats.handling} />
        <StatBar label={t("hangar.stats.boost")} value={ship.stats.boost} />
      </div>
    </button>
  );
}

function Swatches({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  const t = useT();
  return (
    <fieldset>
      <legend className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-hud">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => {
          const active = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={t("hangar.swatch", { group: label, index: index + 1 })}
              aria-pressed={active}
              className={`pointer-events-auto h-8 w-8 rounded-full border-2 transition-transform active:scale-90 ${
                active ? "scale-110 border-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" : "border-white/20"
              }`}
              style={{ background: color }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

const DECAL_ICONS: Record<DecalId, ReactNode> = {
  none: <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />,
  stripe: <path d="M4 9h16M4 15h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />,
  chevron: <path d="M5 16l7-7 7 7M5 11l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />,
  star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="currentColor" />,
};

function DecalPicker({ value, onChange }: { value: DecalId; onChange: (decal: DecalId) => void }) {
  const t = useT();
  return (
    <fieldset>
      <legend className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-hud">
        {t("hangar.decal")}
      </legend>
      <div className="grid grid-cols-4 gap-2">
        {DECALS.map((decal) => {
          const active = decal === value;
          return (
            <button
              key={decal}
              type="button"
              onClick={() => onChange(decal)}
              aria-pressed={active}
              className={`pointer-events-auto flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] uppercase tracking-wider ${
                active ? "border-hud/80 bg-cyan-400/15 text-white" : "border-white/10 text-white/70 hover:border-cyan-200/40"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                {DECAL_ICONS[decal]}
              </svg>
              {t(`hangar.decals.${decal}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PaintPanel() {
  const t = useT();
  const { ship, paint } = useSelectedShip();
  const setPaint = useProgressStore((state) => state.setPaint);
  const update = (patch: Partial<ShipCustomization>) => setPaint(ship.id, { ...paint, ...patch });
  return (
    <div className="flex flex-col gap-4 short:gap-2">
      <Swatches label={t("hangar.body")} colors={PAINT_COLORS} value={paint.body} onChange={(body) => update({ body })} />
      <Swatches label={t("hangar.accent")} colors={PAINT_COLORS} value={paint.accent} onChange={(accent) => update({ accent })} />
      <DecalPicker value={paint.decal} onChange={(decal) => update({ decal })} />
      <Swatches label={t("hangar.trail")} colors={TRAIL_COLORS} value={paint.trail} onChange={(trail) => update({ trail })} />
    </div>
  );
}

function ShipList() {
  const selected = useProgressStore((state) => state.ships.selected);
  const selectShip = useProgressStore((state) => state.selectShip);
  return (
    <div className="flex flex-col gap-2">
      {SHIPS.map((ship) => (
        <ShipCard key={ship.id} ship={ship} selected={ship.id === selected} onSelect={() => selectShip(ship.id)} />
      ))}
    </div>
  );
}

/** Pointer drags anywhere on the 3D view spin the turntable (with momentum). */
function DragToSpin() {
  const last = useRef<{ x: number; time: number } | null>(null);
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, time: performance.now() };
    runtime.hangar.spin = 0;
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!last.current) return;
    const now = performance.now();
    const dx = event.clientX - last.current.x;
    const dt = Math.max(1, now - last.current.time) / 1000;
    runtime.hangar.angle += dx * HANGAR.dragSensitivity;
    runtime.hangar.spin = ((dx * HANGAR.dragSensitivity) / dt) * 0.5;
    last.current = { x: event.clientX, time: now };
  };
  const onUp = () => {
    last.current = null;
  };
  return (
    <div
      className="pointer-events-auto absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-hidden="true"
    />
  );
}

type Tab = "ships" | "paint";

export function HangarScreen() {
  const t = useT();
  const closeHangar = useGameStore((state) => state.closeHangar);
  const [tab, setTab] = useState<Tab>("ships");

  return (
    <motion.div
      className="absolute inset-0 z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <DragToSpin />
      <div className="pointer-events-none absolute inset-0 flex flex-col p-4 sm:p-6 short:p-3">
        <div className="flex items-center justify-between">
          <h1 className="hud-text font-display text-3xl font-black tracking-[0.18em] short:text-xl">{t("hangar.title")}</h1>
          <p className="hidden text-xs text-white/60 sm:block">{t("hangar.dragHint")}</p>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 items-start justify-between gap-4 short:mt-2">
          {/* Large screens: both panels; small screens: one panel with tabs. */}
          <Panel className="pointer-events-auto hidden max-h-full w-72 overflow-y-auto p-3 lg:block">
            <ShipList />
          </Panel>
          <div className="flex-1" />
          <Panel className="pointer-events-auto max-h-full w-72 overflow-y-auto p-4 short:w-64 short:p-3">
            <div className="mb-3 flex gap-2 lg:hidden" role="tablist">
              {(["ships", "paint"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`flex-1 rounded-xl py-1.5 font-display text-xs font-bold uppercase tracking-widest ${
                    tab === value ? "bg-cyan-400/20 text-white" : "text-white/60"
                  }`}
                >
                  {t(`hangar.${value}`)}
                </button>
              ))}
            </div>
            <div className="lg:hidden">{tab === "ships" ? <ShipList /> : <PaintPanel />}</div>
            <div className="hidden lg:block">
              <PaintPanel />
            </div>
          </Panel>
        </div>

        <div className="mt-4 flex justify-center gap-3 short:mt-2">
          <GameButton variant="secondary" onClick={closeHangar}>
            {t("hangar.done")}
          </GameButton>
          <GameButton icon={<RocketIcon />} onClick={() => startGame("testflight")}>
            {t("hangar.testFlight")}
          </GameButton>
        </div>
      </div>
    </motion.div>
  );
}
