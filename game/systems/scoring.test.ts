import { describe, expect, it } from "vitest";
import { formatTime, isNewBest, nextStarGoal, rateMission, rateTime } from "./scoring";

const thresholds = { three: 30, two: 45 };

describe("rateTime", () => {
  it("gives 3 stars at or under the three-star threshold", () => {
    expect(rateTime(25_000, thresholds)).toBe(3);
    expect(rateTime(30_000, thresholds)).toBe(3);
  });

  it("gives 2 stars between thresholds", () => {
    expect(rateTime(30_001, thresholds)).toBe(2);
    expect(rateTime(45_000, thresholds)).toBe(2);
  });

  it("always gives at least 1 star for a finished run", () => {
    expect(rateTime(45_001, thresholds)).toBe(1);
    expect(rateTime(10 * 60_000, thresholds)).toBe(1);
  });
});

describe("rateMission", () => {
  it("rates timed missions like rateTime", () => {
    expect(rateMission(30_000, { kind: "time", ...thresholds })).toBe(3);
    expect(rateMission(45_001, { kind: "time", ...thresholds })).toBe(1);
  });

  it("rates photo scores: higher is better", () => {
    const rating = { kind: "score", three: 85, two: 60 } as const;
    expect(rateMission(90, rating)).toBe(3);
    expect(rateMission(85, rating)).toBe(3);
    expect(rateMission(70, rating)).toBe(2);
    expect(rateMission(10, rating)).toBe(1);
  });
});

describe("nextStarGoal", () => {
  it("points to the next time threshold (ms)", () => {
    expect(nextStarGoal(1, { kind: "time", ...thresholds })).toEqual({ stars: 2, value: 45_000 });
    expect(nextStarGoal(2, { kind: "time", ...thresholds })).toEqual({ stars: 3, value: 30_000 });
    expect(nextStarGoal(3, { kind: "time", ...thresholds })).toBeNull();
  });

  it("points to the next score threshold", () => {
    expect(nextStarGoal(1, { kind: "score", three: 85, two: 60 })).toEqual({ stars: 2, value: 60 });
  });
});

describe("isNewBest", () => {
  it("is a best when there is no previous record", () => {
    expect(isNewBest(50_000, null)).toBe(true);
  });

  it("requires a strictly faster time", () => {
    expect(isNewBest(40_000, 41_000)).toBe(true);
    expect(isNewBest(41_000, 41_000)).toBe(false);
    expect(isNewBest(42_000, 41_000)).toBe(false);
  });
});

describe("formatTime", () => {
  it("formats m:ss.cc", () => {
    expect(formatTime(0)).toBe("0:00.00");
    expect(formatTime(5_420)).toBe("0:05.42");
    expect(formatTime(65_429)).toBe("1:05.42");
    expect(formatTime(600_000)).toBe("10:00.00");
  });

  it("clamps negative values", () => {
    expect(formatTime(-500)).toBe("0:00.00");
  });
});
