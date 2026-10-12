"use client";

import type { InputDevice } from "@/game/controls/types";
import { useT } from "@/game/i18n/useT";
import type { TranslationKey } from "@/game/i18n/types";

const DESKTOP = ["steer", "steerAlt", "throttle", "roll", "boost", "camera", "pause", "mute"] as const;
const TOUCH = ["steer", "throttle", "boost", "camera"] as const;

export function ControlsReference({ device }: { device: InputDevice }) {
  const t = useT();
  const rows = device === "touch" ? TOUCH : DESKTOP;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map((row) => {
        const base = `controls.${device}.${row}` as const;
        return (
          <div key={row} className="contents">
            <dt>
              <kbd className="rounded-md border border-cyan-200/30 bg-white/5 px-2 py-0.5 font-display text-xs text-hud">
                {t(`${base}.key` as TranslationKey)}
              </kbd>
            </dt>
            <dd className="text-white/85">{t(`${base}.action` as TranslationKey)}</dd>
          </div>
        );
      })}
    </dl>
  );
}
