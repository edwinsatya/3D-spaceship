import { describe, expect, it } from "vitest";
import { migrateProgress, type ProgressData } from "@/game/stores/progressStore";
import { mergeProgress, sameProgress } from "./merge";

const base = (patch: Partial<ProgressData>): ProgressData => ({ ...migrateProgress(undefined, 3), ...patch });

describe("mergeProgress", () => {
  const guest = base({
    missions: {
      "orbit-rings": { best: 30_000, bestStars: 2, completions: 3 },
      "red-spot-photo": { best: 70, bestStars: 2, completions: 1 },
    },
    discovered: ["earth", "moon"],
    badges: ["first-mission"],
    photosTaken: 4,
    settings: { muted: true, locale: "id" },
    ships: { selected: "swift", paint: { swift: { body: "#e2463b", accent: "#ffd24d", decal: "stripe", trail: "#ffb347" } }, updatedAt: 200 },
  });
  const account = base({
    missions: {
      "orbit-rings": { best: 26_000, bestStars: 3, completions: 1 },
      "red-spot-photo": { best: 64, bestStars: 2, completions: 2 },
      "belt-slalom": { best: 50_000, bestStars: 1, completions: 1 },
    },
    discovered: ["earth", "mars"],
    badges: ["ace"],
    photosTaken: 2,
    ships: { selected: "comet", paint: { comet: { body: "#2b2f3a", accent: "#ff8a3d", decal: "none", trail: "#5fe6ff" } }, updatedAt: 100 },
  });
  const merged = mergeProgress(guest, account);

  it("keeps the best record of each mission (fastest time, highest photo score)", () => {
    expect(merged.missions["orbit-rings"]).toEqual({ best: 26_000, bestStars: 3, completions: 3 });
    expect(merged.missions["red-spot-photo"]?.best).toBe(70);
    expect(merged.missions["belt-slalom"]?.bestStars).toBe(1);
  });

  it("joins discoveries and badges", () => {
    expect(merged.discovered).toEqual(["earth", "moon", "mars"]);
    expect(merged.badges).toEqual(["first-mission", "ace"]);
    expect(merged.photosTaken).toBe(4);
  });

  it("takes the newer loadout but keeps paint from both", () => {
    expect(merged.ships.selected).toBe("swift");
    expect(Object.keys(merged.ships.paint).sort()).toEqual(["comet", "swift"]);
    expect(mergeProgress(guest, { ...account, ships: { ...account.ships, updatedAt: 300 } }).ships.selected).toBe("comet");
  });

  it("keeps this device's sound and language", () => {
    expect(merged.settings).toEqual({ muted: true, locale: "id" });
  });

  it("is idempotent", () => {
    expect(sameProgress(mergeProgress(merged, account), merged)).toBe(true);
    expect(sameProgress(mergeProgress(guest, merged), merged)).toBe(true);
  });
});
