import type { MissionRating } from "@/game/data/missions";

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

/** Stars for a finished run: by time (lower is better) or by score (higher is better). */
export function rateMission(value: number, rating: MissionRating): StarRating {
  if (rating.kind === "time") return rateTime(value, rating);
  if (value >= rating.three) return 3;
  if (value >= rating.two) return 2;
  return 1;
}

/** What the next star needs: a time (ms) or a score, or null when already at 3. */
export function nextStarGoal(stars: StarRating, rating: MissionRating): { stars: StarRating; value: number } | null {
  if (stars === 3) return null;
  const threshold = stars === 2 ? rating.three : rating.two;
  return { stars: stars === 2 ? 3 : 2, value: rating.kind === "time" ? threshold * 1000 : threshold };
}

export function isNewBest(value: number, previousBest: number | null, lowerIsBetter = true): boolean {
  if (previousBest === null) return true;
  return lowerIsBetter ? value < previousBest : value > previousBest;
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
