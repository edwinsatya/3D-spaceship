"use client";

import { useEffect } from "react";
import { useAccountStore } from "@/game/stores/accountStore";
import { useGameStore } from "@/game/stores/gameStore";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { gameEvents } from "@/game/systems/events";
import { beginLeaderboardRun, finishLeaderboardRun } from "@/game/systems/leaderboard/service";

/** Asks for a run ticket when a mission starts and posts the time when it ends. */
export function useLeaderboard() {
  useEffect(() => {
    const offRun = useGameStore.subscribe((state, previous) => {
      if (state.runId !== previous.runId && state.mode === "mission") beginLeaderboardRun(state.runId, state.missionId);
    });
    const offFinish = gameEvents.on("missionComplete", ({ mission }) => {
      const result = useSessionStore.getState().result;
      if (result?.missionId === mission) void finishLeaderboardRun(useGameStore.getState().runId, mission, result.value);
    });
    // Another player (or none): call sign and "you" rows have to be fetched again.
    const offAccount = useAccountStore.subscribe((state, previous) => {
      if (state.status !== previous.status) useLeaderboardStore.getState().reset();
    });
    return () => {
      offRun();
      offFinish();
      offAccount();
    };
  }, []);
}
