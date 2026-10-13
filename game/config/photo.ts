/** Photo mode, photo missions and the gallery. */
export const PHOTO = {
  camera: {
    /** Camera distance behind the ship (u); 0 = from the cockpit. */
    distance: { min: 0, max: 70, start: 10 },
    /** Field of view (degrees): lower = zoomed in. */
    fov: { min: 18, max: 80 },
    /** Radians per pixel dragged. */
    dragSpeed: 0.006,
    /** Distance change per wheel notch / pinch unit. */
    zoomSpeed: 0.0035,
    /** Keep the camera from flipping over the poles (radians). */
    pitchLimit: 1.45,
  },
  capture: {
    /** Longest side of a saved photo (px). */
    maxSize: 1920,
    thumbSize: 360,
    quality: 0.9,
    /** Oldest photos are removed beyond this many. */
    galleryLimit: 60,
  },
  scoring: {
    /** Feature (e.g. the Great Red Spot): weights add up to 1. */
    feature: { center: 0.3, size: 0.3, facing: 0.2, light: 0.2, idealSize: 0.32, minSize: 0.04 },
    /** Whole planet with rings: rings seen from above, all of it in frame. */
    planet: { center: 0.25, size: 0.25, rings: 0.3, light: 0.2, idealSize: 0.85, minSize: 0.2 },
    /** Ring opening (|sin| of the view elevation above the ring plane) for full marks. */
    ringOpen: 0.42,
  },
} as const;

/**
 * Filters as chains of CSS filter functions. The preview uses CSS on the
 * canvas; the saved photo applies the same matrices to its pixels.
 */
export const PHOTO_FILTERS = {
  none: [],
  vivid: [
    ["saturate", 1.5],
    ["contrast", 1.12],
  ],
  mono: [
    ["grayscale", 1],
    ["contrast", 1.2],
  ],
  vintage: [
    ["sepia", 0.75],
    ["contrast", 1.05],
    ["brightness", 1.06],
  ],
  nebula: [
    ["hue-rotate", 35],
    ["saturate", 1.35],
  ],
} as const satisfies Record<string, readonly (readonly [PhotoFilterFunction, number])[]>;

export type PhotoFilterFunction = "saturate" | "grayscale" | "sepia" | "contrast" | "brightness" | "hue-rotate";
export type PhotoFilterId = keyof typeof PHOTO_FILTERS;
export const PHOTO_FILTER_ORDER: readonly PhotoFilterId[] = ["none", "vivid", "mono", "vintage", "nebula"];
