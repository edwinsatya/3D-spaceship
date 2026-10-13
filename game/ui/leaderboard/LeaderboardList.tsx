"use client";

import { useEffect } from "react";
import { leaderboardName } from "@/game/data/callSigns";
import type { MissionId } from "@/game/data/missions";
import { useLocale, useT } from "@/game/i18n/useT";
import { useAccountStore } from "@/game/stores/accountStore";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { loadBoard } from "@/game/systems/leaderboard/service";
import { formatTime } from "@/game/systems/scoring";
import { GameButton } from "../primitives";
import { LeaderboardNameCard } from "./LeaderboardNameCard";

const MEDALS = ["text-star", "text-slate-200", "text-amber-500"] as const;

/** One mission's fastest pilots; guests can look but have to sign in to take part. */
export function LeaderboardList({ mission }: { mission: MissionId }) {
  const t = useT();
  const locale = useLocale();
  const state = useLeaderboardStore((store) => store.boards[mission]);
  const account = useAccountStore((store) => store.status);
  const openAccount = useAccountStore((store) => store.openPanel);
  const signedIn = account === "signedIn";
  const board = state?.board;
  const stale = !state || (state.status === "ready" && state.loadedAt === 0);

  useEffect(() => {
    if (stale) void loadBoard(mission);
  }, [mission, stale, account]);

  return (
    <div className="flex flex-col gap-3 short:gap-2">
      {board && board.rows.length > 0 ? (
        <>
          {/* Scrolls by itself so the Start button below stays in view. */}
          <ol className="flex max-h-[min(13rem,29vh)] flex-col gap-1 overflow-y-auto pr-1" aria-label={t("leaderboard.title")}>
            {board.rows.map((row, index) => {
              const gap = index > 0 && row.rank > board.rows[index - 1].rank + 1;
              return (
                <li key={row.rank} className="flex flex-col gap-1">
                  {gap && (
                    <span className="text-center text-xs text-white/40" aria-hidden>
                      ⋯
                    </span>
                  )}
                  <div
                    className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm ${
                      row.isMe ? "border border-hud/70 bg-cyan-400/15" : "bg-white/5"
                    }`}
                  >
                    <span
                      className={`w-8 shrink-0 font-display font-black tabular-nums ${MEDALS[row.rank - 1] ?? "text-white/60"}`}
                      aria-label={t("leaderboard.rank", { rank: row.rank })}
                    >
                      #{row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {leaderboardName(row, locale)}
                      {row.isMe && <span className="ml-2 text-xs font-bold uppercase text-hud">{t("leaderboard.you")}</span>}
                    </span>
                    <span className="font-display font-bold tabular-nums">{formatTime(row.timeMs)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-right text-xs text-white/55">{t("leaderboard.players", { count: board.players })}</p>
        </>
      ) : state?.status === "error" ? null : (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm text-white/75" role="status">
          {!state || state.status === "loading" ? t("leaderboard.loading") : t("leaderboard.empty")}
        </p>
      )}
      {state?.status === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger" role="alert">
          {t("leaderboard.error")}
          <GameButton variant="ghost" onClick={() => void loadBoard(mission, true)} className="!min-h-9 !px-3 !py-1 !text-xs">
            {t("leaderboard.retry")}
          </GameButton>
        </div>
      )}
      {signedIn ? (
        <LeaderboardNameCard compact />
      ) : (
        account === "signedOut" && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-star/40 bg-star/10 px-4 py-3 text-sm short:py-2">
            <span>{t("leaderboard.guest")}</span>
            <GameButton variant="secondary" onClick={openAccount} className="shrink-0 !min-h-10 !px-4 !py-1.5 !text-xs">
              {t("leaderboard.signIn")}
            </GameButton>
          </div>
        )
      )}
    </div>
  );
}
