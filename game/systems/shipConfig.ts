import { BOOST, FLIGHT, type BoostConfig, type FlightConfig } from "@/game/config/flight";
import {
  DEFAULT_SHIP,
  isDecalId,
  isShipId,
  SHIPS_BY_ID,
  type ShipCustomization,
  type ShipDefinition,
  type ShipId,
} from "@/game/data/ships";

/** Base tuning scaled by the ship's modifiers (pure; unit-tested). */
export function flightConfigFor(ship: ShipDefinition): FlightConfig {
  const m = ship.modifiers;
  return {
    ...FLIGHT,
    maxSpeed: FLIGHT.maxSpeed * m.maxSpeed,
    boostSpeed: FLIGHT.boostSpeed * m.boostSpeed,
    accelResponse: FLIGHT.accelResponse * m.accel,
    pitchRate: FLIGHT.pitchRate * m.turn,
    yawRate: FLIGHT.yawRate * m.turn,
    rollRate: FLIGHT.rollRate * m.roll,
    collisionRadius: ship.design.collisionRadius,
  };
}

export function boostConfigFor(ship: ShipDefinition): BoostConfig {
  const m = ship.modifiers;
  return {
    ...BOOST,
    drainPerSecond: BOOST.drainPerSecond * m.boostDrain,
    regenPerSecond: BOOST.regenPerSecond * m.boostRegen,
  };
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Saved paint merged over the ship defaults; invalid saved values fall back. */
export function resolvePaint(id: ShipId, saved?: Partial<ShipCustomization>): ShipCustomization {
  const defaults = SHIPS_BY_ID[id].defaults;
  const color = (value: unknown, fallback: string) =>
    typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;
  return {
    body: color(saved?.body, defaults.body),
    accent: color(saved?.accent, defaults.accent),
    trail: color(saved?.trail, defaults.trail),
    decal: isDecalId(saved?.decal) ? saved.decal : defaults.decal,
  };
}

export function resolveShipId(value: unknown): ShipId {
  return isShipId(value) ? value : DEFAULT_SHIP;
}
