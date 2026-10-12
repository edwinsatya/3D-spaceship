"use client";

import { useEffect } from "react";
import { haptic } from "@/game/controls/device";
import { translate } from "@/game/i18n";
import { useGameStore } from "@/game/stores/gameStore";
import { useProgressStore } from "@/game/stores/progressStore";
import { useSessionStore } from "@/game/stores/sessionStore";
import { gameEvents } from "@/game/systems/events";

/** Visual toasts + vibration for discrete gameplay events. */
export function useFeedback() {
  useEffect(() => {
    const locale = () => useProgressStore.getState().settings.locale;
    // Vibration only makes sense (and is only allowed after a tap) on touch devices.
    const vibrate = (kind: Parameters<typeof haptic>[0]) => {
      if (useGameStore.getState().device === "touch") haptic(kind);
    };
    const toast = useSessionStore.getState().pushToast;
    const unsubscribers = [
      gameEvents.on("ringPassed", ({ index, total }) => {
        toast("ring", translate(locale(), "hud.toastRing", { current: index + 1, total }));
        vibrate("ring");
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
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);
}
