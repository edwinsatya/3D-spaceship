"use client";

import { useT } from "@/game/i18n/useT";
import { useSettingsStore } from "@/game/stores/settingsStore";
import { SoundOffIcon, SoundOnIcon } from "./icons";
import { IconButton } from "./primitives";

export function MuteButton() {
  const t = useT();
  const muted = useSettingsStore((state) => state.muted);
  const toggleMuted = useSettingsStore((state) => state.toggleMuted);
  return (
    <IconButton label={muted ? t("a11y.unmute") : t("a11y.mute")} onClick={toggleMuted} active={!muted}>
      {muted ? <SoundOffIcon /> : <SoundOnIcon />}
    </IconButton>
  );
}
