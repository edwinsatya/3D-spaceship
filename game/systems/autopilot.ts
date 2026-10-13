import { Quaternion, Vector3 } from "three";
import type { ControlInput } from "@/game/controls/types";
import { SHIPS, type ShipDefinition } from "@/game/data/ships";
import { segmentCrossesDisc, type RingSpec } from "./course";
import { createShipState, resetShip, updateFlight } from "./flight";
import { clamp } from "./math";
import type { MissionLayout } from "./missionLayout";
import { boostConfigFor, flightConfigFor } from "./shipConfig";
import { buildEnvironment, referenceUpAt } from "./environment";
import { MISSION } from "@/game/config/mission";

/** A waypoint the autopilot must reach: fly through a gate or touch a point. */
export type Waypoint = { gate: RingSpec } | { point: Vector3; radius: number };

/** The order a clean pilot would fly a mission in (balance tests only). */
export function missionWaypoints(layout: MissionLayout): Waypoint[] {
  const objective = layout.mission.objective;
  if (objective.type === "rings") return layout.gates.map((gate) => ({ gate }));
  if (objective.type === "collect") {
    // path[0] is the spawn; the rest is the nearest-first visiting order.
    return layout.path.slice(1).map((point) => ({ point, radius: MISSION.crystalPickupRadius }));
  }
  const dock = layout.gates[0];
  const waypoints: Waypoint[] = [];
  // path = spawn, then (pod, approach, dock) per delivery.
  for (let i = 1; i + 2 < layout.path.length; i += 3) {
    waypoints.push({ point: layout.path[i], radius: MISSION.podPickupRadius });
    waypoints.push({ point: layout.path[i + 1], radius: 12 });
    waypoints.push({ gate: dock });
  }
  return waypoints;
}

/**
 * Flies the waypoints with the real flight model and a simple steering
 * autopilot; returns the time taken in seconds (balance tests only).
 */
export function flyWaypoints(
  layout: MissionLayout,
  waypoints: readonly Waypoint[],
  useBoost: boolean,
  shipDefinition: ShipDefinition = SHIPS[0],
): number {
  const environment = buildEnvironment(layout.mission.location);
  const flight = flightConfigFor(shipDefinition);
  const boost = boostConfigFor(shipDefinition);
  const ship = createShipState();
  resetShip(ship, layout.spawn.position, layout.spawn.forward, layout.spawn.up);
  const input: ControlInput = { pitch: 0, yaw: 0, roll: 0, throttle: 1, boost: false };
  const inverse = new Quaternion();
  const local = new Vector3();
  const up = new Vector3();
  const dt = 1 / 60;
  let next = 0;
  let time = 0;

  while (next < waypoints.length && time < 400) {
    const waypoint = waypoints[next];
    const target = "gate" in waypoint ? waypoint.gate.position : waypoint.point;
    inverse.copy(ship.quaternion).invert();
    local.subVectors(target, ship.position).normalize().applyQuaternion(inverse);
    input.yaw = local.z > 0 ? Math.sign(local.x || 1) : clamp(local.x * 4, -1, 1);
    input.pitch = local.z > 0 ? 0 : clamp(local.y * 4, -1, 1);
    // Like a player: hold boost while lined up, tap it again once energy has recharged.
    input.boost = useBoost && local.z < -0.97 && (ship.boost.active || ship.boost.energy > 0.6);
    referenceUpAt(environment, ship.position, up);
    updateFlight(ship, input, dt, { canMove: true, referenceUp: up }, flight, boost);
    const reached =
      "gate" in waypoint
        ? segmentCrossesDisc(ship.previousPosition, ship.position, waypoint.gate.position, waypoint.gate.normal, waypoint.gate.radius)
        : ship.position.distanceTo(waypoint.point) <= waypoint.radius + flight.collisionRadius;
    if (reached) next++;
    time += dt;
  }
  return time;
}
