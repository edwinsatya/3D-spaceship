import type { Localized } from "@/game/i18n/types";
import type { Vec3Tuple } from "./planets";

export type ShipId = "comet" | "swift" | "nova" | "titan";
export type DecalId = "none" | "stripe" | "chevron" | "star";

/** 1..5, shown as bars in the hangar. */
export interface ShipStats {
  speed: number;
  handling: number;
  boost: number;
}

/** Multipliers applied to the base FLIGHT / BOOST tuning (1 = Comet). */
export interface ShipModifiers {
  maxSpeed: number;
  boostSpeed: number;
  turn: number;
  roll: number;
  accel: number;
  boostDrain: number;
  boostRegen: number;
}

/**
 * Parametric low-poly design. Ship forward is -Z; profiles run tail (+) → nose (−)
 * as [radius, along] pairs before the lathe is laid along Z.
 */
export interface ShipDesign {
  fuselage: { profile: readonly (readonly [number, number])[]; segments: number; flatten: number };
  canopy: { radius: number; position: Vec3Tuple; scale: Vec3Tuple };
  /** Right-wing outline in the XZ plane ([x, z], x > 0); mirrored for the left wing. */
  wing: { outline: readonly (readonly [number, number])[]; thickness: number; dihedral: number; y: number };
  /** Fin outline in the ZY plane ([z, height]). */
  fins: { outline: readonly (readonly [number, number])[]; layout: "single" | "twin"; offsetX: number; cant: number; y: number };
  engines: { nozzles: readonly Vec3Tuple[]; radius: number; length: number };
  /** Right wing tip light; the left one is mirrored. */
  navLight: Vec3Tuple;
  /** First-person eye position. */
  cockpit: Vec3Tuple;
  collisionRadius: number;
}

export interface ShipCustomization {
  body: string;
  accent: string;
  decal: DecalId;
  trail: string;
}

export interface ShipDefinition {
  id: ShipId;
  name: Localized;
  description: Localized;
  stats: ShipStats;
  modifiers: ShipModifiers;
  design: ShipDesign;
  defaults: ShipCustomization;
}

const BASE_MODIFIERS: ShipModifiers = {
  maxSpeed: 1,
  boostSpeed: 1,
  turn: 1,
  roll: 1,
  accel: 1,
  boostDrain: 1,
  boostRegen: 1,
};

export const SHIPS: readonly ShipDefinition[] = [
  {
    id: "comet",
    name: { en: "Comet", id: "Komet" },
    description: {
      en: "A well-balanced explorer. Great for your first flights.",
      id: "Penjelajah yang seimbang. Cocok untuk penerbangan pertamamu.",
    },
    stats: { speed: 3, handling: 3, boost: 3 },
    modifiers: BASE_MODIFIERS,
    design: {
      fuselage: {
        profile: [
          [0, 1.58],
          [0.3, 1.52],
          [0.47, 1.12],
          [0.55, 0.3],
          [0.47, -0.5],
          [0.3, -1.12],
          [0.13, -1.52],
          [0, -1.66],
        ],
        segments: 8,
        flatten: 0.72,
      },
      canopy: { radius: 0.34, position: [0, 0.24, -0.5], scale: [1, 0.85, 2.1] },
      wing: {
        outline: [
          [0.38, -0.35],
          [2.05, 0.72],
          [2.1, 1.08],
          [0.38, 1.02],
        ],
        thickness: 0.07,
        dihedral: 0.07,
        y: 0,
      },
      fins: {
        outline: [
          [0.82, 0],
          [1.55, 0],
          [1.6, 0.72],
          [1.35, 0.72],
        ],
        layout: "twin",
        offsetX: 0.32,
        cant: 0.32,
        y: 0.12,
      },
      engines: {
        nozzles: [
          [-0.46, -0.04, 1.62],
          [0.46, -0.04, 1.62],
        ],
        radius: 0.2,
        length: 0.95,
      },
      navLight: [2.08, 0.02, 1.0],
      cockpit: [0, 0.48, -0.55],
      collisionRadius: 1.4,
    },
    defaults: { body: "#cfd8e6", accent: "#ff6b3d", decal: "none", trail: "#5fe6ff" },
  },
  {
    id: "swift",
    name: { en: "Swift", id: "Kilat" },
    description: {
      en: "Long and sleek: the fastest ship, but it turns wide.",
      id: "Panjang dan ramping: paling cepat, tapi beloknya lebar.",
    },
    stats: { speed: 5, handling: 2, boost: 3 },
    modifiers: { ...BASE_MODIFIERS, maxSpeed: 1.06, boostSpeed: 1.1, turn: 0.86, roll: 0.95, accel: 1.15 },
    design: {
      fuselage: {
        profile: [
          [0, 1.9],
          [0.26, 1.85],
          [0.4, 1.4],
          [0.46, 0.4],
          [0.4, -0.6],
          [0.26, -1.4],
          [0.1, -1.95],
          [0, -2.15],
        ],
        segments: 8,
        flatten: 0.75,
      },
      canopy: { radius: 0.32, position: [0, 0.22, -0.9], scale: [0.85, 0.8, 2.6] },
      wing: {
        outline: [
          [0.34, 0.1],
          [1.75, 1.25],
          [1.8, 1.5],
          [0.34, 1.45],
        ],
        thickness: 0.06,
        dihedral: -0.05,
        y: 0,
      },
      fins: {
        outline: [
          [1.1, 0],
          [1.85, 0],
          [1.95, 0.85],
          [1.6, 0.85],
        ],
        layout: "single",
        offsetX: 0,
        cant: 0,
        y: 0.14,
      },
      engines: { nozzles: [[0, -0.02, 1.92]], radius: 0.28, length: 1.1 },
      navLight: [1.8, 0, 1.45],
      cockpit: [0, 0.44, -0.95],
      collisionRadius: 1.4,
    },
    defaults: { body: "#e2463b", accent: "#ffd24d", decal: "stripe", trail: "#ffb347" },
  },
  {
    id: "nova",
    name: { en: "Nova", id: "Nova" },
    description: {
      en: "Small and nimble: turns the tightest corners.",
      id: "Kecil dan lincah: bisa berbelok paling tajam.",
    },
    stats: { speed: 2, handling: 5, boost: 3 },
    modifiers: { ...BASE_MODIFIERS, maxSpeed: 0.93, boostSpeed: 0.95, turn: 1.25, roll: 1.3, accel: 1.1, boostRegen: 1.05 },
    design: {
      fuselage: {
        profile: [
          [0, 1.2],
          [0.32, 1.15],
          [0.52, 0.8],
          [0.6, 0.1],
          [0.5, -0.6],
          [0.3, -1.05],
          [0.1, -1.3],
          [0, -1.38],
        ],
        segments: 6,
        flatten: 0.65,
      },
      canopy: { radius: 0.36, position: [0, 0.26, -0.25], scale: [1.1, 0.95, 1.5] },
      wing: {
        outline: [
          [0.4, -0.7],
          [1.95, 0.95],
          [1.95, 1.15],
          [0.4, 1.15],
        ],
        thickness: 0.07,
        dihedral: 0.12,
        y: 0,
      },
      fins: {
        outline: [
          [0.55, 0],
          [1.15, 0],
          [1.2, 0.5],
          [1.0, 0.5],
        ],
        layout: "twin",
        offsetX: 0.38,
        cant: 0.6,
        y: 0.1,
      },
      engines: {
        nozzles: [
          [-0.38, -0.05, 1.32],
          [0.38, -0.05, 1.32],
        ],
        radius: 0.16,
        length: 0.7,
      },
      navLight: [1.95, 0.03, 1.05],
      cockpit: [0, 0.5, -0.3],
      collisionRadius: 1.3,
    },
    defaults: { body: "#4fd17a", accent: "#3d8bff", decal: "chevron", trail: "#6dff8a" },
  },
  {
    id: "titan",
    name: { en: "Titan", id: "Titan" },
    description: {
      en: "Four big engines: the longest boost in the fleet.",
      id: "Empat mesin besar: turbo paling lama di armada.",
    },
    stats: { speed: 3, handling: 2, boost: 5 },
    modifiers: { ...BASE_MODIFIERS, boostSpeed: 1.08, turn: 0.88, roll: 0.85, accel: 0.9, boostDrain: 0.7, boostRegen: 1.3 },
    design: {
      fuselage: {
        profile: [
          [0, 1.5],
          [0.42, 1.45],
          [0.66, 1.0],
          [0.75, 0.2],
          [0.72, -0.7],
          [0.55, -1.3],
          [0.3, -1.6],
          [0, -1.7],
        ],
        segments: 8,
        flatten: 0.78,
      },
      canopy: { radius: 0.38, position: [0, 0.38, -0.55], scale: [1.1, 0.8, 1.9] },
      wing: {
        outline: [
          [0.6, -0.1],
          [1.65, 0.45],
          [1.7, 1.2],
          [0.6, 1.3],
        ],
        thickness: 0.12,
        dihedral: 0,
        y: 0,
      },
      fins: {
        outline: [
          [0.7, 0],
          [1.55, 0],
          [1.6, 0.95],
          [1.25, 0.95],
        ],
        layout: "twin",
        offsetX: 0.5,
        cant: 0.18,
        y: 0.18,
      },
      engines: {
        nozzles: [
          [-0.38, 0.22, 1.66],
          [0.38, 0.22, 1.66],
          [-0.38, -0.28, 1.66],
          [0.38, -0.28, 1.66],
        ],
        radius: 0.2,
        length: 1.0,
      },
      navLight: [1.7, 0.04, 1.1],
      cockpit: [0, 0.62, -0.6],
      collisionRadius: 1.6,
    },
    defaults: { body: "#2b2f3a", accent: "#ff8a3d", decal: "star", trail: "#ffd84d" },
  },
];

export const SHIPS_BY_ID: Record<ShipId, ShipDefinition> = Object.fromEntries(
  SHIPS.map((ship) => [ship.id, ship]),
) as Record<ShipId, ShipDefinition>;

export const DEFAULT_SHIP: ShipId = "comet";

/** Paint palettes offered in the hangar. */
export const PAINT_COLORS: readonly string[] = [
  "#cfd8e6",
  "#8f9bab",
  "#2b2f3a",
  "#e2463b",
  "#ff8a3d",
  "#ffd24d",
  "#4fd17a",
  "#3d8bff",
  "#9b5cff",
  "#ff5fa8",
];

export const TRAIL_COLORS: readonly string[] = ["#5fe6ff", "#ffb347", "#ff5fd2", "#6dff8a", "#b07cff", "#ffd84d", "#ffffff"];

export const DECALS: readonly DecalId[] = ["none", "stripe", "chevron", "star"];

export function isShipId(value: unknown): value is ShipId {
  return typeof value === "string" && value in SHIPS_BY_ID;
}

export function isDecalId(value: unknown): value is DecalId {
  return typeof value === "string" && (DECALS as readonly string[]).includes(value);
}
