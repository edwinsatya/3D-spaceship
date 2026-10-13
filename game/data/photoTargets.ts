import type { Localized } from "@/game/i18n/types";
import type { BodyId } from "./planets";

export type PhotoTargetId = "red-spot" | "saturn";

interface PhotoTargetBase {
  id: PhotoTargetId;
  body: BodyId;
  name: Localized;
  /** What the player should get in the shot (mission hint). */
  brief: Localized;
  fact: Localized;
}

/** A spot on a planet's surface, located in its texture. */
export interface FeatureTarget extends PhotoTargetBase {
  kind: "feature";
  /** Longitude as texture u (0..1) and latitude in degrees, measured in the planet texture. */
  u: number;
  latitude: number;
  /** Feature width as a fraction of the planet's diameter. */
  size: number;
}

/** A whole planet, rings included. */
export interface PlanetTarget extends PhotoTargetBase {
  kind: "planet";
}

export type PhotoTarget = FeatureTarget | PlanetTarget;

export const PHOTO_TARGETS: Record<PhotoTargetId, PhotoTarget> = {
  "red-spot": {
    id: "red-spot",
    kind: "feature",
    body: "jupiter",
    // Measured in public/textures/jupiter.webp (the real storm sits near 22°S).
    u: 0.369,
    latitude: -19.7,
    size: 16_000 / 139_820,
    name: { en: "Great Red Spot", id: "Bintik Merah Besar" },
    brief: {
      en: "Centre the Great Red Spot, fly close and keep it in sunlight.",
      id: "Taruh Bintik Merah Besar di tengah, terbang dekat, dan pastikan terkena cahaya Matahari.",
    },
    fact: {
      en: "The Great Red Spot is a giant storm wider than Earth. People have watched it swirl for more than 350 years!",
      id: "Bintik Merah Besar adalah badai raksasa yang lebih lebar dari Bumi. Orang sudah mengamatinya berputar selama lebih dari 350 tahun!",
    },
  },
  saturn: {
    id: "saturn",
    kind: "planet",
    body: "saturn",
    name: { en: "Saturn and its rings", id: "Saturnus dan cincinnya" },
    brief: {
      en: "Fit all of Saturn and its rings in the frame, from a bit above the rings, on the sunny side.",
      id: "Masukkan seluruh Saturnus dan cincinnya ke bingkai, dari sedikit di atas cincin, di sisi yang terkena Matahari.",
    },
    fact: {
      en: "Saturn's rings are made of billions of chunks of ice and rock. They stretch about 270,000 km across, yet in most places they are only about 10 metres thick!",
      id: "Cincin Saturnus terbuat dari miliaran bongkahan es dan batu. Lebarnya sekitar 270.000 km, tapi di banyak tempat tebalnya hanya sekitar 10 meter!",
    },
  },
};
