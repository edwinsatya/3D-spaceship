"use client";

import { useT } from "@/game/i18n/useT";
import { useProgressStore } from "@/game/stores/progressStore";
import { SoundOffIcon, SoundOnIcon } from "./icons";
import { IconButton } from "./primitives";

export function MuteButton() {
  const t = useT();
  const muted = useProgressStore((state) => state.settings.muted);
  const toggleMuted = useProgressStore((state) => state.toggleMuted);
  return (
    <IconButton label={muted ? t("a11y.unmute") : t("a11y.mute")} onClick={toggleMuted} active={!muted}>
      {muted ? <SoundOffIcon /> : <SoundOnIcon />}
    </IconButton>
  );
}
