"use client";

import { useT } from "@/game/i18n/useT";
import { useAccountStore } from "@/game/stores/accountStore";
import { UserIcon } from "../icons";
import { IconButton } from "../primitives";

/** Title-screen account button; a green dot while signed in. */
export function AccountButton() {
  const t = useT();
  const signedIn = useAccountStore((state) => state.status === "signedIn");
  const open = useAccountStore((state) => state.openPanel);
  return (
    <div className="relative">
      <IconButton label={t("account.button")} onClick={open}>
        <UserIcon />
      </IconButton>
      {signedIn && <span className="pointer-events-none absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-slate-950" />}
    </div>
  );
}
