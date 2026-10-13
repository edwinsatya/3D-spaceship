import type { Vector3 } from "three";
import { MISSIONS, type MissionDefinition, type MissionId } from "@/game/data/missions";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { generateCourse, generateEnergyStars, type PickupSpec, type RingSpec, type SpawnPoint } from "./course";

export interface MissionLayout {
  mission: MissionDefinition;
  spawn: SpawnPoint;
  /** Gates to fly through in order (race rings). */
  gates: RingSpec[];
  /** Suggested route from the spawn (racing line; used by balance tests). */
  path: Vector3[];
  energyStars: PickupSpec[];
}

const cache = new Map<MissionId, MissionLayout>();

function buildLayout(mission: MissionDefinition): MissionLayout {
  const sun = sunDirectionFor(mission.location);
  const objective = mission.objective;
  const course = generateCourse(objective.course, sun);
  return {
    mission,
    spawn: course.spawn,
    gates: course.rings,
    path: course.path,
    energyStars: generateEnergyStars(objective.energyStars, objective.course, sun),
  };
}

/** Deterministic layout, generated once and shared by rendering and gameplay. */
export function getMissionLayout(id: MissionId): MissionLayout {
  let layout = cache.get(id);
  if (!layout) {
    layout = buildLayout(MISSIONS[id]);
    cache.set(id, layout);
  }
  return layout;
}

/** Menu, hangar, free flight and test flights start where Orbit Rings starts. */
export function homeSpawn(): SpawnPoint {
  return getMissionLayout("orbit-rings").spawn;
}

/** Earth's free-flight energy stars are the ones along the Orbit Rings course. */
export function homeEnergyStars(): PickupSpec[] {
  return getMissionLayout("orbit-rings").energyStars;
}
