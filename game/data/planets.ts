import type { Localized } from "@/game/i18n/types";

export type Vec3Tuple = readonly [number, number, number];

export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "ceres"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

/** Bodies you can warp to: each is its own small local scene. */
export type LocationId = Exclude<BodyId, "moon">;

export interface BodyFacts {
  diameter: Localized;
  distance: Localized;
  temperature: Localized;
  funFact: Localized;
}

/**
 * Texture files under /public/textures (.webp/.jpg/.png, or .ktx2). The procedural
 * bake is shown first and replaced once a file has loaded; empty slots keep the bake.
 * Current files: Solar System Scope, CC BY 4.0 (see ASSETS.md).
 */
export interface TextureSet {
  /** Earth only: daytime colour. */
  day?: string;
  /** Earth only: ocean mask (white = water), packed into the day map's alpha. */
  ocean?: string;
  /** Earth only: city lights, packed into the night map's red channel. */
  night?: string;
  /** Earth only: cloud cover (white = cloud), packed into the night map's green channel. */
  clouds?: string;
  /** Every other body: surface / cloud-top colour. */
  color?: string;
  /** Radial ring profile (RGB colour + alpha opacity), inner edge on the left. */
  rings?: string;
}

export interface AtmosphereData {
  dayColor: string;
  twilightColor: string;
  /** Shell radius as a multiple of the body radius. */
  scale: number;
  intensity: number;
}

/** How the procedural surface texture is generated. */
export type SurfaceStyle =
  | { type: "earth" }
  | { type: "star" }
  | {
      type: "rocky";
      /** [low ground, high ground, dark plains] */
      palette: readonly [string, string, string];
      craters: number;
      maria: number;
      polarCaps?: boolean;
      canyon?: boolean;
    }
  | { type: "clouds"; palette: readonly [string, string, string] }
  | {
      type: "gas";
      palette: readonly [string, string, string, string];
      bands: number;
      turbulence: number;
      storm?: { latitude: number; longitude: number; size: number; color: string };
    };

export interface RingBand {
  /** Inner/outer edge as multiples of the planet radius. */
  from: number;
  to: number;
  opacity: number;
}

export interface RingData {
  color: string;
  bands: readonly RingBand[];
}

/** Decorative moons drawn around a location's planet (not landable). */
export interface MoonletData {
  name: Localized;
  radius: number;
  /** Orbit distance as a multiple of the planet radius. */
  distance: number;
  angle: number;
  elevation: number;
  color: string;
  irregular?: boolean;
}

export type LandingInfo = { landable: true } | { landable: false; reason: Localized };

export interface CelestialBody {
  id: BodyId;
  name: Localized;
  kind: "star" | "planet" | "dwarf" | "moon";
  /** Artistic radius in world units (not real scale; ordering matches reality). */
  radius: number;
  /** Position inside its location scene (the location's primary sits at the origin). */
  position: Vec3Tuple;
  /** Axial tilt in degrees (real value). */
  axialTilt: number;
  /** Visual spin (rad/s), artistic. */
  rotationSpeed: number;
  surface: SurfaceStyle;
  atmosphere?: AtmosphereData;
  rings?: RingData;
  moonlets?: readonly MoonletData[];
  textures?: TextureSet;
  /** Seed for the procedural texture bake. */
  seed: number;
  /** Collides with the ship. */
  solid: boolean;
  landing: LandingInfo;
  /** Real values used for ordering, the map and lighting. */
  diameterKm: number;
  /** Mean distance from the Sun in AU (Moon: same as Earth). */
  distanceAu: number;
  /** Colours for 2D icons (map, encyclopedia): [light, dark]. */
  iconColors: readonly [string, string];
  facts: BodyFacts;
}

const GAS_GIANT_REASON: Localized = {
  en: "It's a gas giant: there's no solid ground at all. Your ship would sink into ever thicker, hotter gas until it was crushed.",
  id: "Ini raksasa gas: sama sekali tidak ada daratan padat. Pesawatmu akan tenggelam ke gas yang makin tebal dan panas sampai hancur.",
};

const ICE_GIANT_REASON: Localized = {
  en: "It's an ice giant with no solid surface — just a freezing atmosphere of hydrogen, helium and methane over a deep, slushy interior.",
  id: "Ini raksasa es tanpa permukaan padat — hanya atmosfer super dingin dari hidrogen, helium, dan metana di atas bagian dalam yang dalam dan lembek.",
};

export const SUN: CelestialBody = {
  id: "sun",
  name: { en: "Sun", id: "Matahari" },
  kind: "star",
  radius: 1500,
  position: [0, 0, 0],
  axialTilt: 7.25,
  rotationSpeed: 0.004,
  surface: { type: "star" },
  textures: { color: "/textures/sun.webp" },
  seed: 1,
  solid: true,
  landing: {
    landable: false,
    reason: {
      en: "The Sun is a giant ball of glowing plasma with no solid surface — and that 'surface' is about 5,500°C!",
      id: "Matahari adalah bola plasma raksasa yang berpijar tanpa permukaan padat — dan 'permukaannya' sekitar 5.500°C!",
    },
  },
  diameterKm: 1_392_700,
  distanceAu: 0,
  iconColors: ["#fff3b0", "#ff9a2e"],
  facts: {
    diameter: { en: "About 1.39 million km", id: "Sekitar 1,39 juta km" },
    distance: { en: "149.6 million km from Earth", id: "149,6 juta km dari Bumi" },
    temperature: { en: "About 5,500°C at the surface", id: "Permukaannya sekitar 5.500°C" },
    funFact: {
      en: "Sunlight takes about 8 minutes 20 seconds to reach Earth.",
      id: "Cahaya Matahari butuh sekitar 8 menit 20 detik untuk sampai ke Bumi.",
    },
  },
};

export const MERCURY: CelestialBody = {
  id: "mercury",
  name: { en: "Mercury", id: "Merkurius" },
  kind: "planet",
  radius: 124,
  position: [0, 0, 0],
  axialTilt: 0.03,
  rotationSpeed: 0.004,
  surface: { type: "rocky", palette: ["#6f6a66", "#aaa49c", "#4d4945"], craters: 1, maria: 0.2 },
  textures: { color: "/textures/mercury.webp" },
  seed: 31,
  solid: true,
  landing: {
    landable: false,
    reason: {
      en: "Mercury has rock to stand on, but it swings from 427°C by day to −173°C by night — and the Sun's pull makes slowing down to land there very hard.",
      id: "Merkurius punya batuan untuk dipijak, tapi suhunya 427°C siang dan −173°C malam — dan tarikan Matahari membuat pesawat sangat sulit melambat untuk mendarat.",
    },
  },
  diameterKm: 4_879,
  distanceAu: 0.39,
  iconColors: ["#c9c2b8", "#5d5852"],
  facts: {
    diameter: { en: "4,879 km", id: "4.879 km" },
    distance: { en: "57.9 million km from the Sun", id: "57,9 juta km dari Matahari" },
    temperature: { en: "−173°C at night to 427°C by day", id: "−173°C saat malam hingga 427°C saat siang" },
    funFact: {
      en: "A year on Mercury lasts only 88 Earth days.",
      id: "Satu tahun di Merkurius hanya 88 hari Bumi.",
    },
  },
};

export const VENUS: CelestialBody = {
  id: "venus",
  name: { en: "Venus", id: "Venus" },
  kind: "planet",
  radius: 195,
  position: [0, 0, 0],
  axialTilt: 177.4,
  rotationSpeed: 0.003,
  surface: { type: "clouds", palette: ["#e8d29c", "#c9a560", "#f6e8c4"] },
  atmosphere: { dayColor: "#f3d79a", twilightColor: "#ff9a4d", scale: 1.06, intensity: 1.3 },
  textures: { color: "/textures/venus-clouds.webp" },
  seed: 41,
  solid: true,
  landing: {
    landable: false,
    reason: {
      en: "Its surface is about 464°C with air pressure about 90 times Earth's, under clouds of sulfuric acid. The Venera 13 lander survived just 127 minutes.",
      id: "Permukaannya sekitar 464°C dengan tekanan udara sekitar 90 kali Bumi, di bawah awan asam sulfat. Pendarat Venera 13 hanya bertahan 127 menit.",
    },
  },
  diameterKm: 12_104,
  distanceAu: 0.72,
  iconColors: ["#f6e2a8", "#b98a42"],
  facts: {
    diameter: { en: "12,104 km", id: "12.104 km" },
    distance: { en: "108.2 million km from the Sun", id: "108,2 juta km dari Matahari" },
    temperature: { en: "About 464°C — the hottest planet", id: "Sekitar 464°C — planet terpanas" },
    funFact: {
      en: "A day on Venus (243 Earth days) is longer than its year (225 Earth days).",
      id: "Satu hari di Venus (243 hari Bumi) lebih lama daripada satu tahunnya (225 hari Bumi).",
    },
  },
};

export const EARTH: CelestialBody = {
  id: "earth",
  name: { en: "Earth", id: "Bumi" },
  kind: "planet",
  radius: 200,
  position: [0, 0, 0],
  axialTilt: 23.44,
  rotationSpeed: 0.012,
  surface: { type: "earth" },
  atmosphere: {
    dayColor: "#4da6ff",
    twilightColor: "#ff8a4d",
    scale: 1.075,
    intensity: 1.25,
  },
  textures: {
    day: "/textures/earth-day.webp",
    ocean: "/textures/earth-ocean.webp",
    night: "/textures/earth-lights.webp",
    clouds: "/textures/earth-clouds.webp",
  },
  seed: 7,
  solid: true,
  landing: {
    landable: false,
    reason: {
      en: "Earth is home base! This voyage is about exploring other worlds — try the Moon or Mars.",
      id: "Bumi adalah markas kita! Perjalanan ini untuk menjelajahi dunia lain — coba Bulan atau Mars.",
    },
  },
  diameterKm: 12_742,
  distanceAu: 1,
  iconColors: ["#7cc6ff", "#1f5fb8"],
  facts: {
    diameter: { en: "12,742 km", id: "12.742 km" },
    distance: { en: "149.6 million km from the Sun", id: "149,6 juta km dari Matahari" },
    temperature: { en: "About 15°C on average", id: "Rata-rata sekitar 15°C" },
    funFact: {
      en: "About 71% of Earth's surface is covered by water — that's why it's called the Blue Planet.",
      id: "Sekitar 71% permukaan Bumi tertutup air — itulah sebabnya Bumi dijuluki Planet Biru.",
    },
  },
};

export const MOON: CelestialBody = {
  id: "moon",
  name: { en: "Moon", id: "Bulan" },
  kind: "moon",
  radius: 54,
  position: [-860, 330, -1250],
  axialTilt: 6.68,
  rotationSpeed: 0,
  surface: { type: "rocky", palette: ["#8a8a88", "#c4c2bd", "#4f4f50"], craters: 0.8, maria: 0.5 },
  textures: { color: "/textures/moon.webp" },
  seed: 21,
  solid: true,
  landing: { landable: true },
  diameterKm: 3_474,
  distanceAu: 1,
  iconColors: ["#e4e2dc", "#77746e"],
  facts: {
    diameter: { en: "3,474 km", id: "3.474 km" },
    distance: { en: "384,400 km from Earth", id: "384.400 km dari Bumi" },
    temperature: {
      en: "−173°C at night to 127°C during the day",
      id: "−173°C saat malam hingga 127°C saat siang",
    },
    funFact: {
      en: "The Moon always shows the same face to Earth, so we never see its far side from here.",
      id: "Bulan selalu menghadapkan sisi yang sama ke Bumi, jadi dari Bumi kita tidak pernah melihat sisi jauhnya.",
    },
  },
};

export const MARS: CelestialBody = {
  id: "mars",
  name: { en: "Mars", id: "Mars" },
  kind: "planet",
  radius: 146,
  position: [0, 0, 0],
  axialTilt: 25.19,
  rotationSpeed: 0.011,
  surface: {
    type: "rocky",
    palette: ["#9a4426", "#d68552", "#5e2a1a"],
    craters: 0.45,
    maria: 0.45,
    polarCaps: true,
    canyon: true,
  },
  atmosphere: { dayColor: "#e8a77a", twilightColor: "#8fb6ff", scale: 1.035, intensity: 0.65 },
  moonlets: [
    { name: { en: "Phobos", id: "Phobos" }, radius: 7, distance: 1.9, angle: 0.8, elevation: 0.1, color: "#7a6a5c", irregular: true },
    { name: { en: "Deimos", id: "Deimos" }, radius: 4.5, distance: 3.1, angle: 3.6, elevation: -0.15, color: "#8c7b6b", irregular: true },
  ],
  textures: { color: "/textures/mars.webp" },
  seed: 51,
  solid: true,
  landing: { landable: true },
  diameterKm: 6_779,
  distanceAu: 1.52,
  iconColors: ["#f0a070", "#8a3a1f"],
  facts: {
    diameter: { en: "6,779 km", id: "6.779 km" },
    distance: { en: "227.9 million km from the Sun", id: "227,9 juta km dari Matahari" },
    temperature: { en: "About −60°C on average", id: "Rata-rata sekitar −60°C" },
    funFact: {
      en: "Mars has Olympus Mons, the tallest volcano in the Solar System — about 2.5 times taller than Mount Everest.",
      id: "Mars punya Olympus Mons, gunung berapi tertinggi di Tata Surya — sekitar 2,5 kali lebih tinggi dari Gunung Everest.",
    },
  },
};

/** Dwarf planet in the asteroid belt; its location is the asteroid-belt route. */
export const CERES: CelestialBody = {
  id: "ceres",
  name: { en: "Ceres", id: "Ceres" },
  kind: "dwarf",
  radius: 40,
  position: [0, 0, 0],
  axialTilt: 4,
  rotationSpeed: 0.02,
  surface: { type: "rocky", palette: ["#6d6964", "#9c978f", "#46433f"], craters: 0.9, maria: 0.1 },
  seed: 57,
  solid: true,
  landing: {
    landable: false,
    reason: {
      en: "No spacecraft has ever landed on Ceres. NASA's Dawn probe studied it from orbit (2015–2018), and its gravity is so weak — about 3% of Earth's — that you could jump very high.",
      id: "Belum ada wahana yang pernah mendarat di Ceres. Wahana Dawn milik NASA mempelajarinya dari orbit (2015–2018), dan gravitasinya sangat lemah — sekitar 3% gravitasi Bumi — sampai kamu bisa melompat sangat tinggi.",
    },
  },
  diameterKm: 940,
  distanceAu: 2.77,
  iconColors: ["#b8b3aa", "#5c5852"],
  facts: {
    diameter: { en: "About 940 km", id: "Sekitar 940 km" },
    distance: { en: "414 million km from the Sun", id: "414 juta km dari Matahari" },
    temperature: { en: "About −105°C", id: "Sekitar −105°C" },
    funFact: {
      en: "Ceres is the biggest object in the asteroid belt. Real asteroids are millions of kilometres apart — in this game we packed them close together so there is something to dodge!",
      id: "Ceres adalah benda terbesar di sabuk asteroid. Asteroid sungguhan berjarak jutaan kilometer satu sama lain — di game ini kami merapatkannya supaya ada yang bisa dihindari!",
    },
  },
};

export const JUPITER: CelestialBody = {
  id: "jupiter",
  name: { en: "Jupiter", id: "Jupiter" },
  kind: "planet",
  radius: 670,
  position: [0, 0, 0],
  axialTilt: 3.13,
  rotationSpeed: 0.02,
  surface: {
    type: "gas",
    palette: ["#f1e6d0", "#d8b98c", "#b07f55", "#8a5a3d"],
    bands: 14,
    turbulence: 0.9,
    storm: { latitude: -0.37, longitude: 0.6, size: 0.15, color: "#c75f3c" },
  },
  atmosphere: { dayColor: "#ead9b6", twilightColor: "#c98a5a", scale: 1.03, intensity: 0.55 },
  moonlets: [
    { name: { en: "Io", id: "Io" }, radius: 30, distance: 2.3, angle: 0.4, elevation: 0.05, color: "#d8c44a" },
    { name: { en: "Europa", id: "Europa" }, radius: 26, distance: 3, angle: 2.2, elevation: -0.04, color: "#d9cfbf" },
    { name: { en: "Ganymede", id: "Ganimede" }, radius: 42, distance: 3.9, angle: 4.1, elevation: 0.06, color: "#9b8e80" },
    { name: { en: "Callisto", id: "Kalisto" }, radius: 39, distance: 4.9, angle: 5.4, elevation: -0.05, color: "#5f564d" },
  ],
  textures: { color: "/textures/jupiter.webp" },
  seed: 61,
  solid: true,
  landing: { landable: false, reason: GAS_GIANT_REASON },
  diameterKm: 139_820,
  distanceAu: 5.2,
  iconColors: ["#f0d9b0", "#a0683f"],
  facts: {
    diameter: { en: "139,820 km — the biggest planet", id: "139.820 km — planet terbesar" },
    distance: { en: "778.5 million km from the Sun", id: "778,5 juta km dari Matahari" },
    temperature: { en: "About −110°C at the cloud tops", id: "Sekitar −110°C di puncak awan" },
    funFact: {
      en: "The Great Red Spot is a storm wider than Earth that has been raging for more than 150 years.",
      id: "Bintik Merah Besar adalah badai yang lebih lebar dari Bumi dan sudah berlangsung lebih dari 150 tahun.",
    },
  },
};

export const SATURN: CelestialBody = {
  id: "saturn",
  name: { en: "Saturn", id: "Saturnus" },
  kind: "planet",
  radius: 615,
  position: [0, 0, 0],
  axialTilt: 26.73,
  rotationSpeed: 0.018,
  surface: { type: "gas", palette: ["#f0e3c0", "#dcc493", "#c7a572", "#b3925f"], bands: 18, turbulence: 0.35 },
  atmosphere: { dayColor: "#efe0b8", twilightColor: "#d9a26a", scale: 1.03, intensity: 0.5 },
  rings: {
    color: "#d9c8a2",
    bands: [
      { from: 1.24, to: 1.53, opacity: 0.25 },
      { from: 1.53, to: 1.95, opacity: 0.92 },
      { from: 2.03, to: 2.205, opacity: 0.7 },
      { from: 2.215, to: 2.27, opacity: 0.6 },
    ],
  },
  moonlets: [
    { name: { en: "Titan", id: "Titan" }, radius: 40, distance: 3.6, angle: 1.2, elevation: 0.12, color: "#d39a3e" },
    { name: { en: "Enceladus", id: "Enceladus" }, radius: 10, distance: 2.9, angle: 4.5, elevation: -0.08, color: "#f2f4f7" },
  ],
  textures: {
    color: "/textures/saturn.webp",
    rings: "/textures/saturn-rings.webp",
  },
  seed: 71,
  solid: true,
  landing: { landable: false, reason: GAS_GIANT_REASON },
  diameterKm: 116_460,
  distanceAu: 9.54,
  iconColors: ["#f3e2b6", "#b59060"],
  facts: {
    diameter: { en: "116,460 km", id: "116.460 km" },
    distance: { en: "1.43 billion km from the Sun", id: "1,43 miliar km dari Matahari" },
    temperature: { en: "About −140°C at the cloud tops", id: "Sekitar −140°C di puncak awan" },
    funFact: {
      en: "Saturn is so light for its size that it would float in a giant bathtub of water.",
      id: "Saturnus sangat ringan untuk ukurannya, sampai-sampai ia bisa mengapung di bak mandi raksasa berisi air.",
    },
  },
};

export const URANUS: CelestialBody = {
  id: "uranus",
  name: { en: "Uranus", id: "Uranus" },
  kind: "planet",
  radius: 400,
  position: [0, 0, 0],
  axialTilt: 97.77,
  rotationSpeed: 0.012,
  surface: { type: "gas", palette: ["#c4f0f4", "#a8e2ea", "#94d4de", "#86c6d4"], bands: 6, turbulence: 0.15 },
  atmosphere: { dayColor: "#a2eaf2", twilightColor: "#6fb9d9", scale: 1.04, intensity: 0.9 },
  rings: {
    color: "#8e9aa3",
    bands: [
      { from: 1.64, to: 1.66, opacity: 0.12 },
      { from: 1.75, to: 1.77, opacity: 0.1 },
      { from: 1.98, to: 2.02, opacity: 0.18 },
    ],
  },
  moonlets: [
    { name: { en: "Titania", id: "Titania" }, radius: 16, distance: 2.7, angle: 0.9, elevation: 0.2, color: "#b5aca3" },
    { name: { en: "Oberon", id: "Oberon" }, radius: 15, distance: 3.4, angle: 3.9, elevation: -0.2, color: "#a09080" },
  ],
  textures: { color: "/textures/uranus.webp" },
  seed: 81,
  solid: true,
  landing: { landable: false, reason: ICE_GIANT_REASON },
  diameterKm: 50_724,
  distanceAu: 19.2,
  iconColors: ["#c8f4f7", "#5fa9bd"],
  facts: {
    diameter: { en: "50,724 km", id: "50.724 km" },
    distance: { en: "2.87 billion km from the Sun", id: "2,87 miliar km dari Matahari" },
    temperature: { en: "About −195°C at the cloud tops", id: "Sekitar −195°C di puncak awan" },
    funFact: {
      en: "Uranus spins on its side: its axis is tilted about 98°.",
      id: "Uranus berputar sambil 'berbaring': sumbunya miring sekitar 98°.",
    },
  },
};

export const NEPTUNE: CelestialBody = {
  id: "neptune",
  name: { en: "Neptune", id: "Neptunus" },
  kind: "planet",
  radius: 394,
  position: [0, 0, 0],
  axialTilt: 28.32,
  rotationSpeed: 0.013,
  surface: {
    type: "gas",
    palette: ["#6a93ec", "#4670d4", "#2f50b2", "#86a9f2"],
    bands: 8,
    turbulence: 0.45,
    storm: { latitude: -0.33, longitude: 2.0, size: 0.09, color: "#1d2c74" },
  },
  atmosphere: { dayColor: "#6f9cff", twilightColor: "#3b5bd9", scale: 1.04, intensity: 1 },
  rings: {
    color: "#7c8494",
    bands: [
      { from: 2.13, to: 2.15, opacity: 0.07 },
      { from: 2.52, to: 2.55, opacity: 0.1 },
    ],
  },
  moonlets: [
    { name: { en: "Triton", id: "Triton" }, radius: 24, distance: 2.7, angle: 2.4, elevation: 0.25, color: "#c7b3a6" },
  ],
  textures: { color: "/textures/neptune.webp" },
  seed: 91,
  solid: true,
  landing: { landable: false, reason: ICE_GIANT_REASON },
  diameterKm: 49_244,
  distanceAu: 30.1,
  iconColors: ["#8fb4ff", "#2a3f9e"],
  facts: {
    diameter: { en: "49,244 km", id: "49.244 km" },
    distance: { en: "4.5 billion km from the Sun", id: "4,5 miliar km dari Matahari" },
    temperature: { en: "About −200°C at the cloud tops", id: "Sekitar −200°C di puncak awan" },
    funFact: {
      en: "Neptune has the fastest winds in the Solar System — over 2,000 km/h.",
      id: "Neptunus punya angin tercepat di Tata Surya — lebih dari 2.000 km/jam.",
    },
  },
};

export const BODIES: Record<BodyId, CelestialBody> = {
  sun: SUN,
  mercury: MERCURY,
  venus: VENUS,
  earth: EARTH,
  moon: MOON,
  mars: MARS,
  ceres: CERES,
  jupiter: JUPITER,
  saturn: SATURN,
  uranus: URANUS,
  neptune: NEPTUNE,
};

/** Encyclopedia / map order: from the Sun outwards, Moon right after Earth. */
export const BODY_ORDER: readonly BodyId[] = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "ceres",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

export const LOCATION_ORDER: readonly LocationId[] = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "mars",
  "ceres",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

/** Earth-location bodies (Phase 1 scene). */
export const SOLID_BODIES: readonly CelestialBody[] = [EARTH, MOON];

export function isBodyId(value: unknown): value is BodyId {
  return typeof value === "string" && value in BODIES;
}
