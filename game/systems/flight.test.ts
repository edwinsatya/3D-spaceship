import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { COLLISION, FLIGHT } from "@/game/config/flight";
import type { ControlInput } from "@/game/controls/types";
import { resolveShipSphere } from "./collision";
import { createShipState, getShipForward, resetShip, updateFlight } from "./flight";

const DT = 1 / 60;

function idleInput(overrides: Partial<ControlInput> = {}): ControlInput {
  return { pitch: 0, yaw: 0, roll: 0, throttle: 0.5, boost: false, ...overrides };
}

function spawnedShip() {
  const ship = createShipState();
  resetShip(ship, new Vector3(0, 0, 0), new Vector3(0, 0, -1), new Vector3(0, 1, 0));
  return ship;
}

describe("flight model", () => {
  it("eases speed towards the throttle target", () => {
    const ship = spawnedShip();
    const input = idleInput({ throttle: 1 });
    updateFlight(ship, input, DT, { canMove: true, referenceUp: null });
    expect(ship.speed).toBeGreaterThan(0);
    expect(ship.speed).toBeLessThan(FLIGHT.maxSpeed * 0.1);
    for (let i = 0; i < 60 * 6; i++) updateFlight(ship, input, DT, { canMove: true, referenceUp: null });
    expect(ship.speed).toBeCloseTo(FLIGHT.maxSpeed, 0);
  });

  it("boost raises speed above max speed", () => {
    const ship = spawnedShip();
    for (let i = 0; i < 60 * 2; i++) {
      updateFlight(ship, idleInput({ throttle: 1, boost: true }), DT, { canMove: true, referenceUp: null });
    }
    expect(ship.speed).toBeGreaterThan(FLIGHT.maxSpeed * 1.2);
  });

  it("holds still when movement is locked (countdown)", () => {
    const ship = spawnedShip();
    for (let i = 0; i < 60; i++) {
      updateFlight(ship, idleInput({ throttle: 1, yaw: 1 }), DT, { canMove: false, referenceUp: null });
    }
    expect(ship.position.length()).toBeLessThan(1e-6);
  });

  it("turns right with positive yaw and pitches up with positive pitch", () => {
    const ship = spawnedShip();
    for (let i = 0; i < 30; i++) {
      updateFlight(ship, idleInput({ yaw: 1 }), DT, { canMove: true, referenceUp: null });
    }
    const forward = getShipForward(ship, new Vector3());
    expect(forward.x).toBeGreaterThan(0.1);

    const ship2 = spawnedShip();
    for (let i = 0; i < 30; i++) {
      updateFlight(ship2, idleInput({ pitch: 1 }), DT, { canMove: true, referenceUp: null });
    }
    expect(getShipForward(ship2, new Vector3()).y).toBeGreaterThan(0.1);
  });

  it("auto-levels the roll towards the reference up", () => {
    const ship = spawnedShip();
    ship.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.9));
    const up = new Vector3(0, 1, 0);
    for (let i = 0; i < 60 * 5; i++) updateFlight(ship, idleInput(), DT, { canMove: true, referenceUp: up });
    const shipUp = new Vector3(0, 1, 0).applyQuaternion(ship.quaternion);
    expect(shipUp.dot(up)).toBeGreaterThan(0.98);
  });
});

describe("collision", () => {
  it("bounces the ship out of a sphere and slows it down", () => {
    const ship = spawnedShip();
    ship.speed = FLIGHT.maxSpeed;
    ship.velocity.set(0, 0, -FLIGHT.maxSpeed);
    ship.position.set(0, 0, -8.5);
    const center = new Vector3(0, 0, -15);
    const strength = resolveShipSphere(ship, FLIGHT.collisionRadius, center, 6, COLLISION, FLIGHT.maxSpeed);
    expect(strength).toBeGreaterThan(0.5);
    expect(ship.position.distanceTo(center)).toBeGreaterThanOrEqual(6 + FLIGHT.collisionRadius);
    expect(ship.speed).toBeLessThan(FLIGHT.maxSpeed);
    expect(ship.knockback.z).toBeGreaterThan(0);
  });

  it("ignores spheres that are not touching", () => {
    const ship = spawnedShip();
    expect(resolveShipSphere(ship, 1, new Vector3(0, 0, -50), 5, COLLISION, FLIGHT.maxSpeed)).toBe(0);
  });
});
