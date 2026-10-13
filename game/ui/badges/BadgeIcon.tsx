"use client";

import type { BadgeIcon as BadgeIconData } from "@/game/data/badges";
import { CargoIcon, PhotoIcon, RocketIcon, StarIcon, TrophyIcon } from "../icons";
import { PlanetIcon } from "../PlanetIcon";

const SYMBOLS = { rocket: RocketIcon, star: StarIcon, photo: PhotoIcon, cargo: CargoIcon, trophy: TrophyIcon } as const;

/** A badge's emblem: a planet, or a symbol on a gold medal. */
export function BadgeIcon({ icon, size, earned }: { icon: BadgeIconData; size: number; earned: boolean }) {
  if (icon.kind === "body") return <PlanetIcon id={icon.id} size={size} dimmed={!earned} />;
  const Symbol = SYMBOLS[icon.id];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${
        earned ? "bg-gradient-to-br from-star to-amber-600 text-slate-900 shadow-[0_0_14px_rgba(255,216,77,0.5)]" : "bg-white/10 text-white/35"
      }`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      <Symbol />
    </span>
  );
}
