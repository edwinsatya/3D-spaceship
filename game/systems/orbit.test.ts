import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { EXPLORATION } from "@/game/config/exploration";
import { buildEnvironment } from "./environment";
import { advanceOrbit, createOrbitState, engageOrbit, orbitCandidate, orbitPose } from "./orbit";

const config = EXPLORATION.orbit;
const mars = buildEnvironment("mars").colliders[0];

describe("orbit autopilot", () => {
  it("offers the planet only within range", () => {
    const colliders = buildEnvironment("mars").colliders;
    const near = new Vector3(mars.surfaceRadius * 2, 0, 0);
    const far = new Vector3(mars.surfaceRadius * 10, 0, 0);
    expect(orbitCandidate(near, colliders, config)?.id).toBe("mars");
    expect(orbitCandidate(far, colliders, config)).toBeNull();
  });

  it("never offers decorative moons", () => {
    const colliders = buildEnvironment("mars").colliders;
    const phobos = colliders.find((collider) => collider.id === null)!;
    const next = phobos.center.clone().add(new Vector3(phobos.radius + 2, 0, 0));
    expect(orbitCandidate(next, colliders, config)?.id).not.toBeNull();
  });

  it("keeps a constant, clamped radius and moves along the heading", () => {
    const state = createOrbitState();
    const start = new Vector3(mars.surfaceRadius * 1.1, 0, 0);
    const forward = new Vector3(0, 0, -1);
    engageOrbit(state, start, forward, mars, config);
    expect(state.radius).toBeCloseTo(mars.surfaceRadius * config.minRadius);

    const position = new Vector3();
    const tangent = new Vector3();
    orbitPose(state, position, tangent);
    expect(tangent.dot(forward)).toBeGreaterThan(0.99);
    for (let i = 0; i < 600; i++) advanceOrbit(state, 1 / 60, config);
    orbitPose(state, position, tangent);
    expect(position.distanceTo(mars.center)).toBeCloseTo(state.radius);
    expect(state.blend).toBe(1);
    expect(Math.abs(tangent.dot(position.clone().sub(mars.center).normalize()))).toBeLessThan(1e-6);
  });

  it("handles engaging while flying straight at the planet", () => {
    const state = createOrbitState();
    const start = new Vector3(mars.surfaceRadius * 2, 0, 0);
    engageOrbit(state, start, new Vector3(-1, 0, 0), mars, config);
    expect(state.normal.length()).toBeCloseTo(1);
    expect(Number.isFinite(state.e2.x)).toBe(true);
  });
});
