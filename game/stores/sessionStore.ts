import { create } from "zustand";
import type { MissionId } from "@/game/data/missions";
import type { HintId } from "@/game/systems/hints";
import type { MissionStatus } from "@/game/systems/mission";
import type { StarRating } from "@/game/systems/scoring";
import type { UnlockItem } from "@/game/systems/unlocks";

export interface MissionResult {
  missionId: MissionId;
  stars: StarRating;
  /** Time (ms) for timed missions, score (0–100) for photo missions. */
  value: number;
  isNewBest: boolean;
  previousBest: number | null;
  best: number;
  /** Photo missions: the shot that finished the mission (object URL). */
  photoUrl?: string;
  /** What this run's new stars unlocked. */
  unlocked: UnlockItem[];
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
  /** Mission objectives done / to do (rings, crystals, deliveries…). */
  objectiveDone: number;
  objectiveTotal: number;
  /** Delivery missions: a cargo pod is being towed. */
  carrying: boolean;
  /** 3, 2, 1, 0 (= GO) or null when hidden. */
  countdown: number | null;
  hint: HintId | null;
  result: MissionResult | null;
  toasts: Toast[];

  reset: (objectiveTotal: number) => void;
  setStatus: (status: MissionStatus) => void;
  setCountdown: (value: number | null) => void;
  setObjectiveDone: (count: number) => void;
  setCarrying: (carrying: boolean) => void;
  setHint: (hint: HintId | null) => void;
  setResult: (result: MissionResult) => void;
  pushToast: (kind: ToastKind, text: string) => void;
  dismissToast: (id: number) => void;
}

const MAX_TOASTS = 3;
let toastId = 0;

export const useSessionStore = create<SessionStore>()((set) => ({
  status: "idle",
  objectiveDone: 0,
  objectiveTotal: 0,
  carrying: false,
  countdown: null,
  hint: null,
  result: null,
  toasts: [],

  reset: (objectiveTotal) =>
    set({ status: "idle", objectiveDone: 0, objectiveTotal, carrying: false, countdown: null, hint: null, result: null, toasts: [] }),
  setStatus: (status) => set({ status }),
  setCountdown: (countdown) => set({ countdown }),
  setObjectiveDone: (objectiveDone) => set({ objectiveDone }),
  setCarrying: (carrying) => {
    if (useSessionStore.getState().carrying !== carrying) set({ carrying });
  },
  setHint: (hint) => set({ hint }),
  setResult: (result) => set({ result }),
  pushToast: (kind, text) =>
    set((state) => ({ toasts: [...state.toasts, { id: ++toastId, kind, text }].slice(-MAX_TOASTS) })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
