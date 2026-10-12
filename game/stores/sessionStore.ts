import { create } from "zustand";
import type { MissionId } from "@/game/data/missions";
import type { HintId } from "@/game/systems/hints";
import type { MissionStatus } from "@/game/systems/mission";
import type { StarRating } from "@/game/systems/scoring";

export interface MissionResult {
  missionId: MissionId;
  timeMs: number;
  stars: StarRating;
  isNewBest: boolean;
  previousBestMs: number | null;
  bestTimeMs: number;
}

export type ToastKind = "ring" | "energy" | "collision";

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

/**
 * UI-facing state of the current run. Updated on discrete events only
 * (ring passed, countdown tick…), never per frame.
 */
interface SessionStore {
  status: MissionStatus;
  ringsPassed: number;
  totalRings: number;
  /** 3, 2, 1, 0 (= GO) or null when hidden. */
  countdown: number | null;
  hint: HintId | null;
  result: MissionResult | null;
  toasts: Toast[];

  reset: (totalRings: number) => void;
  setStatus: (status: MissionStatus) => void;
  setCountdown: (value: number | null) => void;
  setRingsPassed: (count: number) => void;
  setHint: (hint: HintId | null) => void;
  setResult: (result: MissionResult) => void;
  pushToast: (kind: ToastKind, text: string) => void;
  dismissToast: (id: number) => void;
}

const MAX_TOASTS = 3;
let toastId = 0;

export const useSessionStore = create<SessionStore>()((set) => ({
  status: "idle",
  ringsPassed: 0,
  totalRings: 0,
  countdown: null,
  hint: null,
  result: null,
  toasts: [],

  reset: (totalRings) =>
    set({ status: "idle", ringsPassed: 0, totalRings, countdown: null, hint: null, result: null, toasts: [] }),
  setStatus: (status) => set({ status }),
  setCountdown: (countdown) => set({ countdown }),
  setRingsPassed: (ringsPassed) => set({ ringsPassed }),
  setHint: (hint) => set({ hint }),
  setResult: (result) => set({ result }),
  pushToast: (kind, text) =>
    set((state) => ({ toasts: [...state.toasts, { id: ++toastId, kind, text }].slice(-MAX_TOASTS) })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
