"use client";

import { useEffect } from "react";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { gameEvents } from "@/game/systems/events";
import { audio } from "./audioManager";

/** Maps gameplay events and phase changes to sound. */
export function useGameAudio() {
  const muted = useProgressStore((state) => state.settings.muted);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const unsubscribers = [
      gameEvents.on("objectiveProgress", ({ kind, done }) =>
        kind === "delivery" ? audio.play("go") : audio.play("ring", { rate: 1 + (done - 1) * (kind === "crystal" ? 0.06 : 0.035) }),
      ),
      gameEvents.on("cargoLoaded", () => audio.play("pickup", { rate: 0.8 })),
      gameEvents.on("pickup", () => audio.play("pickup")),
      gameEvents.on("collision", ({ strength }) => audio.play("collision", { volume: 0.55 + strength * 0.45 })),
      gameEvents.on("boostStart", () => audio.play("boost")),
      gameEvents.on("boostDenied", () => audio.play("denied")),
      gameEvents.on("countdown", () => audio.play("countdown")),
      gameEvents.on("go", () => audio.play("go")),
      gameEvents.on("missionComplete", () => audio.play("fanfare")),
      gameEvents.on("warpStart", () => audio.play("warp")),
      gameEvents.on("discovered", () => audio.play("discovery")),
      gameEvents.on("landingStart", () => audio.play("warp", { rate: 0.55, volume: 0.8 })),
      gameEvents.on("takeOffStart", () => audio.play("warp", { rate: 0.75, volume: 0.8 })),
      gameEvents.on("landingRefused", () => audio.play("denied")),
      gameEvents.on("landed", ({ first }) => audio.play(first ? "discovery" : "go")),
      gameEvents.on("pointOfInterest", ({ first }) => {
        if (first) audio.play("ring", { rate: 1.2 });
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(
    () =>
      useGameStore.subscribe((state, previous) => {
        if (state.runId !== previous.runId) {
          audio.startEngine();
          audio.setMusicDucked(false);
          return;
        }
        if (state.phase === previous.phase) return;
        if (state.phase === "paused") {
          audio.setEngineMuted(true);
          audio.setMusicDucked(true);
        } else if (state.phase === "playing" && previous.phase === "paused") {
          audio.setEngineMuted(false);
          audio.setMusicDucked(false);
        } else if (state.phase === "map") {
          audio.setEngineMuted(true);
        } else if (state.phase === "playing" && previous.phase === "map") {
          audio.setEngineMuted(false);
        } else if (state.phase === "menu" || state.phase === "hangar") {
          audio.stopEngine();
          audio.setMusicDucked(false);
        }
      }),
    [],
  );
}

/** Must be called from a click/tap handler: unlocks Web Audio and starts the music. */
export function unlockAudioFromGesture() {
  audio.unlock();
  audio.startMusic();
}
