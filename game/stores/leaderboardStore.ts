import { create } from "zustand";
import type { CallSign } from "@/game/data/callSigns";
import type { MissionId } from "@/game/data/missions";
import type { LeaderboardBoard, SubmitOutcome } from "@/game/systems/leaderboard/remote";

/** What happened to the finished run's time (shown on the result screen). */
export type SubmissionState =
  /** Not signed in: invite the player to sign in. */
  | { status: "guest" }
  | { status: "pending" }
  | { status: "ranked"; outcome: SubmitOutcome }
  /** The server didn't accept this time (implausible, expired, too many runs…). */
  | { status: "refused" }
  /** Offline, or there was no ticket for this run (e.g. signed in mid-run). */
  | { status: "unavailable" };

export interface BoardState {
  status: "loading" | "ready" | "error";
  /** Kept while reloading so the list doesn't flash empty. */
  board?: LeaderboardBoard;
  /** 0 = stale. */
  loadedAt: number;
}

interface LeaderboardStore {
  /** Keyed by run so a late answer never lands on the next run. */
  submission: { runId: number; state: SubmissionState } | null;
  boards: Partial<Record<MissionId, BoardState>>;
  callSign: CallSign | null;
  callSignStatus: "idle" | "loading" | "saving" | "error";
  startSubmission: (runId: number, state: SubmissionState | null) => void;
  /** Ignored when the run has moved on. */
  updateSubmission: (runId: number, state: SubmissionState) => void;
  setBoard: (mission: MissionId, board: BoardState) => void;
  invalidateBoards: () => void;
  setCallSign: (callSign: CallSign | null, status?: LeaderboardStore["callSignStatus"]) => void;
  setCallSignStatus: (status: LeaderboardStore["callSignStatus"]) => void;
  /** Signed in or out: everything personal is fetched again. */
  reset: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>()((set, get) => ({
  submission: null,
  boards: {},
  callSign: null,
  callSignStatus: "idle",
  startSubmission: (runId, state) => set({ submission: state ? { runId, state } : null }),
  updateSubmission: (runId, state) => {
    if (get().submission?.runId === runId) set({ submission: { runId, state } });
  },
  setBoard: (mission, board) => set((current) => ({ boards: { ...current.boards, [mission]: board } })),
  invalidateBoards: () =>
    set((current) => ({
      boards: Object.fromEntries(Object.entries(current.boards).map(([id, board]) => [id, { ...board, loadedAt: 0 }])),
    })),
  setCallSign: (callSign, status = "idle") => set({ callSign, callSignStatus: status }),
  setCallSignStatus: (callSignStatus) => set({ callSignStatus }),
  reset: () => set({ boards: {}, callSign: null, callSignStatus: "idle" }),
}));
