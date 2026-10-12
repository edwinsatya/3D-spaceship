/**
 * Artistic (compressed) world scale. Nothing here is real-scale; see
 * game/data/planets.ts for real facts shown to the player.
 */
export const WORLD = {
  /** Direction *towards* the sun (normalized at use site). */
  sunDirection: [-0.75, 0.25, 0.6] as const,
  sunLightIntensity: 3.1,
  ambientIntensity: 0.16,
  ambientColor: "#6d84c4",
  /** Rebase the floating origin when the ship is this far from it (u). */
  floatingOriginThreshold: 800,
  /** Fixed simulation step clamp (s) to avoid huge jumps after hitches. */
  maxFrameDelta: 1 / 20,
  /** Planet the course is built around. */
  earthRotationSpeed: 0.012,
  cloudRotationSpeed: 0.017,
  /** Free flight: beyond this distance from Earth, guide the player back. */
  freeFlightReturnDistance: 2600,
} as const;

export const SKY = {
  /** Background cube map face size by quality tier. */
  cubeSize: { high: 1024, medium: 1024, low: 512 } as const,
  /** Mid star layer: shell that slowly follows the camera (parallax factor). */
  midLayer: { count: 2600, minRadius: 4200, maxRadius: 6200, follow: 0.92, size: 2.4 },
  /** Near star layer: world-fixed, strongest parallax. */
  nearLayer: { count: 900, minRadius: 1600, maxRadius: 3200, size: 2.8 },
  /** Soft nebula gas billboards. */
  gas: { count: 18, minRadius: 3000, maxRadius: 4200, minSize: 900, maxSize: 2200 },
  /** Sun billboard distance from camera (kept below camera far). */
  sunDistance: 7000,
  sunSize: 520,
} as const;

export const DUST = {
  /** Box (u) around the camera in which dust wraps. */
  boxSize: 120,
  count: { high: 700, medium: 450, low: 250 } as const,
  /** Streak length = velocity * stretch (s). */
  stretch: 0.045,
  minLength: 0.08,
} as const;

export const TRAIL = {
  points: 36,
  /** Seconds between trail samples. */
  sampleInterval: 1 / 45,
  width: 0.32,
  color: "#5fe6ff",
  boostColor: "#ffb347",
} as const;
