import { describe, expect, it } from "vitest";
import { KEY_BINDINGS } from "@/game/config/controls";
import { defaultSettings, keysFor, legacySettings, sanitizeSettings, useSettingsStore } from "./settingsStore";

describe("settings", () => {
  it("fills defaults and clamps out-of-range values", () => {
    const settings = sanitizeSettings({ locale: "fr", volume: { master: 3, music: -1 }, controls: { sensitivity: 9 }, display: { quality: "ultra" } });
    expect(settings.locale).toBe("en");
    expect(settings.volume.master).toBe(1);
    expect(settings.volume.music).toBe(0);
    expect(settings.controls.sensitivity).toBe(2);
    expect(settings.display.quality).toBe("auto");
    expect(sanitizeSettings(undefined)).toEqual(defaultSettings());
  });

  it("brings sound and language over from older progress saves", () => {
    expect(legacySettings(JSON.stringify({ state: { settings: { muted: true, locale: "id" } }, version: 3 }))).toEqual({ muted: true, locale: "id" });
    // v1 saves predate English as the default.
    expect(legacySettings(JSON.stringify({ state: { settings: { muted: false, locale: "id" } }, version: 1 }))).toEqual({ muted: false });
    expect(legacySettings("not json")).toEqual({});
  });

  it("moves a key from one action to another and can restore defaults", () => {
    const store = useSettingsStore.getState();
    store.bindKey("photo", "KeyF");
    let { bindings } = useSettingsStore.getState().controls;
    expect(keysFor("photo", bindings)).toEqual(["KeyF"]);
    expect(keysFor("orbit", bindings)).toEqual([]);
    // An unbound action stays unbound after a reload.
    expect(sanitizeSettings(useSettingsStore.getState()).controls.bindings.orbit).toEqual([]);
    store.resetBindings();
    bindings = useSettingsStore.getState().controls.bindings;
    expect(keysFor("orbit", bindings)).toEqual(KEY_BINDINGS.orbit);
  });
});
