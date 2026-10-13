"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { audio } from "@/game/audio/audioManager";
import { BADGES, type BadgeId } from "@/game/data/badges";
import { HUD } from "@/game/config/hud";
import { localize } from "@/game/i18n";
import { useLocale, useT } from "@/game/i18n/useT";
import { gameEvents } from "@/game/systems/events";
import { BadgeIcon } from "./BadgeIcon";

/** "Badge earned!" cards, one after another, above every screen. */
export function BadgeToasts() {
  const t = useT();
  const locale = useLocale();
  const [queue, setQueue] = useState<BadgeId[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => gameEvents.on("badgeEarned", ({ id }) => setQueue((items) => [...items, id])), []);
  useEffect(() => {
    if (!current) return;
    audio.play("discovery", { rate: 1.15 });
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), HUD.badgeDuration);
    return () => clearTimeout(timer);
  }, [current]);

  const badge = BADGES.find((entry) => entry.id === current);
  return (
    // Bottom-left corner: clear of titles, the top bar and the shutter / throttle on the right.
    <div className="pointer-events-none absolute bottom-24 left-4 z-[60] flex sm:bottom-28 short:bottom-auto short:top-16">
      <AnimatePresence>
        {badge && (
          <motion.div
            key={badge.id}
            initial={{ x: -40, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            className="hud-panel flex items-center gap-3 rounded-2xl border-star/60 px-4 py-2 shadow-[0_0_30px_rgba(255,216,77,0.3)]"
            role="status"
          >
            <BadgeIcon icon={badge.icon} size={40} earned />
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-star">{t("badges.toast")}</p>
              <p className="font-display text-base font-black tracking-wide">{localize(badge.name, locale)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
