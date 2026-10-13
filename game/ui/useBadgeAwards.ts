"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/game/stores/progressStore";
import { newBadges } from "@/game/systems/badges";
import { gameEvents } from "@/game/systems/events";

/**
 * Awards badges whenever progress changes. Saves from before badges existed
 * get theirs quietly on load instead of a burst of toasts.
 */
export function useBadgeAwards() {
  useEffect(() => {
    const check = (celebrate: boolean) => {
      const state = useProgressStore.getState();
      const fresh = newBadges(state, state.badges);
      if (fresh.length === 0) return;
      state.awardBadges(fresh);
      if (celebrate) for (const id of fresh) gameEvents.emit("badgeEarned", { id });
    };
    const persist = useProgressStore.persist;
    const unsubscribeHydration = persist.hasHydrated() ? undefined : persist.onFinishHydration(() => check(false));
    if (persist.hasHydrated()) check(false);
    const unsubscribe = useProgressStore.subscribe(() => check(true));
    return () => {
      unsubscribe();
      unsubscribeHydration?.();
    };
  }, []);
}
