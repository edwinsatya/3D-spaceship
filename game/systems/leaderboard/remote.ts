import type { SupabaseClient } from "@supabase/supabase-js";
import { LEADERBOARD } from "@/game/config/leaderboard";
import { isCallSign, type CallSign } from "@/game/data/callSigns";
import type { MissionId } from "@/game/data/missions";

export interface LeaderboardRow {
  rank: number;
  callSign: CallSign;
  timeMs: number;
  /** The signed-in player's own row. */
  isMe: boolean;
}

export interface LeaderboardBoard {
  /** The top rows, then the player's own row when it is further down. */
  rows: LeaderboardRow[];
  players: number;
}

export interface SubmitOutcome {
  bestMs: number;
  rank: number;
  players: number;
  /** This run beat the player's previous best (or was the first). */
  improved: boolean;
}

/** Server-side refusals (see the migration): the time doesn't count, but nothing broke. */
const REFUSALS = new Set(["implausible_time", "run_expired", "already_submitted", "unknown_run", "unknown_mission", "rate_limited"]);

export class LeaderboardError extends Error {
  readonly refused: boolean;
  constructor(message: string) {
    super(message);
    this.name = "LeaderboardError";
    this.refused = REFUSALS.has(message);
  }
}

/** What the game needs from the leaderboard backend (a fake stands in for tests). */
export interface LeaderboardRemote {
  /** A ticket for a run that is starting now. */
  start(mission: MissionId): Promise<string>;
  submit(ticket: string, timeMs: number): Promise<SubmitOutcome>;
  top(mission: MissionId, limit: number): Promise<LeaderboardBoard>;
  /** The player's call sign, or null before they have one. */
  loadCallSign(): Promise<CallSign | null>;
  saveCallSign(sign: CallSign): Promise<void>;
}

const toNumber = (value: unknown): number => (typeof value === "number" ? value : Number(value));

/** Pure (unit-tested): rows from leaderboard_top, dropping anything malformed. */
export function parseBoard(data: unknown): LeaderboardBoard {
  const rows: LeaderboardRow[] = [];
  let players = 0;
  for (const raw of Array.isArray(data) ? (data as Record<string, unknown>[]) : []) {
    const callSign = { adjective: toNumber(raw.adjective), noun: toNumber(raw.noun), tag: toNumber(raw.tag) };
    const rank = toNumber(raw.rank);
    const timeMs = toNumber(raw.time_ms);
    if (!isCallSign(callSign) || !Number.isFinite(rank) || !Number.isFinite(timeMs)) continue;
    rows.push({ rank, callSign, timeMs, isMe: raw.is_me === true });
    players = Math.max(players, toNumber(raw.players) || 0);
  }
  rows.sort((a, b) => a.rank - b.rank);
  return { rows, players };
}

/** Pure (unit-tested): the single row returned by leaderboard_submit_run. */
export function parseOutcome(data: unknown): SubmitOutcome {
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  const outcome = {
    bestMs: toNumber(row?.best_ms),
    rank: toNumber(row?.rank),
    players: toNumber(row?.players),
    improved: row?.improved === true,
  };
  if (![outcome.bestMs, outcome.rank, outcome.players].every(Number.isFinite)) throw new LeaderboardError("bad_response");
  return outcome;
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new LeaderboardError(error.message);
  return data;
}

/** The Supabase functions and table from supabase/migrations/20261013020000_leaderboard.sql. */
export function supabaseLeaderboard(supabase: SupabaseClient): LeaderboardRemote {
  const { rpc, profileTable } = LEADERBOARD;
  return {
    async start(mission) {
      const ticket = check(await supabase.rpc(rpc.start, { p_mission: mission }));
      if (typeof ticket !== "string") throw new LeaderboardError("bad_response");
      return ticket;
    },
    async submit(ticket, timeMs) {
      return parseOutcome(check(await supabase.rpc(rpc.submit, { p_run: ticket, p_time_ms: Math.round(timeMs) })));
    },
    async top(mission, limit) {
      return parseBoard(check(await supabase.rpc(rpc.top, { p_mission: mission, p_limit: limit })));
    },
    async loadCallSign() {
      // Row Level Security only ever returns the player's own row.
      const row = check(await supabase.from(profileTable).select("adjective, noun, tag").maybeSingle());
      return isCallSign(row) ? row : null;
    },
    async saveCallSign(sign) {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) throw new LeaderboardError("not_signed_in");
      check(await supabase.from(profileTable).upsert({ user_id: userId, ...sign, updated_at: new Date().toISOString() }));
    },
  };
}
