import { Euler, Quaternion, Vector3 } from "three";
import { STATION } from "@/game/data/station";
import type { RingSpec } from "./course";

export interface StationLayout {
  center: Vector3;
  quaternion: Quaternion;
  /** The docking gate, facing out of the port (+Z in the station frame). */
  dock: RingSpec;
  /** Collision spheres approximating truss, modules and solar wings (world space). */
  spheres: { center: Vector3; radius: number }[];
}

let cached: StationLayout | null = null;

/** World-space station geometry for gameplay (pure, deterministic, cached). */
export function stationLayout(): StationLayout {
  if (cached) return cached;
  const center = new Vector3(...STATION.position);
  const quaternion = new Quaternion().setFromEuler(new Euler(...STATION.rotation, "XYZ"));
  const toWorld = (x: number, y: number, z: number) => new Vector3(x, y, z).multiplyScalar(STATION.scale).applyQuaternion(quaternion).add(center);

  const spheres: StationLayout["spheres"] = [];
  const halfTruss = STATION.truss.length / 2;
  for (let x = -halfTruss + 6; x <= halfTruss - 6; x += 12) spheres.push({ center: toWorld(x, 0, 0), radius: 4 });
  const halfModules = STATION.modules.length / 2;
  for (let z = -halfModules + 4; z <= halfModules - 4; z += 8) spheres.push({ center: toWorld(0, 0, z), radius: STATION.modules.radius + 1 });
  const wing = STATION.solarWings;
  for (const x of wing.x) {
    for (const y of [-wing.length * 0.75, -wing.length * 0.35, wing.length * 0.35, wing.length * 0.75]) {
      spheres.push({ center: toWorld(x, y, 0), radius: wing.width * 0.62 });
    }
  }
  for (const sphere of spheres) sphere.radius *= STATION.scale;

  const normal = new Vector3(0, 0, 1).applyQuaternion(quaternion);
  const up = new Vector3(0, 1, 0).applyQuaternion(quaternion);
  cached = {
    center,
    quaternion,
    dock: { index: 0, position: toWorld(0, 0, STATION.dock.z), normal, up, radius: STATION.dock.radius * STATION.scale },
    spheres,
  };
  return cached;
}
