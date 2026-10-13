"use client";

import type { KeyAction } from "@/game/config/controls";
import { keyName } from "@/game/controls/keyNames";
import { useT } from "@/game/i18n/useT";
import type { TranslationKey } from "@/game/i18n/types";
import { keysFor, useSettingsStore } from "@/game/stores/settingsStore";

type ReferenceDevice = "desktop" | "touch" | "gamepad";

/** Desktop rows show the player's current keys (Settings → Controls can remap them). */
const DESKTOP: readonly { row: string; actions?: readonly KeyAction[] }[] = [
  { row: "steer" },
  { row: "steerAlt", actions: ["pitchUp", "pitchDown", "yawLeft", "yawRight"] },
  { row: "throttle", actions: ["throttleUp", "throttleDown"] },
  { row: "roll", actions: ["rollLeft", "rollRight"] },
  { row: "boost", actions: ["boost"] },
  { row: "camera", actions: ["toggleCamera"] },
  { row: "map", actions: ["map"] },
  { row: "orbit", actions: ["orbit"] },
  { row: "land", actions: ["land"] },
  { row: "photo", actions: ["photo"] },
  { row: "pause", actions: ["pause"] },
  { row: "mute", actions: ["mute"] },
];
const TOUCH = ["steer", "throttle", "boost", "camera", "map", "orbit", "land", "photo"] as const;
const GAMEPAD = ["steer", "throttle", "boost", "roll", "orbit", "land", "camera", "map", "photo", "pause"] as const;

function Key({ children }: { children: string }) {
  return <kbd className="rounded-md border border-cyan-200/30 bg-white/5 px-2 py-0.5 font-display text-xs text-hud">{children}</kbd>;
}

export function ControlsReference({ device }: { device: ReferenceDevice }) {
  const t = useT();
  const bindings = useSettingsStore((state) => state.controls.bindings);
  const rows =
    device === "desktop"
      ? DESKTOP.map(({ row, actions }) => ({
          row,
          key: actions
            ? actions
                .map((action) => keysFor(action, bindings).map(keyName).join("/"))
                .filter(Boolean)
                .join(" / ") || "—"
            : t("controls.desktop.steer.key"),
        }))
      : (device === "touch" ? TOUCH : GAMEPAD).map((row) => ({ row, key: t(`controls.${device}.${row}.key` as TranslationKey) }));
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(({ row, key }) => (
        <div key={row} className="contents">
          <dt>
            <Key>{key}</Key>
          </dt>
          <dd className="text-white/85">{t(`controls.${device}.${row}.action` as TranslationKey)}</dd>
        </div>
      ))}
    </dl>
  );
}
