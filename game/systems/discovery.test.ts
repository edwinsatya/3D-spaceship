import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { EXPLORATION } from "@/game/config/exploration";
import type { BodyId } from "@/game/data/planets";
import { arrivalFor, buildEnvironment } from "./environment";
import { findDiscovery } from "./discovery";

const factor = EXPLORATION.discoveryDistance;

describe("discovery", () => {
  it("discovers a planet once you get close", () => {
    const { colliders } = buildEnvironment("mars");
    expect(findDiscovery(new Vector3(146 * 10, 0, 0), colliders, new Set(), factor)).toBeNull();
    expect(findDiscovery(new Vector3(146 * 3, 0, 0), colliders, new Set(), factor)).toBe("mars");
  });

  it("does not repeat a discovery", () => {
    const { colliders } = buildEnvironment("mars");
    expect(findDiscovery(new Vector3(146 * 3, 0, 0), colliders, new Set<BodyId>(["mars"]), factor)).toBeNull();
  });

  it.each(["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"] as const)(
    "discovers %s right at the warp arrival point",
    (location) => {
      const { colliders } = buildEnvironment(location);
      expect(findDiscovery(arrivalFor(location).position, colliders, new Set(), factor)).toBe(location);
    },
  );

  it("finds the Moon only near the Moon", () => {
    const { colliders } = buildEnvironment("earth");
    const discovered = new Set<BodyId>(["earth"]);
    const moon = colliders.find((collider) => collider.id === "moon")!;
    expect(findDiscovery(new Vector3(0, 0, 300), colliders, discovered, factor)).toBeNull();
    expect(findDiscovery(moon.center.clone().add(new Vector3(100, 0, 0)), colliders, discovered, factor)).toBe("moon");
  });
});
