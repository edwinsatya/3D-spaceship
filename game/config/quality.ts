export type QualityTier = "low" | "medium" | "high";

export const QUALITY_TIERS: readonly QualityTier[] = ["low", "medium", "high"];

export interface QualitySettings {
  /** Multiplier on the device pixel ratio (fed to R3F performance.max → AdaptiveDpr). */
  dprFactor: number;
  bloom: boolean;
  multisampling: number;
  starsScale: number;
  dustCount: "low" | "medium" | "high";
  /** Earth/Moon sphere segments for the closest LOD level. */
  planetSegments: number;
  /** Landing-site ground mesh segments per side. */
  terrainSegments: number;
  trails: boolean;
  speedLines: boolean;
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    dprFactor: 1,
    bloom: true,
    multisampling: 4,
    starsScale: 1,
    dustCount: "high",
    planetSegments: 160,
    terrainSegments: 280,
    trails: true,
    speedLines: true,
  },
  medium: {
    dprFactor: 0.8,
    bloom: true,
    multisampling: 0,
    starsScale: 0.75,
    dustCount: "medium",
    planetSegments: 96,
    terrainSegments: 200,
    trails: true,
    speedLines: true,
  },
  low: {
    dprFactor: 0.6,
    bloom: false,
    multisampling: 0,
    starsScale: 0.5,
    dustCount: "low",
    planetSegments: 64,
    terrainSegments: 140,
    trails: false,
    speedLines: false,
  },
};

export const PERFORMANCE = {
  /** Max device pixel ratio used at the high tier. */
  maxDpr: 2,
  /** R3F performance.min (AdaptiveDpr floor during regressions). */
  minPerformance: 0.5,
  /** FPS bounds [decline below, incline above] per device class. */
  desktopBounds: [45, 58] as const,
  touchBounds: [28, 50] as const,
  /** Tier changes allowed before the monitor locks the tier. */
  flipflops: 4,
  /** Starting tier per device class. */
  desktopStartTier: "high" as QualityTier,
  touchStartTier: "medium" as QualityTier,
  /** Procedural texture bake sizes (width; height = width / 2). */
  bakeWidth: { desktop: 2048, touch: 1024 } as const,
  /** Per-planet surface bakes; giants fill the screen so they get more texels. */
  surfaceBakeWidth: { desktop: 1024, touch: 512 } as const,
  giantBakeWidth: { desktop: 2048, touch: 1024 } as const,
  /** Bodies at least this large (u) count as giants. */
  giantRadius: 380,
} as const;
