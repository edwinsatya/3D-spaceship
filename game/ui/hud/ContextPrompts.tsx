"use client";

import { useRef, type ReactNode } from "react";
import { BODIES, type BodyId } from "@/game/data/planets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { runtime } from "@/game/systems/runtime";
import { LandIcon, OrbitIcon, TakeOffIcon } from "../icons";
import { useHudFrame } from "../useHudFrame";

type PromptKey = "orbit" | "exitOrbit" | "land" | "takeOff";

const PROMPTS: readonly { key: PromptKey; action: "orbit" | "land"; keyLabel: string; icon: ReactNode }[] = [
  { key: "orbit", action: "orbit", keyLabel: "F", icon: <OrbitIcon /> },
  { key: "exitOrbit", action: "orbit", keyLabel: "F", icon: <OrbitIcon /> },
  { key: "land", action: "land", keyLabel: "L", icon: <LandIcon /> },
  { key: "takeOff", action: "land", keyLabel: "L", icon: <TakeOffIcon /> },
];

/**
 * Context actions (orbit, land, take off). Availability changes every frame, so a
 * HUD writer toggles the elements directly; desktop shows the key, touch a button.
 */
export function ContextPrompts() {
  const t = useT();
  const locale = useLocale();
  const touch = useGameStore((state) => state.device === "touch");
  const elements = useRef<Partial<Record<PromptKey, HTMLElement | null>>>({});
  const labels = useRef<Partial<Record<PromptKey, HTMLElement | null>>>({});
  const shown = useRef<Record<PromptKey, string | null>>({ orbit: null, exitOrbit: null, land: null, takeOff: null });

  const name = (id: BodyId) => localize(BODIES[id].name, locale);
  const landText = (id: BodyId) =>
    BODIES[id].landing.landable ? t("hud.landPrompt", { name: name(id) }) : t("hud.landAsk", { name: name(id) });

  useHudFrame(() => {
    const prompts = runtime.prompts;
    const next: Record<PromptKey, string | null> = {
      orbit: prompts.orbit ? t("hud.orbitPrompt", { name: name(prompts.orbit) }) : null,
      exitOrbit: runtime.orbit.active ? t("hud.exitOrbit") : null,
      land: prompts.land ? landText(prompts.land) : null,
      takeOff: prompts.takeOff ? t("hud.takeOff") : null,
    };
    for (const { key } of PROMPTS) {
      if (next[key] === shown.current[key]) continue;
      shown.current[key] = next[key];
      const element = elements.current[key];
      if (element) element.style.display = next[key] ? "flex" : "none";
      const label = labels.current[key];
      if (label && next[key]) label.textContent = next[key];
    }
  });

  const keyChip = (key: string) => (
    <kbd className="rounded-md border border-cyan-200/50 bg-white/10 px-2 py-0.5 font-display text-xs text-hud">{key}</kbd>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-wrap justify-center gap-3 px-40 short:bottom-3">
      {PROMPTS.map(({ key, action, keyLabel, icon }) => (
        <button
          key={key}
          type="button"
          ref={(element) => {
            elements.current[key] = element;
          }}
          onClick={() => runtime.pendingActions.add(action)}
          style={{ display: "none" }}
          className={`hud-panel items-center gap-2 rounded-2xl px-4 py-2 font-display text-sm font-bold tracking-wider ${
            touch ? "pointer-events-auto min-h-12 active:scale-95" : "pointer-events-auto"
          }`}
        >
          {touch ? <span className="text-lg text-hud">{icon}</span> : keyChip(keyLabel)}
          <span
            ref={(element) => {
              labels.current[key] = element;
            }}
          />
        </button>
      ))}
    </div>
  );
}
