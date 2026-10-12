import type { Localized } from "@/game/i18n/types";
import type { Vec3Tuple } from "./planets";

export type SurfaceId = "moon" | "mars";

export type PointOfInterestKind = "lander" | "crater" | "earthrise" | "rover" | "helicopter" | "delta";

export interface PointOfInterest {
  id: string;
  kind: PointOfInterestKind;
  name: Localized;
  fact: Localized;
  /** Ground position (x, z); y comes from the terrain. */
  position: readonly [number, number];
  /** Arrive within this distance (u) to "visit" it. */
  radius: number;
}

export interface SurfaceDefinition {
  id: SurfaceId;
  /** Real landing region. */
  place: Localized;
  palette: { low: string; high: string; rock: string; accent: string };
  sky:
    | { type: "space"; earthDirection: Vec3Tuple }
    | { type: "atmosphere"; zenith: string; horizon: string; sunHalo: string };
  fog: { color: string; near: number; far: number };
  sunDirection: Vec3Tuple;
  sunIntensity: number;
  ambient: { color: string; intensity: number };
  terrain: {
    seed: number;
    amplitude: number;
    frequency: number;
    craters: number;
    dunes: number;
    /** Ring of hills that hides the edge of the map. */
    rimRadius: number;
    rimHeight: number;
  };
  spawn: readonly [number, number];
  pointsOfInterest: readonly PointOfInterest[];
}

export const MOON_SURFACE: SurfaceDefinition = {
  id: "moon",
  place: { en: "Sea of Tranquility", id: "Laut Ketenangan" },
  palette: { low: "#6f6e6b", high: "#b9b6af", rock: "#4f4e4c", accent: "#d8d5ce" },
  sky: { type: "space", earthDirection: [-0.35, 0.42, -0.84] },
  fog: { color: "#07080c", near: 750, far: 1500 },
  sunDirection: [0.62, 0.34, -0.42],
  sunIntensity: 2.4,
  ambient: { color: "#7d8aa6", intensity: 0.3 },
  terrain: { seed: 11, amplitude: 11, frequency: 0.004, craters: 1, dunes: 0, rimRadius: 760, rimHeight: 170 },
  spawn: [0, 260],
  pointsOfInterest: [
    {
      id: "moon-apollo11",
      kind: "lander",
      name: { en: "Apollo 11 landing site", id: "Lokasi pendaratan Apollo 11" },
      fact: {
        en: "On 20 July 1969 the lander Eagle touched down here. Neil Armstrong and Buzz Aldrin became the first people to walk on the Moon.",
        id: "Pada 20 Juli 1969 pendarat Eagle mendarat di sini. Neil Armstrong dan Buzz Aldrin menjadi manusia pertama yang berjalan di Bulan.",
      },
      position: [-160, -40],
      radius: 40,
    },
    {
      id: "moon-crater",
      kind: "crater",
      name: { en: "Impact crater", id: "Kawah tumbukan" },
      fact: {
        en: "Craters form when asteroids and comets crash into the Moon. With no wind or rain, they stay sharp for billions of years.",
        id: "Kawah terbentuk saat asteroid dan komet menabrak Bulan. Tanpa angin dan hujan, kawah tetap tajam selama miliaran tahun.",
      },
      position: [230, -230],
      radius: 70,
    },
    {
      id: "moon-earthrise",
      kind: "earthrise",
      name: { en: "Earthrise view", id: "Pemandangan Bumi terbit" },
      fact: {
        en: "From the Moon, Earth looks almost four times wider than the Moon looks from Earth. Apollo 8 took the famous 'Earthrise' photo in 1968.",
        id: "Dari Bulan, Bumi terlihat hampir empat kali lebih lebar daripada Bulan dilihat dari Bumi. Apollo 8 memotret 'Earthrise' yang terkenal pada 1968.",
      },
      position: [-120, -420],
      radius: 45,
    },
  ],
};

export const MARS_SURFACE: SurfaceDefinition = {
  id: "mars",
  place: { en: "Jezero Crater", id: "Kawah Jezero" },
  palette: { low: "#9b4b2c", high: "#d48a5a", rock: "#5e2c1d", accent: "#e8b48a" },
  sky: { type: "atmosphere", zenith: "#5d4038", horizon: "#d9a982", sunHalo: "#dfe8f2" },
  fog: { color: "#c99a76", near: 260, far: 1050 },
  sunDirection: [0.42, 0.6, 0.3],
  sunIntensity: 1.9,
  ambient: { color: "#d9a07a", intensity: 0.35 },
  terrain: { seed: 23, amplitude: 9, frequency: 0.005, craters: 0.35, dunes: 0.6, rimRadius: 720, rimHeight: 150 },
  spawn: [0, 240],
  pointsOfInterest: [
    {
      id: "mars-perseverance",
      kind: "rover",
      name: { en: "Perseverance rover", id: "Rover Perseverance" },
      fact: {
        en: "NASA's Perseverance rover landed in Jezero Crater on 18 February 2021. It hunts for signs of ancient life and collects rock samples.",
        id: "Rover Perseverance milik NASA mendarat di Kawah Jezero pada 18 Februari 2021. Ia mencari jejak kehidupan purba dan mengumpulkan sampel batuan.",
      },
      position: [150, -60],
      radius: 40,
    },
    {
      id: "mars-ingenuity",
      kind: "helicopter",
      name: { en: "Ingenuity helicopter", id: "Helikopter Ingenuity" },
      fact: {
        en: "On 19 April 2021 Ingenuity made the first powered, controlled flight on another planet — in air about 100 times thinner than Earth's.",
        id: "Pada 19 April 2021 Ingenuity melakukan terbang bertenaga dan terkendali pertama di planet lain — di udara sekitar 100 kali lebih tipis dari Bumi.",
      },
      position: [-190, -150],
      radius: 40,
    },
    {
      id: "mars-delta",
      kind: "delta",
      name: { en: "Ancient river delta", id: "Delta sungai purba" },
      fact: {
        en: "Billions of years ago Jezero Crater held a lake. A river flowed in and left this delta of mud and sand — a great place to look for signs of life.",
        id: "Miliaran tahun lalu Kawah Jezero berisi danau. Sebuah sungai mengalir masuk dan meninggalkan delta lumpur dan pasir ini — tempat bagus untuk mencari jejak kehidupan.",
      },
      position: [60, -420],
      radius: 80,
    },
  ],
};

export const SURFACES: Record<SurfaceId, SurfaceDefinition> = { moon: MOON_SURFACE, mars: MARS_SURFACE };

export function isSurfaceId(value: unknown): value is SurfaceId {
  return value === "moon" || value === "mars";
}
