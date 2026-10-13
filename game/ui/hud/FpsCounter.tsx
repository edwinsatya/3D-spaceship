"use client";

import { useRef } from "react";
import { HUD } from "@/game/config/hud";
import { useT } from "@/game/i18n/useT";
import { useQualityStore } from "@/game/stores/qualityStore";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { setText, useHudFrame } from "../useHudFrame";

/** Frames per second (averaged) and the active quality tier; Settings → Display. */
export function FpsCounter() {
  const t = useT();
  const fps = useRef<HTMLSpanElement>(null);
  const frames = useRef({ count: 0, since: 0 });
  const tier = useQualityStore((state) => state.tier);
  const auto = useSettingsStore((state) => state.display.quality === "auto");

  useHudFrame(() => {
    const now = performance.now();
    const state = frames.current;
    if (state.since === 0) state.since = now;
    state.count++;
    const elapsed = now - state.since;
    if (elapsed < HUD.fpsInterval) return;
    setText(fps.current, String(Math.round((state.count * 1000) / elapsed)));
    state.count = 0;
    state.since = now;
  });

  return (
    <div
      className="pointer-events-none absolute bottom-1 left-1/2 z-[70] -translate-x-1/2 rounded-md bg-slate-950/70 px-2 py-0.5 font-mono text-[0.6875rem] text-success-soft"
      aria-hidden="true"
    >
      <span ref={fps}>--</span> FPS · {auto ? `${t("settings.quality.auto")} · ` : ""}
      {t(`settings.quality.${tier}`)}
    </div>
  );
}
