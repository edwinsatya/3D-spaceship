"use client";

import { motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { useT } from "@/game/i18n/useT";
import { useAccountStore } from "@/game/stores/accountStore";
import { sendMagicLink, signInWithGoogle, signOut, syncNow } from "@/game/systems/account/service";
import { GameButton, Panel } from "../primitives";

function SignedOut() {
  const t = useT();
  const linkSentTo = useAccountStore((state) => state.linkSentTo);
  const [email, setEmail] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (email.trim()) void sendMagicLink(email.trim());
  };
  return (
    <div className="flex flex-col gap-4 short:gap-2">
      <p className="text-sm leading-relaxed text-white/85">{t("account.pitch")}</p>
      <GameButton onClick={() => void signInWithGoogle()}>{t("account.google")}</GameButton>
      <div className="flex items-center gap-3 text-xs text-white/50">
        <span className="h-px flex-1 bg-white/15" />
        {t("account.or")}
        <span className="h-px flex-1 bg-white/15" />
      </div>
      {linkSentTo ? (
        <p className="rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200" role="status">
          {t("account.linkSent", { email: linkSentTo })}
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-hud" htmlFor="account-email">
            {t("account.email")}
          </label>
          <input
            id="account-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("account.emailPlaceholder")}
            className="rounded-xl border border-cyan-200/30 bg-slate-950/60 px-4 py-2.5 text-sm text-white outline-none focus:border-hud"
          />
          <GameButton variant="secondary" type="submit">
            {t("account.sendLink")}
          </GameButton>
        </form>
      )}
      <p className="text-xs text-white/55">{t("account.guestNote")}</p>
    </div>
  );
}

function SignedIn() {
  const t = useT();
  const { email, sync, lastSyncedAt } = useAccountStore();
  const status =
    sync === "syncing"
      ? t("account.syncing")
      : sync === "error"
        ? t("account.syncError")
        : lastSyncedAt
          ? t("account.synced", { time: new Date(lastSyncedAt).toLocaleTimeString() })
          : t("account.waiting");
  return (
    <div className="flex flex-col gap-4 short:gap-2">
      <div className="rounded-2xl bg-white/5 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-hud">{t("account.signedInAs")}</p>
        <p className="mt-1 break-all font-display text-lg font-bold">{email ?? "—"}</p>
        <p className={`mt-1 text-sm ${sync === "error" ? "text-star" : "text-emerald-200"}`} role="status">
          {status}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-white/80">{t("account.syncInfo")}</p>
      <div className="flex gap-3">
        <GameButton variant="secondary" onClick={() => void syncNow()} disabled={sync === "syncing"} className="flex-1">
          {t("account.syncNow")}
        </GameButton>
        <GameButton variant="ghost" onClick={() => void signOut()} className="flex-1">
          {t("account.signOut")}
        </GameButton>
      </div>
    </div>
  );
}

/** Optional account: everything works as a guest; signing in syncs progress across devices. */
export function AccountPanel() {
  const t = useT();
  const status = useAccountStore((state) => state.status);
  const error = useAccountStore((state) => state.error);
  const close = useAccountStore((state) => state.closePanel);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [close]);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm short:p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-title"
    >
      <Panel className="flex w-full max-w-md flex-col gap-4 p-5 sm:p-6 short:gap-2 short:p-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="account-title" className="hud-text font-display text-2xl font-black tracking-[0.15em] short:text-xl">
            {t("account.title")}
          </h2>
          <GameButton variant="secondary" onClick={close}>
            {t("account.close")}
          </GameButton>
        </div>
        {status === "unconfigured" && <p className="text-sm leading-relaxed text-white/80">{t("account.unconfigured")}</p>}
        {status === "loading" && <p className="text-sm text-white/70">{t("account.loading")}</p>}
        {status === "signedOut" && <SignedOut />}
        {status === "signedIn" && <SignedIn />}
        {error && (
          <p className="rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </Panel>
    </motion.div>
  );
}
