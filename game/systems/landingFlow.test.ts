import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildEnvironment } from "./environment";
import { landingCandidate } from "./landingFlow";

describe("landing candidate", () => {
  const earth = buildEnvironment("earth");
  const moon = earth.colliders.find((collider) => collider.id === "moon")!;

  it("offers the Moon when you fly low over it", () => {
    const position = moon.center.clone().add(new Vector3(0, moon.surfaceRadius * 1.5, 0));
    expect(landingCandidate(position, earth.colliders)?.id).toBe("moon");
  });

  it("offers nothing far from every body", () => {
    expect(landingCandidate(new Vector3(5000, 5000, 5000), earth.colliders)).toBeNull();
  });

  it("offers gas giants too, so the game can explain why you can't land", () => {
    const jupiter = buildEnvironment("jupiter");
    const body = jupiter.colliders[0];
    const position = body.center.clone().add(new Vector3(body.surfaceRadius * 1.6, 0, 0));
    expect(landingCandidate(position, jupiter.colliders)?.id).toBe("jupiter");
  });
});
