import { create } from "zustand";
import { QUALITY_TIERS, type QualityTier } from "@/game/config/quality";

interface QualityStore {
  tier: QualityTier;
  /** Tier locked after too many flip-flops. */
  locked: boolean;
  setTier: (tier: QualityTier) => void;
  stepDown: () => void;
  stepUp: () => void;
  lock: () => void;
}

export const useQualityStore = create<QualityStore>()((set, get) => ({
  tier: "high",
  locked: false,
  setTier: (tier) => set({ tier }),
  stepDown: () => {
    const { tier, locked } = get();
    const index = QUALITY_TIERS.indexOf(tier);
    if (!locked && index > 0) set({ tier: QUALITY_TIERS[index - 1] });
  },
  stepUp: () => {
    const { tier, locked } = get();
    const index = QUALITY_TIERS.indexOf(tier);
    if (!locked && index < QUALITY_TIERS.length - 1) set({ tier: QUALITY_TIERS[index + 1] });
  },
  lock: () => set({ locked: true }),
}));
