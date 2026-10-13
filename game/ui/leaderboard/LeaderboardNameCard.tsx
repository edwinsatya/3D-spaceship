"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { LEADERBOARD } from "@/game/config/leaderboard";
import { callSignName } from "@/game/data/callSigns";
import { useLocale, useT } from "@/game/i18n/useT";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { cleanNickname, nicknameProblem, type NicknameProblem } from "@/game/systems/leaderboard/nickname";
import { ensureProfile, pickRandomName, saveNickname } from "@/game/systems/leaderboard/service";
import { RestartIcon } from "../icons";
import { GameButton } from "../primitives";

type Message = NicknameProblem | "error" | "saved";

/** The signed-in player's leaderboard name: type one, or keep (or roll) a random call sign. */
export function LeaderboardNameCard({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const inputId = useId();
  const messageId = useId();
  const callSign = useLeaderboardStore((state) => state.callSign);
  const nickname = useLeaderboardStore((state) => state.nickname);
  const status = useLeaderboardStore((state) => state.callSignStatus);
  /** null until the player edits the field (it then shows the stored name). */
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    void ensureProfile();
  }, []);

  const value = draft ?? nickname ?? "";
  const cleaned = cleanNickname(value);
  const typingProblem = draft !== null && cleaned ? nicknameProblem(cleaned) : null;
  const changed = draft !== null && (cleaned || null) !== nickname;
  const busy = !callSign || status === "loading" || status === "saving";
  const shown: Message | null = typingProblem ?? (status === "error" ? "error" : message);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !changed || typingProblem) return;
    const result = await saveNickname(value);
    if (result === null) setDraft(null);
    setMessage(result ?? "saved");
  };

  const random = async () => {
    setDraft(null);
    setMessage(null);
    await pickRandomName();
  };

  const text =
    shown === "saved"
      ? t("leaderboard.saved")
      : shown === "error"
        ? t("leaderboard.callSignError")
        : shown
          ? t(`leaderboard.nameProblem.${shown}`)
          : compact
            ? null
            : t("leaderboard.nameHint");

  return (
    <form
      onSubmit={submit}
      className={`flex flex-col rounded-2xl bg-white/5 px-4 short:gap-1 short:py-2 ${compact ? "gap-1 py-2" : "gap-1.5 py-3"}`}
    >
      <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-widest text-hud">
        {t("leaderboard.flyingAs")}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          value={value}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage(null);
          }}
          placeholder={callSign ? callSignName(callSign, locale) : "…"}
          maxLength={LEADERBOARD.nickname.max}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          disabled={!callSign}
          aria-invalid={typingProblem !== null}
          aria-describedby={text ? messageId : undefined}
          className="min-w-0 flex-1 rounded-xl border border-cyan-200/30 bg-slate-950/60 px-3 py-2 font-display text-base font-bold text-white outline-none placeholder:text-white/45 focus:border-hud aria-[invalid=true]:border-star short:py-1.5 short:text-sm"
        />
        <GameButton
          type="submit"
          variant="secondary"
          disabled={busy || !changed || typingProblem !== null}
          className="shrink-0 !min-h-10 !px-4 !py-1.5 !text-xs disabled:opacity-50"
        >
          {t("leaderboard.save")}
        </GameButton>
      </div>
      <div className="flex items-start justify-between gap-3">
        <p
          id={messageId}
          className={`min-h-4 text-xs ${shown && shown !== "saved" ? "text-star" : shown === "saved" ? "text-success-soft" : "text-white/55"}`}
          role={shown && shown !== "saved" ? "alert" : "status"}
        >
          {text}
        </p>
        <GameButton
          variant="ghost"
          icon={<RestartIcon />}
          onClick={() => void random()}
          disabled={busy}
          className="shrink-0 !min-h-8 !gap-1 !px-2 !py-1 !text-[0.6875rem] [&>span]:!text-sm"
        >
          {t("leaderboard.randomName")}
        </GameButton>
      </div>
    </form>
  );
}
