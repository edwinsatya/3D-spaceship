import type { BodyId, LocationId } from "@/game/data/planets";

/** Discrete gameplay events (rare; safe to allocate payloads). */
export interface GameEventMap {
  countdown: { value: number };
  go: Record<string, never>;
  ringPassed: { index: number; total: number };
  missionComplete: { timeMs: number };
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
