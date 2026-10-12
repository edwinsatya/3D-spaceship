import { Clock, warn } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installThreeConsoleFilter } from "./threeConsole";

describe("three.js console filter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops the THREE.Clock deprecation warning", () => {
    installThreeConsoleFilter();
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    new Clock();
    expect(spy).not.toHaveBeenCalled();
  });

  it("forwards every other three.js warning", () => {
    installThreeConsoleFilter();
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warn("WebGLRenderer: Something else.");
    expect(spy).toHaveBeenCalledWith("THREE.WebGLRenderer: Something else.");
  });
});
