import { describe, expect, it } from "vitest";
import { FLIGHT } from "@/game/config/flight";
import { MISSION_ORDER, MISSIONS } from "@/game/data/missions";
import { SHIPS } from "@/game/data/ships";
import { flyWaypoints, missionWaypoints } from "./autopilot";
import { getMissionLayout } from "./missionLayout";

/**
 * Balance check: an autopilot flies every mission with the real flight model
 * and every ship. Guards the star thresholds against accidental tuning changes:
 * a clean pilot earns two stars, three stars need boost.
 */
const timedMissions = MISSION_ORDER.filter((id) => MISSIONS[id].rating.kind === "time");

describe.each(timedMissions)("%s balance", (id) => {
  const layout = getMissionLayout(id);
  const waypoints = missionWaypoints(layout);
  const { three, two } = MISSIONS[id].rating;

  it("can be completed by a clean pilot", () => {
    const cruise = flyWaypoints(layout, waypoints, false);
    expect(cruise).toBeLessThan(150);
    expect(flyWaypoints(layout, waypoints, true)).toBeLessThan(cruise);
  });

  it.each(SHIPS.map((ship) => [ship.id, ship] as const))("is fair for the %s: boost is needed for three stars", (_ship, definition) => {
    const cruise = flyWaypoints(layout, waypoints, false, definition);
    const boosted = flyWaypoints(layout, waypoints, true, definition);
    expect(cruise).toBeGreaterThan(three);
    expect(boosted).toBeLessThan(three);
    expect(cruise).toBeLessThan(two);
  });

  it("uses speeds consistent with the route length", () => {
    let length = 0;
    for (let i = 1; i < layout.path.length; i++) length += layout.path[i].distanceTo(layout.path[i - 1]);
    expect(length / FLIGHT.maxSpeed).toBeLessThan(two);
  });
});
