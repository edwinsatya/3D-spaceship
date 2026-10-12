"use client";

import dynamic from "next/dynamic";
import { StaticLoadingScreen } from "@/game/ui/LoadingScreen";

/** The 3D game is client-only; the server renders a lightweight loading shell. */
const GameApp = dynamic(() => import("./GameApp"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-space">
      <StaticLoadingScreen />
    </div>
  ),
});

export function GameRoot() {
  return <GameApp />;
}
