import { Color } from "three";
import { PALETTES, type Palette, type PaletteId } from "@/game/config/palette";

/**
 * Accessibility state read every frame by the 3D world (camera shake, FOV,
 * colours). Kept in a plain object; useSettingsEffects keeps it in sync.
 */
export const accessibility = {
  reducedMotion: false,
  palette: PALETTES.standard as Palette,
  /** Three.js colours of the current palette (no allocation per frame). */
  colors: { success: new Color(PALETTES.standard.success) },
};

export function setPalette(id: PaletteId): void {
  accessibility.palette = PALETTES[id];
  accessibility.colors.success.set(PALETTES[id].success);
}

/** "system" follows the OS setting (prefers-reduced-motion). */
export function resolveReducedMotion(preference: "system" | "reduced" | "full", systemPrefersReduced: boolean): boolean {
  return preference === "reduced" || (preference === "system" && systemPrefersReduced);
}
