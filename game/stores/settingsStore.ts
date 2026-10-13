import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { KEY_BINDINGS, type KeyAction } from "@/game/config/controls";
import { QUALITY_TIERS, type QualityTier } from "@/game/config/quality";
import { SETTINGS } from "@/game/config/settings";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/game/i18n/types";
import { clamp } from "@/game/systems/math";

export type QualityPreference = "auto" | QualityTier;
/** "system" follows the OS (prefers-reduced-motion). */
export type MotionPreference = "system" | "reduced" | "full";
export type TextSize = keyof typeof SETTINGS.textScale;
export type ColorVision = "standard" | "colorblind";
export type VolumeChannel = keyof typeof SETTINGS.volume;

/** Device settings: they apply at once, persist on this device and never sync to the account. */
export interface SettingsData {
  locale: Locale;
  muted: boolean;
  volume: Record<VolumeChannel, number>;
  display: { quality: QualityPreference; showFps: boolean };
  controls: {
    /** Only the remapped actions; the rest use KEY_BINDINGS. */
    bindings: Partial<Record<KeyAction, string[]>>;
    sensitivity: number;
    invertY: boolean;
    gyro: boolean;
    gyroSensitivity: number;
  };
  accessibility: { motion: MotionPreference; colorVision: ColorVision; textSize: TextSize };
}

interface SettingsStore extends SettingsData {
  setLocale: (locale: Locale) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setVolume: (channel: VolumeChannel, value: number) => void;
  setDisplay: (patch: Partial<SettingsData["display"]>) => void;
  setControls: (patch: Partial<Omit<SettingsData["controls"], "bindings">>) => void;
  /** Binds `code` to `action` (removing it from any other action); null restores the default keys. */
  bindKey: (action: KeyAction, code: string | null) => void;
  resetBindings: () => void;
  setAccessibility: (patch: Partial<SettingsData["accessibility"]>) => void;
}

export const SETTINGS_STORAGE_KEY = "jelajah-angkasa:settings";
export const SETTINGS_VERSION = 1;
const LEGACY_PROGRESS_KEY = "jelajah-angkasa:progress";

export function defaultSettings(): SettingsData {
  return {
    locale: DEFAULT_LOCALE,
    muted: false,
    volume: { ...SETTINGS.volume },
    display: { quality: "auto", showFps: false },
    controls: {
      bindings: {},
      sensitivity: SETTINGS.controls.sensitivity.default,
      invertY: false,
      gyro: false,
      gyroSensitivity: SETTINGS.controls.gyroSensitivity.default,
    },
    accessibility: { motion: "system", colorVision: "standard", textSize: "normal" },
  };
}

const isOneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);
const number01 = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, 1) : fallback);
const ranged = (value: unknown, range: { min: number; max: number; default: number }) =>
  typeof value === "number" && Number.isFinite(value) ? clamp(value, range.min, range.max) : range.default;
const KEY_ACTIONS = Object.keys(KEY_BINDINGS) as KeyAction[];

/** Pure (unit-tested): turns anything stored into valid settings, keeping what it can. */
export function sanitizeSettings(stored: unknown): SettingsData {
  const data = (stored ?? {}) as Partial<Record<keyof SettingsData, Record<string, unknown>>> & { locale?: unknown; muted?: unknown };
  const base = defaultSettings();
  const volume = (data.volume ?? {}) as Record<string, unknown>;
  const display = (data.display ?? {}) as Record<string, unknown>;
  const controls = (data.controls ?? {}) as Record<string, unknown>;
  const accessibility = (data.accessibility ?? {}) as Record<string, unknown>;
  const bindings: SettingsData["controls"]["bindings"] = {};
  const storedBindings = (controls.bindings ?? {}) as Record<string, unknown>;
  for (const action of KEY_ACTIONS) {
    const codes = storedBindings[action];
    // An empty list is kept: the action was deliberately left without a key.
    if (Array.isArray(codes) && codes.every((code) => typeof code === "string")) bindings[action] = codes;
  }
  return {
    locale: isOneOf(data.locale, LOCALES) ? data.locale : base.locale,
    muted: typeof data.muted === "boolean" ? data.muted : base.muted,
    volume: {
      master: number01(volume.master, base.volume.master),
      music: number01(volume.music, base.volume.music),
      effects: number01(volume.effects, base.volume.effects),
      engine: number01(volume.engine, base.volume.engine),
    },
    display: {
      quality: isOneOf(display.quality, ["auto", ...QUALITY_TIERS] as const) ? display.quality : base.display.quality,
      showFps: typeof display.showFps === "boolean" ? display.showFps : base.display.showFps,
    },
    controls: {
      bindings,
      sensitivity: ranged(controls.sensitivity, SETTINGS.controls.sensitivity),
      invertY: typeof controls.invertY === "boolean" ? controls.invertY : base.controls.invertY,
      gyro: typeof controls.gyro === "boolean" ? controls.gyro : base.controls.gyro,
      gyroSensitivity: ranged(controls.gyroSensitivity, SETTINGS.controls.gyroSensitivity),
    },
    accessibility: {
      motion: isOneOf(accessibility.motion, ["system", "reduced", "full"] as const) ? accessibility.motion : base.accessibility.motion,
      colorVision: isOneOf(accessibility.colorVision, ["standard", "colorblind"] as const)
        ? accessibility.colorVision
        : base.accessibility.colorVision,
      textSize: isOneOf(accessibility.textSize, Object.keys(SETTINGS.textScale) as TextSize[]) ? accessibility.textSize : base.accessibility.textSize,
    },
  };
}

/**
 * Sound and language used to live in the progress save (before Phase 4).
 * v1 progress saves predate English as the default, so they move to English.
 */
export function legacySettings(progressJson: string | null): Partial<SettingsData> {
  if (!progressJson) return {};
  try {
    const saved = JSON.parse(progressJson) as { state?: { settings?: { muted?: unknown; locale?: unknown } }; version?: number };
    const settings = saved.state?.settings;
    if (!settings) return {};
    const locale = (saved.version ?? 0) >= 2 && isOneOf(settings.locale, LOCALES) ? settings.locale : undefined;
    return { ...(typeof settings.muted === "boolean" ? { muted: settings.muted } : {}), ...(locale ? { locale } : {}) };
  } catch {
    return {};
  }
}

function initialSettings(): SettingsData {
  if (typeof window === "undefined") return defaultSettings();
  try {
    return sanitizeSettings({ ...defaultSettings(), ...legacySettings(window.localStorage.getItem(LEGACY_PROGRESS_KEY)) });
  } catch {
    return defaultSettings();
  }
}

/** Effective keys for an action (remapped or default). */
export function keysFor(action: KeyAction, bindings: SettingsData["controls"]["bindings"]): readonly string[] {
  return bindings[action] ?? KEY_BINDINGS[action];
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...initialSettings(),
      setLocale: (locale) => set({ locale }),
      setMuted: (muted) => set({ muted }),
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      setVolume: (channel, value) => set((state) => ({ volume: { ...state.volume, [channel]: clamp(value, 0, 1) } })),
      setDisplay: (patch) => set((state) => ({ display: { ...state.display, ...patch } })),
      setControls: (patch) => set((state) => ({ controls: { ...state.controls, ...patch } })),
      bindKey: (action, code) => {
        const { bindings } = get().controls;
        const next: SettingsData["controls"]["bindings"] = { ...bindings };
        if (code === null) delete next[action];
        else {
          // A key does one thing: take it away from whichever action had it.
          for (const other of KEY_ACTIONS) {
            if (other === action) continue;
            const keys = keysFor(other, next);
            if (keys.includes(code)) {
              const remaining = keys.filter((key) => key !== code);
              next[other] = remaining.length > 0 ? remaining : [];
            }
          }
          next[action] = [code];
        }
        set((state) => ({ controls: { ...state.controls, bindings: next } }));
      },
      resetBindings: () => set((state) => ({ controls: { ...state.controls, bindings: {} } })),
      setAccessibility: (patch) => set((state) => ({ accessibility: { ...state.accessibility, ...patch } })),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): SettingsData => ({
        locale: state.locale,
        muted: state.muted,
        volume: state.volume,
        display: state.display,
        controls: state.controls,
        accessibility: state.accessibility,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitizeSettings({ ...current, ...(persisted as object) }) }),
    },
  ),
);
