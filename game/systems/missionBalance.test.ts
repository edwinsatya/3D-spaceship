import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { FLIGHT } from "@/game/config/flight";
import { WORLD } from "@/game/config/world";
import type { ControlInput } from "@/game/controls/types";
import { ORBIT_RINGS } from "@/game/data/missions";
import { clamp } from "./math";
import { generateCourse, segmentCrossesDisc } from "./course";
import { createShipState, resetShip, updateFlight } from "./flight";

/**
 * Balance check: an autopilot flies the real course with the real flight
 * model. Guards the star thresholds against accidental tuning changes.
 */
function flyCourse(useBoost: boolean): number {
  const layout = generateCourse(ORBIT_RINGS.course, WORLD.sunDirection);
  const ship = createShipState();
  resetShip(ship, layout.spawn.position, layout.spawn.forward, layout.spawn.up);
  const input: ControlInput = { pitch: 0, yaw: 0, roll: 0, throttle: 1, boost: false };
  const inverse = new Quaternion();
  const local = new Vector3();
  const up = new Vector3();
  const dt = 1 / 60;
  let next = 0;
  let time = 0;

  while (next < layout.rings.length && time < 300) {
    const ring = layout.rings[next];
    inverse.copy(ship.quaternion).invert();
    local.subVectors(ring.position, ship.position).normalize().applyQuaternion(inverse);
    input.yaw = local.z > 0 ? Math.sign(local.x || 1) : clamp(local.x * 4, -1, 1);
    input.pitch = local.z > 0 ? 0 : clamp(local.y * 4, -1, 1);
    input.boost = useBoost && local.z < -0.97;
    up.copy(ship.position).normalize();
    updateFlight(ship, input, dt, { canMove: true, referenceUp: up });
    if (segmentCrossesDisc(ship.previousPosition, ship.position, ring.position, ring.normal, ring.radius)) next++;
    time += dt;
  }
  return time;
}

describe("orbit rings balance", () => {
  const { three, two } = ORBIT_RINGS.starThresholds;
  const cruise = flyCourse(false);
  const boosted = flyCourse(true);

  it("can be completed by a clean pilot", () => {
    expect(cruise).toBeLessThan(120);
    expect(boosted).toBeLessThan(cruise);
  });

  it("needs boost for three stars", () => {
    expect(cruise).toBeGreaterThan(three);
    expect(boosted).toBeLessThan(three);
  });

  it("gives two stars to a clean pilot without boost", () => {
    expect(cruise).toBeLessThan(two);
  });

  it("uses speeds consistent with the course length", () => {
    const layout = generateCourse(ORBIT_RINGS.course, WORLD.sunDirection);
    expect(layout.pathLength / FLIGHT.maxSpeed).toBeLessThan(two);
  });
});
