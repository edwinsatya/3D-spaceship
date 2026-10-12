import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MissionId } from "@/game/data/missions";
import { DEFAULT_SHIP, type ShipCustomization, type ShipId } from "@/game/data/ships";
import { DEFAULT_LOCALE, type Locale } from "@/game/i18n/types";
import type { HintId } from "@/game/systems/hints";
import { isNewBest, type StarRating } from "@/game/systems/scoring";

export interface MissionProgress {
  bestTimeMs: number | null;
  bestStars: 0 | StarRating;
  completions: number;
}

export interface RecordOutcome {
  isNewBest: boolean;
  previousBestMs: number | null;
  bestTimeMs: number;
}

export interface ShipProgress {
  selected: ShipId;
  /** Paint per ship; missing ships use their defaults (see resolvePaint). */
  paint: Partial<Record<ShipId, ShipCustomization>>;
}

interface ProgressData {
  missions: Partial<Record<MissionId, MissionProgress>>;
  settings: { muted: boolean; locale: Locale };
  onboarding: { completedHints: HintId[] };
  ships: ShipProgress;
}

interface ProgressStore extends ProgressData {
  recordMissionResult: (id: MissionId, timeMs: number, stars: StarRating) => RecordOutcome;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  completeHint: (id: HintId) => void;
  selectShip: (id: ShipId) => void;
  setPaint: (id: ShipId, paint: ShipCustomization) => void;
}

export const PROGRESS_STORAGE_KEY = "jelajah-angkasa:progress";
/**
 * v2: default UI language became English. v1 saves only ever stored the old
 * default ("id") — there was no language picker yet — so they move to English.
 */
export const PROGRESS_VERSION = 2;

export const EMPTY_MISSION_PROGRESS: MissionProgress = { bestTimeMs: null, bestStars: 0, completions: 0 };

/** Pure helper (unit-tested): merges a finished run into stored progress. */
export function mergeMissionResult(
  previous: MissionProgress | undefined,
  timeMs: number,
  stars: StarRating,
): { progress: MissionProgress; outcome: RecordOutcome } {
  const current = previous ?? EMPTY_MISSION_PROGRESS;
  const newBest = isNewBest(timeMs, current.bestTimeMs);
  const bestTimeMs = newBest ? timeMs : (current.bestTimeMs as number);
  return {
    progress: {
      bestTimeMs,
      bestStars: Math.max(current.bestStars, stars) as StarRating,
      completions: current.completions + 1,
    },
    outcome: { isNewBest: newBest, previousBestMs: current.bestTimeMs, bestTimeMs },
  };
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      missions: {},
      settings: { muted: false, locale: DEFAULT_LOCALE },
      onboarding: { completedHints: [] },
      ships: { selected: DEFAULT_SHIP, paint: {} },

      recordMissionResult: (id, timeMs, stars) => {
        const { progress, outcome } = mergeMissionResult(get().missions[id], timeMs, stars);
        set((state) => ({ missions: { ...state.missions, [id]: progress } }));
        return outcome;
      },
      setMuted: (muted) => set((state) => ({ settings: { ...state.settings, muted } })),
      toggleMuted: () => set((state) => ({ settings: { ...state.settings, muted: !state.settings.muted } })),
      completeHint: (id) =>
        set((state) =>
          state.onboarding.completedHints.includes(id)
            ? state
            : { onboarding: { completedHints: [...state.onboarding.completedHints, id] } },
        ),
      selectShip: (id) => set((state) => ({ ships: { ...state.ships, selected: id } })),
      setPaint: (id, paint) =>
        set((state) => ({ ships: { ...state.ships, paint: { ...state.ships.paint, [id]: paint } } })),
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateProgress,
      partialize: (state): ProgressData => ({
        missions: state.missions,
        settings: state.settings,
        onboarding: state.onboarding,
        ships: state.ships,
      }),
    },
  ),
);

/** Pure helper (unit-tested): upgrades persisted progress from older versions. */
export function migrateProgress(persisted: unknown, version: number): ProgressData {
  const data = (persisted ?? {}) as Partial<ProgressData>;
  const settings = { muted: data.settings?.muted ?? false, locale: data.settings?.locale ?? DEFAULT_LOCALE };
  if (version < 2) settings.locale = DEFAULT_LOCALE;
  return {
    missions: data.missions ?? {},
    settings,
    onboarding: { completedHints: data.onboarding?.completedHints ?? [] },
    // Added in Phase 2 without a version bump: absent in older saves.
    ships: { selected: data.ships?.selected ?? DEFAULT_SHIP, paint: data.ships?.paint ?? {} },
  };
}

/** Sum of best stars across missions (drives unlocks from Phase 2 on). */
export function totalStars(missions: ProgressData["missions"]): number {
  return Object.values(missions).reduce((sum, progress) => sum + (progress?.bestStars ?? 0), 0);
}
