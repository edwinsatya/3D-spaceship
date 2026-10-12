"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { DEBUG_HANDLE_ENABLED } from "@/game/systems/debug";

/**
 * Dev-only: exposes the R3F store on `window.__game.r3f()` so the game can be
 * stepped deterministically from the console (frameloop "never" + advance).
 */
export function DebugBridge() {
  const get = useThree((state) => state.get);
  useEffect(() => {
    if (!DEBUG_HANDLE_ENABLED) return;
    const handle = (window as unknown as { __game?: Record<string, unknown> }).__game;
    if (handle) handle.r3f = get;
  }, [get]);
  return null;
}
