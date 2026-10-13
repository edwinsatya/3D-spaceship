"use client";

import { useEffect } from "react";
import { callSignName } from "@/game/data/callSigns";
import { useLocale, useT } from "@/game/i18n/useT";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { ensureCallSign, rerollCallSign } from "@/game/systems/leaderboard/service";
import { RestartIcon } from "../icons";
import { GameButton } from "../primitives";

/** The signed-in player's leaderboard name, with a button for a new random one. */
export function CallSignCard({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const callSign = useLeaderboardStore((state) => state.callSign);
  const status = useLeaderboardStore((state) => state.callSignStatus);

  useEffect(() => {
    void ensureCallSign();
  }, []);

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/5 px-4 py-3 short:py-2">
      <p className="text-xs font-bold uppercase tracking-widest text-hud">{t("leaderboard.flyingAs")}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 font-display text-lg font-bold short:text-base" aria-live="polite">
          {callSign ? callSignName(callSign, locale) : "…"}
        </p>
        <GameButton
          variant="secondary"
          icon={<RestartIcon />}
          onClick={() => void rerollCallSign()}
          disabled={!callSign || status === "saving"}
          className="shrink-0 !min-h-10 !px-3 !py-1.5 !text-xs"
        >
          {t("leaderboard.newCallSign")}
        </GameButton>
      </div>
      {status === "error" && (
        <p className="text-xs text-star" role="alert">
          {t("leaderboard.callSignError")}
        </p>
      )}
      {!compact && <p className="text-xs text-white/55">{t("leaderboard.callSignHint")}</p>}
    </div>
  );
}
