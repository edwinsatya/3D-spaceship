"use client";

import { useEffect } from "react";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useQualityStore } from "@/game/stores/qualityStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { setAnalyticsEnabled, track } from "@/game/systems/analytics";
import { gameEvents } from "@/game/systems/events";
import { TUTORIAL_HINTS } from "@/game/systems/hints";

/** Reports the four PRD events (start, tutorial done, mission done, session length) when allowed. */
export function useAnalytics() {
  const allowed = useSettingsStore((state) => state.privacy.analytics);

  useEffect(() => {
    setAnalyticsEnabled(allowed);
  }, [allowed]);

  useEffect(() => {
    let runs = 0;
    let activeMs = 0;
    let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
    const tutorialDone = (hints: readonly string[]) => TUTORIAL_HINTS.every((id) => hints.includes(id));

    const offRun = useGameStore.subscribe((state, previous) => {
      if (state.runId === previous.runId) return;
      runs++;
      track({
        name: "game_start",
        props: {
          mode: state.mode,
          mission: state.mode === "mission" ? state.missionId : null,
          device: state.device,
          quality: useQualityStore.getState().tier,
        },
      });
    });

    const offTutorial = useProgressStore.subscribe((state, previous) => {
      const now = state.onboarding.completedHints;
      if (now !== previous.onboarding.completedHints && tutorialDone(now) && !tutorialDone(previous.onboarding.completedHints)) {
        track({ name: "tutorial_complete", props: { device: useGameStore.getState().device } });
      }
    });

    const offMission = gameEvents.on("missionComplete", ({ mission }) => {
      const record = useProgressStore.getState().missions[mission];
      // The result is stored just before the event fires.
      const result = useSessionStore.getState().result;
      track({
        name: "mission_complete",
        props: { mission, stars: result?.stars ?? record?.bestStars ?? 0, value: Math.round(result?.value ?? 0), first: (record?.completions ?? 0) <= 1 },
      });
    });

    // Session length = time the game was actually on screen; sent whenever the tab is hidden.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (visibleSince !== null) activeMs += performance.now() - visibleSince;
        visibleSince = null;
        track({ name: "session_end", props: { active_seconds: Math.round(activeMs / 1000), runs } });
      } else visibleSince = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      offRun();
      offTutorial();
      offMission();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
