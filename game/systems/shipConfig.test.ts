import { describe, expect, it } from "vitest";
import { BOOST, FLIGHT } from "@/game/config/flight";
import { DECALS, SHIPS, SHIPS_BY_ID } from "@/game/data/ships";
import { createDecalGeometry, createShipGeometries } from "@/game/entities/ship/shipGeometry";
import { boostConfigFor, flightConfigFor, resolvePaint, resolveShipId } from "./shipConfig";

describe("ship tuning", () => {
  it("keeps the Comet identical to the base tuning", () => {
    const comet = SHIPS_BY_ID.comet;
    expect(flightConfigFor(comet)).toEqual({ ...FLIGHT, collisionRadius: comet.design.collisionRadius });
    expect(boostConfigFor(comet)).toEqual({ ...BOOST });
  });

  it("applies each ship's modifiers", () => {
    expect(flightConfigFor(SHIPS_BY_ID.swift).maxSpeed).toBeGreaterThan(FLIGHT.maxSpeed);
    expect(flightConfigFor(SHIPS_BY_ID.nova).yawRate).toBeGreaterThan(FLIGHT.yawRate);
    expect(boostConfigFor(SHIPS_BY_ID.titan).drainPerSecond).toBeLessThan(BOOST.drainPerSecond);
  });

  it("shows stats that match the modifiers' strengths", () => {
    const best = (stat: "speed" | "handling" | "boost") =>
      SHIPS.reduce((a, b) => (b.stats[stat] > a.stats[stat] ? b : a)).id;
    expect(best("speed")).toBe("swift");
    expect(best("handling")).toBe("nova");
    expect(best("boost")).toBe("titan");
  });
});

describe("paint", () => {
  it("falls back to ship defaults for missing or invalid values", () => {
    const paint = resolvePaint("nova", { body: "#123456", accent: "red", decal: "skull" as never });
    expect(paint.body).toBe("#123456");
    expect(paint.accent).toBe(SHIPS_BY_ID.nova.defaults.accent);
    expect(paint.decal).toBe(SHIPS_BY_ID.nova.defaults.decal);
    expect(paint.trail).toBe(SHIPS_BY_ID.nova.defaults.trail);
  });

  it("resolves unknown ship ids to the default ship", () => {
    expect(resolveShipId("ufo")).toBe("comet");
    expect(resolveShipId("titan")).toBe("titan");
  });
});

describe("ship geometry", () => {
  it.each(SHIPS.map((ship) => ship.id))("builds the %s model and every decal", (id) => {
    const { design } = SHIPS_BY_ID[id];
    const parts = createShipGeometries(design);
    expect(parts.fuselage.attributes.position.count).toBeGreaterThan(0);
    expect(parts.fins.length).toBe(design.fins.layout === "single" ? 1 : 2);
    for (const decal of DECALS) {
      const geometry = createDecalGeometry(design, decal);
      if (decal === "none") expect(geometry).toBeNull();
      else expect(geometry?.attributes.position.count).toBeGreaterThan(0);
    }
  });

  it("keeps nozzles behind the ship's centre", () => {
    for (const ship of SHIPS) {
      for (const [, , z] of ship.design.engines.nozzles) expect(z).toBeGreaterThan(0.5);
    }
  });
});
