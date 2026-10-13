import type { Localized } from "@/game/i18n/types";
import type { Vec3Tuple } from "./planets";

/**
 * The orbital station in the Earth scene (inspired by the ISS, not a replica).
 * Built in its own frame: the truss runs along X, the modules along Z, and the
 * docking port sits at the +Z end of the modules.
 */
export const STATION = {
  name: { en: "Orbital Station", id: "Stasiun Orbit" } satisfies Localized,
  /** In the Earth location (Earth at the origin): high over the lit side, above the Orbit Rings course. */
  position: [-150, 236, 327] as Vec3Tuple,
  /** Orientation as Euler angles (radians, XYZ order). */
  rotation: [0.25, -0.6, 0.1] as Vec3Tuple,
  /** Visual scale of the procedural model (station units → world units). */
  scale: 1,
  truss: { length: 84, thickness: 3 },
  /** Solar wings: x positions along the truss; each wing is a panel pair above and below. */
  solarWings: { x: [-38, -28, 28, 38], width: 8, length: 34 },
  modules: { length: 40, radius: 3.2 },
  /** Docking port gate (fly through it to deliver cargo). */
  dock: { z: 30, radius: 7 },
  fact: {
    en: "The real International Space Station orbits about 400 km above Earth and goes all the way around it every 90 minutes.",
    id: "Stasiun Luar Angkasa Internasional yang asli mengorbit sekitar 400 km di atas Bumi dan mengelilinginya setiap 90 menit.",
  } satisfies Localized,
} as const;
