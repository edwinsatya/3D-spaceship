"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { TOUCH } from "@/game/config/controls";
import { FLIGHT } from "@/game/config/flight";
import { resetTouchControls, touchControls } from "@/game/controls/touch";
import { useT } from "@/game/i18n/useT";
import { clamp01 } from "@/game/systems/math";
import { runtime } from "@/game/systems/runtime";
import { BoltIcon } from "../icons";
import { useHudFrame } from "../useHudFrame";

/** Resting position (px from the bottom-left corner) when not touched. */
const JOYSTICK_REST = 40;

/** Floating joystick: appears where the left thumb lands. */
function Joystick() {
  const t = useT();
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const radius = TOUCH.joystickRadius;

  const place = (x: number | null, y: number | null) => {
    const style = base.current?.style;
    if (!style) return;
    if (x === null || y === null) {
      style.left = `${JOYSTICK_REST}px`;
      style.top = "auto";
      style.bottom = `${JOYSTICK_REST}px`;
    } else {
      style.left = `${x - radius}px`;
      style.top = `${y - radius}px`;
      style.bottom = "auto";
    }
  };
  const moveKnob = (dx: number, dy: number) => {
    knob.current?.style.setProperty("transform", `translate(${dx}px, ${dy}px)`);
  };

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current !== null) return;
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(radius + 8, event.clientX - rect.left);
    const y = Math.min(rect.height - radius - 8, Math.max(radius + 8, event.clientY - rect.top));
    center.current = { x: rect.left + x, y: rect.top + y };
    place(x, y);
    moveKnob(0, 0);
    touchControls.stickActive = true;
    setActive(true);
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointer.current) return;
    let dx = event.clientX - center.current.x;
    let dy = event.clientY - center.current.y;
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    moveKnob(dx, dy);
    touchControls.stickX = dx / radius;
    touchControls.stickY = -dy / radius;
  };

  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointer.current) return;
    pointer.current = null;
    touchControls.stickActive = false;
    touchControls.stickX = 0;
    touchControls.stickY = 0;
    moveKnob(0, 0);
    place(null, null);
    setActive(false);
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-0 left-0 h-[72%] w-[45%] touch-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label={t("a11y.joystick")}
      role="application"
    >
      <div
        ref={base}
        className={`absolute rounded-full border-2 border-cyan-200/40 bg-cyan-300/10 transition-opacity ${active ? "opacity-100" : "opacity-50"}`}
        style={{ width: radius * 2, height: radius * 2, left: JOYSTICK_REST, bottom: JOYSTICK_REST }}
      >
        <div
          ref={knob}
          className="absolute rounded-full bg-cyan-200/80 shadow-[0_0_14px_rgba(125,249,255,0.6)]"
          style={{ width: radius, height: radius, left: radius / 2, top: radius / 2 }}
        />
      </div>
    </div>
  );
}

function ThrottleLever() {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const setFromEvent = (clientY: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    touchControls.throttle = clamp01(1 - (clientY - rect.top) / rect.height);
  };

  useHudFrame(() => {
    const throttle = runtime.input?.input.throttle ?? 0;
    if (fill.current) fill.current.style.transform = `scaleY(${throttle})`;
    if (handle.current) handle.current.style.bottom = `calc(${throttle * 100}% - 18px)`;
  });

  return (
    <div
      ref={track}
      className="pointer-events-auto absolute right-5 bottom-8 h-40 w-14 touch-none rounded-2xl border border-cyan-200/40 bg-white/5 sm:h-48"
      role="slider"
      aria-label={t("a11y.throttle")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(FLIGHT.missionStartThrottle * 100)}
      onPointerDown={(event) => {
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromEvent(event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerId === pointer.current) setFromEvent(event.clientY);
      }}
      onPointerUp={(event) => {
        if (event.pointerId !== pointer.current) return;
        pointer.current = null;
        touchControls.throttle = null;
      }}
      onPointerCancel={() => {
        pointer.current = null;
        touchControls.throttle = null;
      }}
    >
      <div
        ref={fill}
        className="absolute inset-x-1.5 bottom-1.5 top-1.5 origin-bottom rounded-xl bg-gradient-to-t from-cyan-500/70 to-sky-300/70"
        style={{ transform: "scaleY(0)" }}
      />
      <div
        ref={handle}
        className="absolute -inset-x-1.5 h-9 rounded-xl border-2 border-white/80 bg-slate-900/70 shadow-[0_0_12px_rgba(125,249,255,0.5)]"
        style={{ bottom: "-18px" }}
      />
    </div>
  );
}

const RING_RADIUS = 40;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function BoostButton() {
  const t = useT();
  const ring = useRef<SVGCircleElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useHudFrame(() => {
    const boost = runtime.ship.boost;
    ring.current?.setAttribute("stroke-dashoffset", String(RING_LENGTH * (1 - boost.energy)));
    if (button.current) button.current.dataset.active = String(boost.active);
  });

  const release = () => {
    touchControls.boost = false;
  };

  return (
    <button
      ref={button}
      type="button"
      aria-label={t("a11y.boost")}
      className="pointer-events-auto absolute right-24 bottom-10 flex h-24 w-24 touch-none flex-col items-center justify-center rounded-full bg-gradient-to-br from-amber-300/90 to-orange-500/90 font-display text-xs font-black tracking-widest text-slate-950 shadow-[0_0_24px_rgba(255,179,71,0.5)] active:scale-95 data-[active=true]:shadow-[0_0_40px_rgba(255,179,71,0.9)] sm:right-28"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        touchControls.boost = true;
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r={RING_RADIUS} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="6" />
        <circle
          ref={ring}
          cx="48"
          cy="48"
          r={RING_RADIUS}
          fill="none"
          stroke="#fff6d6"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={0}
        />
      </svg>
      <BoltIcon className="text-2xl" />
      {t("hud.boost")}
    </button>
  );
}

export function TouchControls() {
  useEffect(() => resetTouchControls, []);
  return (
    <>
      <Joystick />
      <ThrottleLever />
      <BoostButton />
    </>
  );
}
