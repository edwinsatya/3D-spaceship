"use client";

import { useEffect, useRef } from "react";
import { subscribeHud } from "@/game/systems/runtime";

/**
 * Runs `writer` right after every simulated frame. Use it to write straight
 * to DOM refs (textContent, style.transform) — never to set React state.
 */
export function useHudFrame(writer: () => void) {
  const latest = useRef(writer);
  useEffect(() => {
    latest.current = writer;
  });
  useEffect(() => subscribeHud(() => latest.current()), []);
}

/** Sets textContent only when it actually changed (avoids layout work). */
export function setText(element: HTMLElement | null, text: string) {
  if (element && element.textContent !== text) element.textContent = text;
}
