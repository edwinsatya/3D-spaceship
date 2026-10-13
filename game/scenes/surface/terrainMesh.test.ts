import { describe, expect, it } from "vitest";
import { MOON_SURFACE } from "@/game/data/surfaces";
import { createTerrain } from "@/game/systems/terrain";
import { createTerrainBuilder, createTerrainGeometry, prebuildTerrain, takeTerrainGeometry } from "./terrainMesh";

describe("terrain mesh builder", () => {
  const terrain = createTerrain(MOON_SURFACE);

  it("builds the same ground in small steps as in one go", () => {
    const builder = createTerrainBuilder(terrain, 24);
    let steps = 0;
    while (!builder.step(-1)) steps++;
    const stepped = builder.finish();
    const direct = createTerrainGeometry(terrain, 24);
    expect(steps).toBeGreaterThan(2);
    expect(Array.from(stepped.attributes.position.array)).toEqual(Array.from(direct.attributes.position.array));
    expect(Array.from(stepped.attributes.color.array)).toEqual(Array.from(direct.attributes.color.array));
  });

  it("hands over a prebuilt geometry once, then starts fresh", () => {
    prebuildTerrain(terrain, 16, Infinity);
    const first = takeTerrainGeometry(terrain, 16);
    const second = takeTerrainGeometry(terrain, 16);
    expect(first).not.toBe(second);
    expect(first.attributes.color).toBeDefined();
  });
});
