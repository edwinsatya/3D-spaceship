"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HUD } from "@/game/config/hud";
import { BODIES, type LocationId } from "@/game/data/planets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { useSessionStore, type Toast, type ToastKind } from "@/game/stores/sessionStore";
import { damp } from "@/game/systems/math";
import { gameEvents } from "@/game/systems/events";
import { getHintText } from "@/game/systems/hints";
import { runtime } from "@/game/systems/runtime";
import { useHudFrame } from "../useHudFrame";

export function Countdown() {
  const t = useT();
  const value = useSessionStore((state) => state.countdown);
  const setCountdown = useSessionStore((state) => state.setCountdown);

  useEffect(() => {
    if (value !== 0) return;
    const timer = setTimeout(() => setCountdown(null), HUD.goVisible);
    return () => clearTimeout(timer);
  }, [value, setCountdown]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <AnimatePresence>
        {value !== null && (
          <motion.span
            key={value}
            initial={{ scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className={`hud-text absolute font-display font-black ${
              value === 0 ? "text-7xl text-star sm:text-8xl" : "text-8xl text-white sm:text-9xl"
            }`}
          >
            {value === 0 ? t("hud.go") : value}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * "bottom": above the gauges (desktop). "abovePrompts": just above the context
 * buttons (landscape phones). "stack": inline in the HUD's top banner column (tablets).
 */
export function HintBanner({ placement }: { placement: "bottom" | "abovePrompts" | "stack" }) {
  const t = useT();
  const hint = useSessionStore((state) => state.hint);
  const device = useGameStore((state) => state.device);
  const banner = (
    <AnimatePresence mode="wait">
      {hint && (
        <motion.div
          key={hint}
          role="status"
          initial={{ y: 16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="hud-panel flex items-center gap-3 rounded-2xl border-star/50 px-5 py-3 short:px-4 short:py-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-star font-display text-sm font-black text-slate-900">
            !
          </span>
          <span className="text-base font-semibold sm:text-lg short:text-sm">{t(getHintText(hint, device))}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
  if (placement === "stack") return banner;
  return (
    <div
      className={`absolute left-1/2 flex w-full max-w-xl -translate-x-1/2 justify-center px-4 ${
        placement === "bottom" ? "bottom-28 sm:bottom-32" : "bottom-[4.5rem]"
      }`}
    >
      {banner}
    </div>
  );
}

const TOAST_STYLES: Record<ToastKind, string> = {
  ring: "text-emerald-200",
  energy: "text-star",
  collision: "text-danger",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useSessionStore((state) => state.dismissToast);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), HUD.toastDuration);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);
  return (
    <motion.span
      layout
      initial={{ y: 12, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -16, opacity: 0 }}
      className={`hud-text font-display text-lg font-black tracking-wider sm:text-xl ${TOAST_STYLES[toast.kind]}`}
    >
      {toast.text}
    </motion.span>
  );
}

export function Toasts() {
  const toasts = useSessionStore((state) => state.toasts);
  return (
    <div className="absolute top-[30%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** "Warping to Jupiter…" while the tunnel runs. */
export function WarpLabel() {
  const t = useT();
  const locale = useLocale();
  const [target, setTarget] = useState<LocationId | null>(null);
  useEffect(() => {
    const offStart = gameEvents.on("warpStart", ({ target: next }) => setTarget(next));
    const offArrive = gameEvents.on("warpArrive", () => setTarget(null));
    return () => {
      offStart();
      offArrive();
    };
  }, []);
  return (
    <div className="absolute inset-x-0 top-[38%] flex justify-center">
      <AnimatePresence>
        {target && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9, letterSpacing: "0.1em" }}
            animate={{ opacity: 1, scale: 1, letterSpacing: "0.3em" }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.8 }}
            className="hud-text font-display text-2xl font-black uppercase sm:text-3xl"
          >
            {t("hud.warping", { name: localize(BODIES[target].name, locale) })}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Red edge flash on impact. */
export function CollisionFlash() {
  const element = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      gameEvents.on("collision", ({ strength }) => {
        element.current?.animate([{ opacity: 0 }, { opacity: 0.35 + strength * 0.5 }, { opacity: 0 }], {
          duration: HUD.collisionFlash,
          easing: "ease-out",
        });
      }),
    [],
  );
  return (
    <div
      ref={element}
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(255,60,80,0.85)_100%)] opacity-0"
    />
  );
}

/** Warm edge glow while boosting. */
export function BoostGlow() {
  const element = useRef<HTMLDivElement>(null);
  const opacity = useRef(0);
  const written = useRef(0);
  useHudFrame(() => {
    opacity.current = damp(opacity.current, runtime.ship.boost.active ? 1 : 0, 6, 1 / 60);
    if (element.current && Math.abs(opacity.current - written.current) > 0.01) {
      written.current = opacity.current;
      element.current.style.opacity = String(opacity.current);
    }
  });
  return (
    <div
      ref={element}
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(255,170,60,0.28)_100%)] opacity-0"
    />
  );
}
