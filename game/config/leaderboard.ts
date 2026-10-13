import type { MissionId } from "@/game/data/missions";

/**
 * Fastest believable time per mission (s), checked by the server
 * (leaderboard_min_ms in supabase/migrations/20261013020000_leaderboard.sql;
 * a unit test keeps the two in step). About 55% of the best autopilot time.
 * Only timed missions have a board: a photo score is worked out on the
 * device, so the server has nothing to check it against.
 */
const MIN_SECONDS: Partial<Record<MissionId, number>> = {
  "orbit-rings": 12,
  "station-delivery": 30,
  "belt-slalom": 17,
  "crystal-hunt": 25,
  "saturn-ring-run": 16,
};

/** Best-time leaderboards (Supabase; needs a signed-in player to post). */
export const LEADERBOARD = {
  minSeconds: MIN_SECONDS,
  /** Rows shown per board (the server caps it at 50). */
  top: 10,
  /** A board shown again after this long is fetched again (ms). */
  refreshAfter: 60_000,
  rpc: {
    start: "leaderboard_start_run",
    submit: "leaderboard_submit_run",
    top: "leaderboard_top",
    setNickname: "leaderboard_set_nickname",
  },
  profileTable: "leaderboard_profiles",
  /** Call sign word-list sizes and number range (the table's check constraints). */
  callSign: { adjectives: 16, nouns: 16, tagMin: 10, tagMax: 99 },
  /** A typed name (leaderboard_nickname_problem): length in characters, digits allowed in total. */
  nickname: { min: 3, max: 16, maxDigits: 4 },
} as const;

export function hasLeaderboard(mission: MissionId): boolean {
  return MIN_SECONDS[mission] !== undefined;
}
