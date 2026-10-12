"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { HUD } from "@/game/config/hud";
import { BODIES, type BodyId } from "@/game/data/planets";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { gameEvents } from "@/game/systems/events";
import { PlanetIcon } from "../PlanetIcon";

/** Big "Planet discovered!" moment with a new Encyclopedia entry. */
export function DiscoveryBanner() {
  const t = useT();
  const locale = useLocale();
  const [queue, setQueue] = useState<BodyId[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => gameEvents.on("discovered", ({ body }) => setQueue((items) => [...items, body])), []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), HUD.discoveryDuration);
    return () => clearTimeout(timer);
  }, [current]);

  const body = current ? BODIES[current] : null;
  const title = !body
    ? ""
    : body.kind === "star"
      ? t("hud.discoveredStar")
      : body.kind === "moon"
        ? t("hud.discoveredMoon")
        : t("hud.discovered");

  return (
    <div className="absolute inset-x-0 top-[20%] flex justify-center px-4">
      <AnimatePresence>
        {body && (
          <motion.div
            key={body.id}
            initial={{ y: -20, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="hud-panel flex items-center gap-4 rounded-3xl border-star/60 px-6 py-4 shadow-[0_0_40px_rgba(255,216,77,0.25)]"
            role="status"
          >
            <motion.div initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15 }}>
              <PlanetIcon id={body.id} size={64} />
            </motion.div>
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-star">{title}</p>
              <p className="hud-text font-display text-3xl font-black tracking-wider">{localize(body.name, locale)}</p>
              <p className="text-xs text-cyan-100/80">{t("hud.newEntry")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
