import type { Vector3 } from "three";
import { MISSIONS, type MissionDefinition, type MissionId } from "@/game/data/missions";
import { BODIES } from "@/game/data/planets";
import { sunDirectionFor } from "@/game/data/solarSystem";
import { generateCourse, generateEnergyStars, toVector, type PickupSpec, type RingSpec, type SpawnPoint } from "./course";
import { arrivalFor, buildEnvironment } from "./environment";
import { generateCrystals, greedyRoute } from "./objectives";
import { locationAsteroids } from "./scenery";
import { stationLayout } from "./station";

export interface MissionLayout {
  mission: MissionDefinition;
  spawn: SpawnPoint;
  /** Gates to fly through: race rings in order, or the station's docking gate. */
  gates: RingSpec[];
  /** Crystals to collect, or cargo pods to deliver. */
  collectibles: PickupSpec[];
  /** Suggested route from the spawn (racing line / visiting order; used by balance tests). */
  path: Vector3[];
  energyStars: PickupSpec[];
}

const cache = new Map<MissionId, MissionLayout>();

function buildLayout(mission: MissionDefinition): MissionLayout {
  const { location, objective } = mission;
  const sun = sunDirectionFor(location);
  switch (objective.type) {
    case "rings": {
      const course = generateCourse(objective.course, sun);
      return {
        mission,
        spawn: course.spawn,
        gates: course.rings,
        collectibles: [],
        path: course.path,
        energyStars: generateEnergyStars(objective.energyStars, objective.course, sun),
      };
    }
    case "collect": {
      const spawn = arrivalFor(location);
      const crystals = generateCrystals(objective.crystals, locationAsteroids(location), toVector(BODIES[location].position));
      return {
        mission,
        spawn,
        gates: [],
        collectibles: crystals,
        path: greedyRoute(spawn.position, crystals.map((crystal) => crystal.position)),
        energyStars: buildEnvironment(location).pickups,
      };
    }
    case "delivery": {
      const spawn = homeSpawn();
      const dock = stationLayout().dock;
      const pods = objective.pods.map((pod) => ({ position: toVector(pod) }));
      // Pod, then line up in front of the dock and fly through it, nearest pod first.
      const approach = dock.position.clone().addScaledVector(dock.normal, 30);
      const path = [spawn.position.clone()];
      for (const pod of greedyRoute(approach, pods.map((p) => p.position)).slice(1)) path.push(pod, approach, dock.position);
      return { mission, spawn, gates: [dock], collectibles: pods, path, energyStars: buildEnvironment(location).pickups };
    }
    case "photo": {
      const spawn = arrivalFor(location);
      return { mission, spawn, gates: [], collectibles: [], path: [spawn.position], energyStars: buildEnvironment(location).pickups };
    }
  }
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

/** How many objectives finish the mission (rings, crystals or deliveries). */
export function objectiveTotal(layout: MissionLayout): number {
  switch (layout.mission.objective.type) {
    case "rings":
      return layout.gates.length;
    case "photo":
      return 1;
    default:
      return layout.collectibles.length;
  }
}
