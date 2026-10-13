import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isMissionId, MISSIONS, type MissionId } from "@/game/data/missions";
import { isBodyId, type BodyId } from "@/game/data/planets";
import { DEFAULT_SHIP, type ShipCustomization, type ShipId } from "@/game/data/ships";
import { DEFAULT_LOCALE, type Locale } from "@/game/i18n/types";
import type { HintId } from "@/game/systems/hints";
import { isNewBest, type StarRating } from "@/game/systems/scoring";

export interface MissionProgress {
  /** Fastest time (ms) for timed missions, highest score (0–100) for photo missions. */
  best: number | null;
  bestStars: 0 | StarRating;
  completions: number;
}

export interface RecordOutcome {
  isNewBest: boolean;
  previousBest: number | null;
  best: number;
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
  /** Encyclopedia: bodies visited at least once (free flight). */
  discovered: BodyId[];
  /** Surfaces you have landed on and points of interest visited there. */
  landed: BodyId[];
  pointsOfInterest: string[];
}

interface ProgressStore extends ProgressData {
  /** `value` is a time in ms or a score, as the mission's rating says. */
  recordMissionResult: (id: MissionId, value: number, stars: StarRating) => RecordOutcome;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  completeHint: (id: HintId) => void;
  selectShip: (id: ShipId) => void;
  setPaint: (id: ShipId, paint: ShipCustomization) => void;
  /** Returns true when this is a new discovery. */
  discover: (id: BodyId) => boolean;
  markLanded: (id: BodyId) => boolean;
  visitPointOfInterest: (id: string) => boolean;
}

export const PROGRESS_STORAGE_KEY = "jelajah-angkasa:progress";
/**
 * v2: default UI language became English. v1 saves only ever stored the old
 * default ("id") — there was no language picker yet — so they move to English.
 * v3: mission records store a generic `best` (time or score) instead of `bestTimeMs`.
 */
export const PROGRESS_VERSION = 3;

export const EMPTY_MISSION_PROGRESS: MissionProgress = { best: null, bestStars: 0, completions: 0 };

/** Pure helper (unit-tested): merges a finished run into stored progress. */
export function mergeMissionResult(
  previous: MissionProgress | undefined,
  value: number,
  stars: StarRating,
  lowerIsBetter = true,
): { progress: MissionProgress; outcome: RecordOutcome } {
  const current = previous ?? EMPTY_MISSION_PROGRESS;
  const newBest = isNewBest(value, current.best, lowerIsBetter);
  const best = newBest ? value : (current.best as number);
  return {
    progress: {
      best,
      bestStars: Math.max(current.bestStars, stars) as StarRating,
      completions: current.completions + 1,
    },
    outcome: { isNewBest: newBest, previousBest: current.best, best },
  };
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      missions: {},
      settings: { muted: false, locale: DEFAULT_LOCALE },
      onboarding: { completedHints: [] },
      ships: { selected: DEFAULT_SHIP, paint: {} },
      discovered: [],
      landed: [],
      pointsOfInterest: [],

      recordMissionResult: (id, value, stars) => {
        const lowerIsBetter = MISSIONS[id].rating.kind === "time";
        const { progress, outcome } = mergeMissionResult(get().missions[id], value, stars, lowerIsBetter);
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
      discover: (id) => {
        if (get().discovered.includes(id)) return false;
        set((state) => ({ discovered: [...state.discovered, id] }));
        return true;
      },
      markLanded: (id) => {
        if (get().landed.includes(id)) return false;
        set((state) => ({ landed: [...state.landed, id] }));
        return true;
      },
      visitPointOfInterest: (id) => {
        if (get().pointsOfInterest.includes(id)) return false;
        set((state) => ({ pointsOfInterest: [...state.pointsOfInterest, id] }));
        return true;
      },
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
        discovered: state.discovered,
        landed: state.landed,
        pointsOfInterest: state.pointsOfInterest,
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
    missions: migrateMissions(data.missions),
    settings,
    onboarding: { completedHints: data.onboarding?.completedHints ?? [] },
    // Added in Phase 2 without a version bump: absent in older saves.
    ships: { selected: data.ships?.selected ?? DEFAULT_SHIP, paint: data.ships?.paint ?? {} },
    discovered: (data.discovered ?? []).filter(isBodyId),
    landed: (data.landed ?? []).filter(isBodyId),
    pointsOfInterest: (data.pointsOfInterest ?? []).filter((id) => typeof id === "string"),
  };
}

type StoredMission = Partial<MissionProgress> & { bestTimeMs?: number | null };

/** Keeps known missions only and renames v2's `bestTimeMs` to `best`. */
function migrateMissions(missions: unknown): ProgressData["missions"] {
  const result: ProgressData["missions"] = {};
  if (!missions || typeof missions !== "object") return result;
  for (const [id, stored] of Object.entries(missions as Record<string, StoredMission | undefined>)) {
    if (!isMissionId(id) || !stored) continue;
    result[id] = {
      best: stored.best ?? stored.bestTimeMs ?? null,
      bestStars: stored.bestStars ?? 0,
      completions: stored.completions ?? 0,
    };
  }
  return result;
}

/** Sum of best stars across missions (drives unlocks from Phase 2 on). */
export function totalStars(missions: ProgressData["missions"]): number {
  return Object.values(missions).reduce((sum, progress) => sum + (progress?.bestStars ?? 0), 0);
}
