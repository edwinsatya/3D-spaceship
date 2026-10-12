import { WORLD } from "@/game/config/world";
import { MISSIONS, type MissionId } from "@/game/data/missions";
import {
  generateAsteroids,
  generateCourse,
  generateEnergyStars,
  type AsteroidSpec,
  type CourseLayout,
  type PickupSpec,
} from "./course";

export interface MissionLayout {
  course: CourseLayout;
  asteroids: AsteroidSpec[];
  energyStars: PickupSpec[];
}

const cache = new Map<MissionId, MissionLayout>();

/** Deterministic layout, generated once and shared by rendering and gameplay. */
export function getMissionLayout(id: MissionId): MissionLayout {
  let layout = cache.get(id);
  if (!layout) {
    const mission = MISSIONS[id];
    const course = generateCourse(mission.course, WORLD.sunDirection);
    layout = {
      course,
      asteroids: generateAsteroids(mission.asteroids, mission.course, course, WORLD.sunDirection),
      energyStars: generateEnergyStars(mission.energyStars, mission.course, WORLD.sunDirection),
    };
    cache.set(id, layout);
  }
  return layout;
}
