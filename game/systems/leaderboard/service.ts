import { hasLeaderboard, LEADERBOARD } from "@/game/config/leaderboard";
import { randomCallSign } from "@/game/data/callSigns";
import type { MissionId } from "@/game/data/missions";
import { useAccountStore } from "@/game/stores/accountStore";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { getSupabase } from "@/game/systems/account/supabase";
import { cleanNickname, nicknameProblem, type NicknameProblem } from "./nickname";
import { LeaderboardError, supabaseLeaderboard, type LeaderboardRemote } from "./remote";

type RemoteSource = () => Promise<LeaderboardRemote> | null;

const supabaseSource: RemoteSource = () => getSupabase()?.then(supabaseLeaderboard) ?? null;
let source: RemoteSource = supabaseSource;

/** The ticket of the run in progress (asked for when it started). */
let ticket: { runId: number; mission: MissionId; id: Promise<string | null> } | null = null;

/** Tests swap Supabase for a fake (null restores it). */
export function setLeaderboardSource(next: RemoteSource | null): void {
  source = next ?? supabaseSource;
  ticket = null;
}

const signedIn = () => useAccountStore.getState().status === "signedIn";

/** A run starts (before the countdown): ask the server for a ticket so it can time the run too. */
export function beginLeaderboardRun(runId: number, mission: MissionId): void {
  ticket = null;
  useLeaderboardStore.getState().startSubmission(runId, null);
  const remote = hasLeaderboard(mission) && signedIn() ? source() : null;
  if (!remote) return;
  const id = remote
    .then((backend) => backend.start(mission))
    .catch((error: unknown) => {
      console.warn("[leaderboard] no ticket for this run", error);
      return null;
    });
  ticket = { runId, mission, id };
}

/** The run finished: hand its time in and keep the outcome for the result screen. */
export async function finishLeaderboardRun(runId: number, mission: MissionId, timeMs: number): Promise<void> {
  const store = useLeaderboardStore.getState();
  if (!hasLeaderboard(mission) || useAccountStore.getState().status === "unconfigured") return;
  if (!signedIn()) {
    store.startSubmission(runId, { status: "guest" });
    return;
  }
  const current = ticket && ticket.runId === runId && ticket.mission === mission ? ticket : null;
  ticket = null;
  const remote = current ? source() : null;
  if (!current || !remote) {
    store.startSubmission(runId, { status: "unavailable" });
    return;
  }
  store.startSubmission(runId, { status: "pending" });
  const id = await current.id;
  if (!id) {
    store.updateSubmission(runId, { status: "unavailable" });
    return;
  }
  try {
    const outcome = await (await remote).submit(id, timeMs);
    store.updateSubmission(runId, { status: "ranked", outcome });
    store.invalidateBoards();
  } catch (error) {
    console.warn("[leaderboard] time not posted", error);
    store.updateSubmission(runId, { status: error instanceof LeaderboardError && error.refused ? "refused" : "unavailable" });
  }
}

/** Fetches a mission's board unless a fresh copy is already shown (or loading). */
export async function loadBoard(mission: MissionId, force = false): Promise<void> {
  const store = useLeaderboardStore.getState();
  const existing = store.boards[mission];
  if (existing?.status === "loading") return;
  if (!force && existing?.status === "ready" && Date.now() - existing.loadedAt < LEADERBOARD.refreshAfter) return;
  const remote = hasLeaderboard(mission) ? source() : null;
  if (!remote) return;
  store.setBoard(mission, { status: "loading", board: existing?.board, loadedAt: 0 });
  try {
    const board = await (await remote).top(mission, LEADERBOARD.top);
    useLeaderboardStore.getState().setBoard(mission, { status: "ready", board, loadedAt: Date.now() });
  } catch (error) {
    console.warn("[leaderboard] board not loaded", error);
    useLeaderboardStore.getState().setBoard(mission, { status: "error", board: existing?.board, loadedAt: 0 });
  }
}

/** Loads the player's leaderboard name, giving them a random call sign the first time. */
export async function ensureProfile(): Promise<void> {
  const store = useLeaderboardStore.getState();
  if (!signedIn() || store.callSign || store.callSignStatus === "loading" || store.callSignStatus === "saving") return;
  const remote = source();
  if (!remote) return;
  store.setCallSignStatus("loading");
  try {
    const backend = await remote;
    let profile = await backend.loadProfile();
    if (!profile) {
      profile = { callSign: randomCallSign(), nickname: null };
      await backend.saveRandomName(profile.callSign);
    }
    useLeaderboardStore.getState().setProfile(profile.callSign, profile.nickname);
  } catch (error) {
    console.warn("[leaderboard] name not loaded", error);
    useLeaderboardStore.getState().setCallSignStatus("error");
  }
}

/** A new random call sign instead of the current name (shown at once, put back if saving fails). */
export async function pickRandomName(): Promise<void> {
  const store = useLeaderboardStore.getState();
  const { callSign: previous, nickname } = store;
  const remote = signedIn() ? source() : null;
  if (!previous || !remote || store.callSignStatus === "saving") return;
  const next = randomCallSign(previous);
  store.setProfile(next, null, "saving");
  try {
    await (await remote).saveRandomName(next);
    useLeaderboardStore.getState().setProfile(next, null);
    // The player's name on every board changed.
    useLeaderboardStore.getState().invalidateBoards();
  } catch (error) {
    console.warn("[leaderboard] name not saved", error);
    useLeaderboardStore.getState().setProfile(previous, nickname, "error");
  }
}

/**
 * Saves a typed name (empty = back to the call sign). Returns why the name
 * isn't allowed, "error" when it couldn't be saved, or null when it was.
 */
export async function saveNickname(input: string): Promise<NicknameProblem | "error" | null> {
  const store = useLeaderboardStore.getState();
  const remote = signedIn() ? source() : null;
  if (!store.callSign || !remote || store.callSignStatus === "saving") return "error";
  const name = cleanNickname(input) || null;
  const problem = name ? nicknameProblem(name) : null;
  if (problem) return problem;
  const previous = store.nickname;
  store.setProfile(store.callSign, name, "saving");
  try {
    const stored = await (await remote).setNickname(name);
    const { callSign } = useLeaderboardStore.getState();
    useLeaderboardStore.getState().setProfile(callSign, stored);
    useLeaderboardStore.getState().invalidateBoards();
    return null;
  } catch (error) {
    console.warn("[leaderboard] name not saved", error);
    const { callSign } = useLeaderboardStore.getState();
    useLeaderboardStore.getState().setProfile(callSign, previous);
    return error instanceof LeaderboardError && error.nicknameProblem ? error.nicknameProblem : "error";
  }
}
