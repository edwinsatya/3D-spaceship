import { describe, expect, it } from "vitest";
import { mergeMissionResult, migrateProgress, totalStars } from "./progressStore";

describe("mergeMissionResult", () => {
  it("records the first run as best", () => {
    const { progress, outcome } = mergeMissionResult(undefined, 40_000, 2);
    expect(progress).toEqual({ bestTimeMs: 40_000, bestStars: 2, completions: 1 });
    expect(outcome).toEqual({ isNewBest: true, previousBestMs: null, bestTimeMs: 40_000 });
  });

  it("keeps the faster time and the higher star count", () => {
    const first = mergeMissionResult(undefined, 30_000, 2).progress;
    const { progress, outcome } = mergeMissionResult(first, 35_000, 1);
    expect(progress.bestTimeMs).toBe(30_000);
    expect(progress.bestStars).toBe(2);
    expect(progress.completions).toBe(2);
    expect(outcome.isNewBest).toBe(false);
    expect(outcome.previousBestMs).toBe(30_000);
  });

  it("replaces the best time when beaten", () => {
    const first = mergeMissionResult(undefined, 30_000, 2).progress;
    const { progress, outcome } = mergeMissionResult(first, 25_000, 3);
    expect(progress.bestTimeMs).toBe(25_000);
    expect(progress.bestStars).toBe(3);
    expect(outcome.isNewBest).toBe(true);
  });
});

describe("migrateProgress", () => {
  it("moves v1 saves to the English default but keeps records and settings", () => {
    const v1 = {
      missions: { "orbit-rings": { bestTimeMs: 30_000, bestStars: 2, completions: 3 } },
      settings: { muted: true, locale: "id" },
      onboarding: { completedHints: ["steer"] },
    };
    const migrated = migrateProgress(v1, 1);
    expect(migrated.settings).toEqual({ muted: true, locale: "en" });
    expect(migrated.missions["orbit-rings"]?.bestTimeMs).toBe(30_000);
    expect(migrated.onboarding.completedHints).toEqual(["steer"]);
  });

  it("fills defaults for empty saves", () => {
    expect(migrateProgress(undefined, 0)).toEqual({
      missions: {},
      settings: { muted: false, locale: "en" },
      onboarding: { completedHints: [] },
      ships: { selected: "comet", paint: {} },
      discovered: [],
      landed: [],
      pointsOfInterest: [],
    });
  });

  it("drops unknown body ids from older or tampered saves", () => {
    const migrated = migrateProgress({ discovered: ["mars", "pluto", "earth"], landed: ["vulcan"] }, 2);
    expect(migrated.discovered).toEqual(["mars", "earth"]);
    expect(migrated.landed).toEqual([]);
  });
});

describe("totalStars", () => {
  it("sums best stars across missions", () => {
    expect(totalStars({})).toBe(0);
    expect(totalStars({ "orbit-rings": { bestTimeMs: 1, bestStars: 3, completions: 1 } })).toBe(3);
  });
});
