export type StarRating = 1 | 2 | 3;

export interface StarThresholds {
  /** Seconds at or under which the run earns 3 stars. */
  three: number;
  /** Seconds at or under which the run earns 2 stars. */
  two: number;
}

/** Any finished run earns at least one star — there is no failing. */
export function rateTime(timeMs: number, thresholds: StarThresholds): StarRating {
  const seconds = timeMs / 1000;
  if (seconds <= thresholds.three) return 3;
  if (seconds <= thresholds.two) return 2;
  return 1;
}

/** Threshold (ms) needed for the next star, or null when already at 3. */
export function nextStarTarget(
  stars: StarRating,
  thresholds: StarThresholds,
): { stars: StarRating; timeMs: number } | null {
  if (stars === 3) return null;
  if (stars === 2) return { stars: 3, timeMs: thresholds.three * 1000 };
  return { stars: 2, timeMs: thresholds.two * 1000 };
}

export function isNewBest(timeMs: number, previousBestMs: number | null): boolean {
  return previousBestMs === null || timeMs < previousBestMs;
}

/** Formats milliseconds as m:ss.cc (e.g. 1:05.42). */
export function formatTime(timeMs: number): string {
  const safe = Math.max(0, Math.floor(timeMs));
  const totalCentis = Math.floor(safe / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}
