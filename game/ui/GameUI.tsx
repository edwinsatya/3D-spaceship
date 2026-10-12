"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGameStore } from "@/game/stores/gameStore";
import { Hud } from "./hud/Hud";
import { LoadingScreen } from "./LoadingScreen";
import { OrientationGuard } from "./OrientationGuard";
import { PauseMenu } from "./PauseMenu";
import { ResultScreen } from "./ResultScreen";
import { TitleMenu } from "./TitleMenu";

/** DOM layer above the canvas, switched by the game phase. */
export function GameUI() {
  const phase = useGameStore((state) => state.phase);
  const runId = useGameStore((state) => state.runId);
  const loading = phase === "boot" || phase === "loading";

  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      <AnimatePresence>
        {loading && (
          <motion.div key="loading" className="absolute inset-0 z-40" exit={{ opacity: 0, transition: { duration: 0.6 } }}>
            <LoadingScreen />
          </motion.div>
        )}
        {phase === "menu" && <TitleMenu key="menu" />}
        {(phase === "playing" || phase === "paused") && <Hud key={`hud-${runId}`} />}
        {phase === "paused" && <PauseMenu key="pause" />}
        {phase === "result" && <ResultScreen key={`result-${runId}`} />}
      </AnimatePresence>
      <OrientationGuard />
    </div>
  );
}
