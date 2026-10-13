import type { BodyId, LocationId } from "@/game/data/planets";
import type { BadgeId } from "@/game/data/badges";
import type { MissionId } from "@/game/data/missions";
import type { SurfaceId } from "@/game/data/surfaces";

/** What a mission objective step was (drives sounds and toasts). */
export type ObjectiveKind = "ring" | "crystal" | "delivery";

/** Discrete gameplay events (rare; safe to allocate payloads). */
export interface GameEventMap {
  countdown: { value: number };
  go: Record<string, never>;
  /** One objective done: `done` counts from 1 up to `total`. */
  objectiveProgress: { kind: ObjectiveKind; done: number; total: number };
  missionComplete: { mission: MissionId };
  /** A photo was saved; `score` is set during photo missions (0 = subject not in the picture). */
  photoTaken: { id: string; score: number | null };
  /** A new badge (achievement) was earned. */
  badgeEarned: { id: BadgeId };
  /** A cargo pod was picked up (delivery missions). */
  cargoLoaded: { index: number };
  pickup: { amount: number };
  collision: { strength: number };
  boostStart: Record<string, never>;
  boostEnd: Record<string, never>;
  boostDenied: Record<string, never>;
  warpStart: { target: LocationId };
  warpArrive: { location: LocationId };
  orbitStart: { body: BodyId };
  orbitEnd: Record<string, never>;
  discovered: { body: BodyId };
  landingStart: { body: SurfaceId };
  landingRefused: { body: BodyId };
  landed: { body: SurfaceId; first: boolean };
  takeOffStart: Record<string, never>;
  pointOfInterest: { id: string; first: boolean };
}

export type GameEventType = keyof GameEventMap;
type Listener<K extends GameEventType> = (payload: GameEventMap[K]) => void;

export function createEventBus() {
  const listeners = new Map<GameEventType, Set<Listener<never>>>();

  return {
    on<K extends GameEventType>(type: K, listener: Listener<K>): () => void {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener as Listener<never>);
      return () => set.delete(listener as Listener<never>);
    },
    emit<K extends GameEventType>(type: K, payload: GameEventMap[K]): void {
      const set = listeners.get(type);
      if (!set) return;
      for (const listener of set) (listener as Listener<K>)(payload);
    },
    clear(): void {
      listeners.clear();
    },
  };
}

export const gameEvents = createEventBus();

export const EMPTY_PAYLOAD: Record<string, never> = {};
