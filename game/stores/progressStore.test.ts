import { describe, expect, it } from "vitest";
import { mergeMissionResult, migrateProgress, totalStars } from "./progressStore";

describe("mergeMissionResult", () => {
  it("records the first run as best", () => {
    const { progress, outcome } = mergeMissionResult(undefined, 40_000, 2);
    expect(progress).toEqual({ best: 40_000, bestStars: 2, completions: 1 });
    expect(outcome).toEqual({ isNewBest: true, previousBest: null, best: 40_000 });
  });

  it("keeps the faster time and the higher star count", () => {
    const first = mergeMissionResult(undefined, 30_000, 2).progress;
    const { progress, outcome } = mergeMissionResult(first, 35_000, 1);
    expect(progress.best).toBe(30_000);
    expect(progress.bestStars).toBe(2);
    expect(progress.completions).toBe(2);
    expect(outcome.isNewBest).toBe(false);
    expect(outcome.previousBest).toBe(30_000);
  });

  it("replaces the best time when beaten", () => {
    const first = mergeMissionResult(undefined, 30_000, 2).progress;
    const { progress, outcome } = mergeMissionResult(first, 25_000, 3);
    expect(progress.best).toBe(25_000);
    expect(progress.bestStars).toBe(3);
    expect(outcome.isNewBest).toBe(true);
  });

  it("keeps the higher score for score-rated missions", () => {
    const first = mergeMissionResult(undefined, 70, 2, false).progress;
    expect(mergeMissionResult(first, 60, 1, false).outcome.isNewBest).toBe(false);
    const { progress, outcome } = mergeMissionResult(first, 92, 3, false);
    expect(progress.best).toBe(92);
    expect(outcome).toEqual({ isNewBest: true, previousBest: 70, best: 92 });
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
    expect(migrated.missions["orbit-rings"]?.best).toBe(30_000);
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
      badges: [],
      photosTaken: 0,
    });
  });

  it("renames v2 mission records and drops unknown missions", () => {
    const v2 = { missions: { "orbit-rings": { bestTimeMs: 31_000, bestStars: 3, completions: 4 }, "moon-race": { bestStars: 3 } } };
    expect(migrateProgress(v2, 2).missions).toEqual({ "orbit-rings": { best: 31_000, bestStars: 3, completions: 4 } });
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
    expect(totalStars({ "orbit-rings": { best: 1, bestStars: 3, completions: 1 } })).toBe(3);
  });
});
