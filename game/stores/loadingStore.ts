import { create } from "zustand";

export type LoadingTaskId = "script" | "sky" | "planets" | "audio" | "shaders";

export const LOADING_TASKS: readonly LoadingTaskId[] = ["script", "sky", "planets", "audio", "shaders"];

const WEIGHTS: Record<LoadingTaskId, number> = {
  script: 1,
  sky: 1,
  planets: 2,
  audio: 1.5,
  shaders: 1,
};

interface LoadingStore {
  progress: Record<LoadingTaskId, number>;
  setProgress: (id: LoadingTaskId, value: number) => void;
  complete: (id: LoadingTaskId) => void;
}

export const useLoadingStore = create<LoadingStore>()((set) => ({
  progress: { script: 0, sky: 0, planets: 0, audio: 0, shaders: 0 },
  setProgress: (id, value) =>
    set((state) => ({ progress: { ...state.progress, [id]: Math.max(state.progress[id], Math.min(1, value)) } })),
  complete: (id) => set((state) => ({ progress: { ...state.progress, [id]: 1 } })),
}));

export function overallProgress(progress: Record<LoadingTaskId, number>): number {
  let total = 0;
  let done = 0;
  for (const id of LOADING_TASKS) {
    total += WEIGHTS[id];
    done += WEIGHTS[id] * progress[id];
  }
  return done / total;
}

/** First task still in progress (for the loading label). */
export function currentTask(progress: Record<LoadingTaskId, number>): LoadingTaskId | null {
  return LOADING_TASKS.find((id) => progress[id] < 1) ?? null;
}
