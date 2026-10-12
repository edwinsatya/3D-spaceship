import { TOUCH } from "@/game/config/controls";
import type { InputDevice } from "./types";

export function detectInputDevice(): InputDevice {
  if (typeof window === "undefined") return "desktop";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  return coarse && hasTouch ? "touch" : "desktop";
}

export function supportsWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    const ok = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

type HapticKind = keyof typeof TOUCH.haptics;

/** Vibration feedback on devices that support it (Android Chrome; iOS ignores it). */
export function haptic(kind: HapticKind): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(TOUCH.haptics[kind]);
  } catch {
    // Some browsers throw when vibration is blocked by policy; feedback is optional.
  }
}
