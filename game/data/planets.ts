import type { Localized } from "@/game/i18n/types";

export type Vec3Tuple = readonly [number, number, number];

/** Phase 1 bodies. Phase 2 extends this union with the other planets. */
export type BodyId = "sun" | "earth" | "moon";

export interface BodyFacts {
  diameter: Localized;
  distance: Localized;
  temperature: Localized;
  funFact: Localized;
}

/**
 * Optional texture files (place under /public/textures, prefer .ktx2).
 * When a slot is empty the procedural placeholder baked at load time is used.
 */
export interface TextureSet {
  day?: string;
  night?: string;
  clouds?: string;
  color?: string;
}

export interface AtmosphereData {
  dayColor: string;
  twilightColor: string;
  /** Shell radius as a multiple of the body radius. */
  scale: number;
  intensity: number;
}

export interface CelestialBody {
  id: BodyId;
  name: Localized;
  kind: "star" | "planet" | "moon";
  /** Artistic radius in world units (not real scale). */
  radius: number;
  /** Artistic position in universe coordinates. Unused for the sun (direction-based). */
  position: Vec3Tuple;
  /** Axial tilt in degrees (real value). */
  axialTilt: number;
  atmosphere?: AtmosphereData;
  textures?: TextureSet;
  /** Seed for the procedural texture bake. */
  seed: number;
  /** Collides with the ship. */
  solid: boolean;
  facts: BodyFacts;
}

export const EARTH: CelestialBody = {
  id: "earth",
  name: { id: "Bumi", en: "Earth" },
  kind: "planet",
  radius: 200,
  position: [0, 0, 0],
  axialTilt: 23.44,
  atmosphere: {
    dayColor: "#4da6ff",
    twilightColor: "#ff8a4d",
    scale: 1.075,
    intensity: 1.25,
  },
  textures: {},
  seed: 7,
  solid: true,
  facts: {
    diameter: { id: "12.742 km", en: "12,742 km" },
    distance: { id: "149,6 juta km dari Matahari", en: "149.6 million km from the Sun" },
    temperature: { id: "Rata-rata sekitar 15°C", en: "About 15°C on average" },
    funFact: {
      id: "Sekitar 71% permukaan Bumi tertutup air — itulah sebabnya Bumi dijuluki Planet Biru.",
      en: "About 71% of Earth's surface is covered by water — that's why it's called the Blue Planet.",
    },
  },
};

export const MOON: CelestialBody = {
  id: "moon",
  name: { id: "Bulan", en: "Moon" },
  kind: "moon",
  radius: 54,
  position: [-860, 330, -1250],
  axialTilt: 6.68,
  textures: {},
  seed: 21,
  solid: true,
  facts: {
    diameter: { id: "3.474 km", en: "3,474 km" },
    distance: { id: "384.400 km dari Bumi", en: "384,400 km from Earth" },
    temperature: {
      id: "−173°C saat malam hingga 127°C saat siang",
      en: "−173°C at night to 127°C during the day",
    },
    funFact: {
      id: "Bulan selalu menghadapkan sisi yang sama ke Bumi, jadi dari Bumi kita tidak pernah melihat sisi jauhnya.",
      en: "The Moon always shows the same face to Earth, so we never see its far side from here.",
    },
  },
};

export const SUN: CelestialBody = {
  id: "sun",
  name: { id: "Matahari", en: "Sun" },
  kind: "star",
  radius: 0,
  position: [0, 0, 0],
  axialTilt: 7.25,
  seed: 1,
  solid: false,
  facts: {
    diameter: { id: "Sekitar 1,39 juta km", en: "About 1.39 million km" },
    distance: { id: "149,6 juta km dari Bumi", en: "149.6 million km from Earth" },
    temperature: { id: "Permukaannya sekitar 5.500°C", en: "About 5,500°C at the surface" },
    funFact: {
      id: "Cahaya Matahari butuh sekitar 8 menit 20 detik untuk sampai ke Bumi.",
      en: "Sunlight takes about 8 minutes 20 seconds to reach Earth.",
    },
  },
};

export const BODIES: Record<BodyId, CelestialBody> = {
  sun: SUN,
  earth: EARTH,
  moon: MOON,
};

/** Bodies the ship can collide with and use as an auto-level reference. */
export const SOLID_BODIES: readonly CelestialBody[] = [EARTH, MOON];
