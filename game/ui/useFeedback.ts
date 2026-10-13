"use client";

import { useEffect } from "react";
import { haptic } from "@/game/controls/device";
import { translate } from "@/game/i18n";
import { useGameStore } from "@/game/stores/gameStore";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { gameEvents } from "@/game/systems/events";

/** Visual toasts + vibration for discrete gameplay events. */
export function useFeedback() {
  useEffect(() => {
    const locale = () => useSettingsStore.getState().locale;
    // Vibration only makes sense (and is only allowed after a tap) on touch devices.
    const vibrate = (kind: Parameters<typeof haptic>[0]) => {
      if (useGameStore.getState().device === "touch") haptic(kind);
    };
    const toast = useSessionStore.getState().pushToast;
    const unsubscribers = [
      gameEvents.on("objectiveProgress", ({ kind, done, total }) => {
        const key = kind === "crystal" ? "hud.toastCrystal" : kind === "delivery" ? "hud.toastDelivered" : "hud.toastRing";
        toast("ring", translate(locale(), key, { current: done, total }));
        vibrate("ring");
      }),
      gameEvents.on("cargoLoaded", () => {
        toast("energy", translate(locale(), "hud.toastCargo"));
        vibrate("pickup");
      }),
      gameEvents.on("pickup", () => {
        toast("energy", translate(locale(), "hud.toastEnergy"));
        vibrate("pickup");
      }),
      gameEvents.on("collision", () => {
        toast("collision", translate(locale(), "hud.toastCollision"));
        vibrate("collision");
      }),
      gameEvents.on("boostStart", () => vibrate("boost")),
      gameEvents.on("discovered", () => vibrate("ring")),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);
}
