import { describe, expect, it } from "vitest";
import { formatTime, isNewBest, nextStarTarget, rateTime } from "./scoring";

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

describe("nextStarTarget", () => {
  it("points to the next threshold", () => {
    expect(nextStarTarget(1, thresholds)).toEqual({ stars: 2, timeMs: 45_000 });
    expect(nextStarTarget(2, thresholds)).toEqual({ stars: 3, timeMs: 30_000 });
    expect(nextStarTarget(3, thresholds)).toBeNull();
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
