"use client";

import { useRef } from "react";
import { BODIES, type BodyId } from "@/game/data/planets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { runtime } from "@/game/systems/runtime";
import { OrbitIcon } from "../icons";
import { useHudFrame } from "../useHudFrame";

type PromptKey = "orbit" | "exitOrbit";

/**
 * Context actions (orbit, exit orbit). Availability changes every frame, so a
 * HUD writer toggles the elements directly; desktop shows the key, touch a button.
 */
export function ContextPrompts() {
  const t = useT();
  const locale = useLocale();
  const touch = useGameStore((state) => state.device === "touch");
  const elements = useRef<Partial<Record<PromptKey, HTMLElement | null>>>({});
  const labels = useRef<Partial<Record<PromptKey, HTMLElement | null>>>({});
  const shown = useRef<Record<PromptKey, string | null>>({ orbit: null, exitOrbit: null });

  const name = (id: BodyId) => localize(BODIES[id].name, locale);

  useHudFrame(() => {
    const next: Record<PromptKey, string | null> = {
      orbit: runtime.prompts.orbit ? t("hud.orbitPrompt", { name: name(runtime.prompts.orbit) }) : null,
      exitOrbit: runtime.orbit.active ? t("hud.exitOrbit") : null,
    };
    for (const key of Object.keys(next) as PromptKey[]) {
      if (next[key] === shown.current[key]) continue;
      shown.current[key] = next[key];
      const element = elements.current[key];
      if (element) element.style.display = next[key] ? "flex" : "none";
      const label = labels.current[key];
      if (label && next[key]) label.textContent = next[key];
    }
  });

  const press = (action: "orbit") => () => runtime.pendingActions.add(action);
  const keyChip = (key: string) => (
    <kbd className="rounded-md border border-cyan-200/50 bg-white/10 px-2 py-0.5 font-display text-xs text-hud">{key}</kbd>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center gap-3 short:bottom-3">
      {(["orbit", "exitOrbit"] as const).map((key) => (
        <button
          key={key}
          type="button"
          ref={(element) => {
            elements.current[key] = element;
          }}
          onClick={press("orbit")}
          style={{ display: "none" }}
          className={`hud-panel items-center gap-2 rounded-2xl px-4 py-2 font-display text-sm font-bold tracking-wider ${
            touch ? "pointer-events-auto min-h-12 active:scale-95" : "pointer-events-auto"
          }`}
        >
          {touch ? <OrbitIcon className="text-lg text-hud" /> : keyChip("F")}
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
