"use client";

import { motion } from "motion/react";
import { useGameStore } from "@/game/stores/gameStore";
import { useAccountStore } from "@/game/stores/accountStore";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { useT } from "@/game/i18n/useT";
import { formatTime } from "@/game/systems/scoring";
import { TrophyIcon } from "../icons";
import { GameButton } from "../primitives";

/** Result screen: where this run's time landed on the leaderboard (or why it didn't). */
export function LeaderboardResult({ delay }: { delay: number }) {
  const t = useT();
  const runId = useGameStore((state) => state.runId);
  const submission = useLeaderboardStore((state) => (state.submission?.runId === runId ? state.submission.state : null));
  const openAccount = useAccountStore((state) => state.openPanel);
  if (!submission) return null;

  let content;
  if (submission.status === "ranked") {
    const { outcome } = submission;
    content = (
      <>
        <p className="font-display font-bold">{t("leaderboard.result.ranked", { rank: outcome.rank, players: outcome.players })}</p>
        <p className="text-xs text-cyan-100/80">
          {outcome.improved ? t("leaderboard.result.improved") : t("leaderboard.result.notImproved", { time: formatTime(outcome.bestMs) })}
        </p>
      </>
    );
  } else if (submission.status === "guest") {
    content = (
      <div className="flex w-full items-center justify-between gap-3">
        <span>{t("leaderboard.result.guest")}</span>
        <GameButton variant="secondary" onClick={openAccount} className="shrink-0 !min-h-9 !px-3 !py-1 !text-xs">
          {t("leaderboard.signIn")}
        </GameButton>
      </div>
    );
  } else {
    content = <p>{t(`leaderboard.result.${submission.status}`)}</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex w-full items-center gap-3 rounded-2xl border border-hud/30 bg-cyan-400/10 px-4 py-2.5 text-left text-sm"
      role="status"
    >
      <TrophyIcon className="shrink-0 text-xl text-star" aria-hidden />
      <div className="min-w-0 flex-1">{content}</div>
    </motion.div>
  );
}
