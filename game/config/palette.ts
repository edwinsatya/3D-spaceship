/**
 * Status colours used by the HUD and the 3D world. The colour-blind palette
 * swaps green/red for sky blue / reddish purple from the Okabe–Ito set, which
 * stay distinct for the common red–green colour blindness.
 */
export const PALETTES = {
  standard: {
    success: "#9dffb0",
    successSoft: "#c8ffd4",
    danger: "#ff5a6e",
    target: { ring: "#ffd84d", body: "#7df9ff", poi: "#9dffb0" },
  },
  colorblind: {
    success: "#6cc4ff",
    successSoft: "#b6e1ff",
    danger: "#f07ad8",
    target: { ring: "#ffd84d", body: "#7df9ff", poi: "#6cc4ff" },
  },
} as const;

export type PaletteId = keyof typeof PALETTES;
export type Palette = (typeof PALETTES)[PaletteId];
