"use client";

import { useT } from "@/game/i18n/useT";
import { OrbitIcon } from "./icons";

export function WebGLFallback() {
  const t = useT();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#0b1a33_0%,#02030a_70%)] p-6">
      <div className="hud-panel max-w-lg rounded-3xl p-8 text-center">
        <OrbitIcon className="mx-auto text-5xl text-hud" />
        <h1 className="mt-4 font-display text-2xl font-bold">{t("fallback.title")}</h1>
        <p className="mt-3 text-white/85">{t("fallback.body")}</p>
        <p className="mt-3 text-sm text-cyan-100/75">{t("fallback.tips")}</p>
      </div>
    </div>
  );
}
