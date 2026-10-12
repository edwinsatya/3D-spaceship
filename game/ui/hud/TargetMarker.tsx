"use client";

import { useRef } from "react";
import { useLocale, useT } from "@/game/i18n/useT";
import { runtime, type TargetKind } from "@/game/systems/runtime";
import { setText, useHudFrame } from "../useHudFrame";
import { distanceToKm, formatNumber } from "./format";

const KIND_COLORS: Record<TargetKind, string> = {
  ring: "#ffd84d",
  body: "#7df9ff",
  poi: "#9dffb0",
};

/**
 * Points at the current objective: a bracket around it when on screen,
 * an arrow on the screen edge when it is off screen or behind the camera.
 */
export function TargetMarker() {
  const t = useT();
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const bracket = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const last = useRef({ visible: false, onScreen: true, kind: "" as string, km: -1 });

  useHudFrame(() => {
    const target = runtime.target;
    const element = root.current;
    if (!element) return;
    if (target.visible !== last.current.visible) {
      last.current.visible = target.visible;
      element.style.display = target.visible ? "block" : "none";
    }
    if (!target.visible) return;

    const x = ((target.x + 1) / 2) * window.innerWidth;
    const y = ((1 - target.y) / 2) * window.innerHeight;
    element.style.transform = `translate(${x}px, ${y}px)`;

    if (target.onScreen !== last.current.onScreen) {
      last.current.onScreen = target.onScreen;
      if (bracket.current) bracket.current.style.display = target.onScreen ? "block" : "none";
      if (arrow.current) arrow.current.style.display = target.onScreen ? "none" : "block";
    }
    if (!target.onScreen && arrow.current) arrow.current.style.transform = `rotate(${-target.angle}rad)`;
    if (target.kind !== last.current.kind) {
      last.current.kind = target.kind;
      element.style.color = KIND_COLORS[target.kind];
    }
    const km = distanceToKm(target.distance);
    if (km !== last.current.km) {
      last.current.km = km;
      setText(label.current, `${formatNumber(km, locale)} ${t("hud.distanceUnit")}`);
    }
  });

  return (
    <div ref={root} className="absolute top-0 left-0" style={{ display: "none" }} aria-hidden="true">
      <div ref={bracket} className="absolute -translate-x-1/2 -translate-y-1/2">
        <svg width="56" height="56" viewBox="0 0 56 56" className="drop-shadow-[0_0_6px_currentColor]">
          <path
            d="M4 16V4h12M40 4h12v12M52 40v12H40M16 52H4V40"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div ref={arrow} className="absolute" style={{ display: "none" }}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          className="-translate-x-1/2 -translate-y-1/2 animate-pulse drop-shadow-[0_0_8px_currentColor]"
        >
          <path d="M8 8l26 12L8 32l6-12z" fill="currentColor" />
        </svg>
      </div>
      <span
        ref={label}
        className="absolute top-8 left-0 -translate-x-1/2 font-display text-xs font-bold whitespace-nowrap tabular-nums text-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
      />
    </div>
  );
}
