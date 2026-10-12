/**
 * External asset slots. Everything ships with procedural placeholders; fill
 * these to switch to real files (see ASSETS.md for sources and licences).
 */
export const ASSET_PATHS = {
  /** KTX2/Basis transcoder (copy node_modules/three/examples/jsm/libs/basis/ to public/basis/). */
  basisTranscoder: "/basis/",
  /** Draco decoder for compressed GLB meshes. */
  dracoDecoder: "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
} as const;

export const SHIP_ASSETS = {
  /** GLB model of the player ship (Draco/Meshopt supported). Null = procedural ship. */
  modelUrl: null as string | null,
  /** Uniform scale applied to the GLB so it matches the procedural ship (~3.2 u long). */
  modelScale: 1,
} as const;

/**
 * GLB models for the landing-site hardware (e.g. from NASA 3D Resources).
 * Null = procedural stand-in. Scale converts the file's units to metres (the
 * prop group already applies VISUALS.surface.propScale).
 */
export const SURFACE_PROP_ASSETS: Record<"lander" | "rover" | "helicopter", { url: string | null; scale: number }> = {
  lander: { url: null, scale: 1 },
  rover: { url: null, scale: 1 },
  helicopter: { url: null, scale: 1 },
};
