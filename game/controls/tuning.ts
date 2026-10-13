import type { SettingsData } from "@/game/stores/settingsStore";

/**
 * Player control settings mirrored into a plain object so input sources can
 * read them every frame without touching React or the store.
 */
export const inputTuning = {
  sensitivity: 1,
  invertY: false,
  gyro: false,
  gyroSensitivity: 1,
};

export function applyInputSettings(controls: SettingsData["controls"]): void {
  inputTuning.sensitivity = controls.sensitivity;
  inputTuning.invertY = controls.invertY;
  inputTuning.gyro = controls.gyro;
  inputTuning.gyroSensitivity = controls.gyroSensitivity;
}

/** Pitch from an analog control, flipped when "invert Y" is on. */
export function analogPitch(value: number): number {
  return inputTuning.invertY ? -value : value;
}
