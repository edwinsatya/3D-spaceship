"use client";

import { useEffect, useState } from "react";
import { KEY_BINDINGS, type KeyAction } from "@/game/config/controls";
import { SETTINGS } from "@/game/config/settings";
import { gyroSupported, requestGyroPermission } from "@/game/controls/gyro";
import { keyName, RESERVED_KEYS } from "@/game/controls/keyNames";
import { useT } from "@/game/i18n/useT";
import { useGameStore } from "@/game/stores/gameStore";
import { keysFor, useSettingsStore } from "@/game/stores/settingsStore";
import { runtime } from "@/game/systems/runtime";
import { ControlsReference } from "../ControlsReference";
import { SettingRow, Slider, Toggle } from "./fields";

/** Set while a row waits for a key, so Esc cancels the capture instead of closing Settings. */
export const keyCapture = { active: false };

const ACTIONS = Object.keys(KEY_BINDINGS) as KeyAction[];
const multiplier = (value: number) => `×${value.toFixed(1)}`;

function KeyBindings() {
  const t = useT();
  const bindings = useSettingsStore((state) => state.controls.bindings);
  const bindKey = useSettingsStore((state) => state.bindKey);
  const resetBindings = useSettingsStore((state) => state.resetBindings);
  const [listening, setListening] = useState<KeyAction | null>(null);

  useEffect(() => {
    keyCapture.active = listening !== null;
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Escape") setListening(null);
      else if (!RESERVED_KEYS.has(event.code)) {
        bindKey(listening, event.code);
        setListening(null);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      keyCapture.active = false;
    };
  }, [listening, bindKey]);

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-hud">{t("settings.keys")}</p>
        <button type="button" onClick={resetBindings} className="text-xs text-cyan-100 underline-offset-2 hover:underline">
          {t("settings.resetKeys")}
        </button>
      </div>
      <ul className="flex flex-col">
        {ACTIONS.map((action) => {
          const keys = keysFor(action, bindings);
          const waiting = listening === action;
          return (
            <li key={action} className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 last:border-b-0">
              <span className="text-sm">{t(`settings.actions.${action}`)}</span>
              <span className="flex items-center gap-2">
                {waiting ? (
                  <span className="text-xs font-bold text-star" role="status">
                    {t("settings.pressKey")}
                  </span>
                ) : keys.length > 0 ? (
                  keys.map((code) => (
                    <kbd key={code} className="rounded-md border border-cyan-200/30 bg-white/5 px-2 py-0.5 font-display text-xs text-hud">
                      {keyName(code)}
                    </kbd>
                  ))
                ) : (
                  <span className="text-xs text-white/40">{t("settings.unbound")}</span>
                )}
                <button
                  type="button"
                  onClick={() => setListening(waiting ? null : action)}
                  className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20"
                >
                  {waiting ? t("settings.cancel") : t("settings.change")}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GamepadStatus() {
  const t = useT();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setName(navigator.getGamepads?.().find((pad) => pad?.connected)?.id ?? null);
    update();
    window.addEventListener("gamepadconnected", update);
    window.addEventListener("gamepaddisconnected", update);
    return () => {
      window.removeEventListener("gamepadconnected", update);
      window.removeEventListener("gamepaddisconnected", update);
    };
  }, []);
  return (
    <div className="mt-4">
      <p className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-hud">{t("settings.gamepad")}</p>
      <p className="mb-2 text-xs text-white/70">{name ? t("settings.gamepadConnected", { name }) : t("settings.gamepadHint")}</p>
      <ControlsReference device="gamepad" />
    </div>
  );
}

export function ControlsSection() {
  const t = useT();
  const controls = useSettingsStore((state) => state.controls);
  const setControls = useSettingsStore((state) => state.setControls);
  const touch = useGameStore((state) => state.device === "touch");
  const [gyroError, setGyroError] = useState(false);
  const { sensitivity, gyroSensitivity } = SETTINGS.controls;

  const toggleGyro = async (on: boolean) => {
    setGyroError(false);
    if (on && !(await requestGyroPermission())) {
      setGyroError(true);
      return;
    }
    setControls({ gyro: on });
    if (on) runtime.gyro?.recenter();
  };

  return (
    <div>
      <SettingRow label={t("settings.sensitivity")} hint={t("settings.sensitivityHint")}>
        <Slider
          value={controls.sensitivity}
          onChange={(value) => setControls({ sensitivity: value })}
          min={sensitivity.min}
          max={sensitivity.max}
          step={0.1}
          format={multiplier}
          label={t("settings.sensitivity")}
        />
      </SettingRow>
      <SettingRow label={t("settings.invertY")} hint={t("settings.invertYHint")}>
        <Toggle checked={controls.invertY} onChange={(invertY) => setControls({ invertY })} label={t("settings.invertY")} />
      </SettingRow>
      {touch && gyroSupported() && (
        <>
          <SettingRow label={t("settings.gyro")} hint={gyroError ? t("settings.gyroDenied") : t("settings.gyroHint")}>
            <Toggle checked={controls.gyro} onChange={(on) => void toggleGyro(on)} label={t("settings.gyro")} />
          </SettingRow>
          {controls.gyro && (
            <SettingRow label={t("settings.gyroSensitivity")}>
              <Slider
                value={controls.gyroSensitivity}
                onChange={(value) => setControls({ gyroSensitivity: value })}
                min={gyroSensitivity.min}
                max={gyroSensitivity.max}
                step={0.1}
                format={multiplier}
                label={t("settings.gyroSensitivity")}
              />
              <button type="button" onClick={() => runtime.gyro?.recenter()} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20">
                {t("settings.recenter")}
              </button>
            </SettingRow>
          )}
        </>
      )}
      {!touch && <KeyBindings />}
      <GamepadStatus />
    </div>
  );
}
