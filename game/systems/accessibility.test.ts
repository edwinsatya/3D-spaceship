import { afterEach, describe, expect, it } from "vitest";
import { PALETTES } from "@/game/config/palette";
import { accessibility, resolveReducedMotion, setPalette } from "./accessibility";
import { addTrauma } from "./cameraRig";
import { runtime } from "./runtime";

afterEach(() => {
  accessibility.reducedMotion = false;
  setPalette("standard");
  runtime.camera.trauma = 0;
});

describe("accessibility", () => {
  it("follows the device unless the player chooses", () => {
    expect(resolveReducedMotion("system", true)).toBe(true);
    expect(resolveReducedMotion("system", false)).toBe(false);
    expect(resolveReducedMotion("full", true)).toBe(false);
    expect(resolveReducedMotion("reduced", false)).toBe(true);
  });

  it("removes screen shake when motion is reduced", () => {
    addTrauma(runtime.camera, 0.5);
    expect(runtime.camera.trauma).toBe(0.5);
    runtime.camera.trauma = 0;
    accessibility.reducedMotion = true;
    addTrauma(runtime.camera, 0.5);
    expect(runtime.camera.trauma).toBe(0);
  });

  it("swaps the status colours for the colour-blind palette", () => {
    setPalette("colorblind");
    expect(accessibility.palette.target.poi).toBe(PALETTES.colorblind.target.poi);
    expect(`#${accessibility.colors.success.getHexString()}`).toBe(PALETTES.colorblind.success);
    expect(PALETTES.colorblind.success).not.toBe(PALETTES.standard.success);
  });
});
