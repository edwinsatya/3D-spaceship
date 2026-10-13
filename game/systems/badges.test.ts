import { describe, expect, it } from "vitest";
import { MISSION_ORDER } from "@/game/data/missions";
import { BODY_ORDER } from "@/game/data/planets";
import { SURFACES } from "@/game/data/surfaces";
import { earnedBadges, newBadges, type BadgeProgress } from "./badges";

const empty: BadgeProgress = { missions: {}, discovered: [], landed: [], pointsOfInterest: [], photosTaken: 0 };

describe("badges", () => {
  it("starts with none", () => {
    expect(earnedBadges(empty)).toEqual([]);
  });

  it("rewards the first finished mission and a three-star run", () => {
    const progress = { ...empty, missions: { "orbit-rings": { bestStars: 3, completions: 1 } } };
    expect(earnedBadges(progress)).toEqual(["first-mission", "ace"]);
  });

  it("rewards landings, landmarks and discoveries", () => {
    const landmarks = Object.values(SURFACES).flatMap((surface) => surface.pointsOfInterest.map((poi) => poi.id));
    const progress = { ...empty, landed: ["moon", "mars"] as const, pointsOfInterest: landmarks, discovered: BODY_ORDER };
    expect(earnedBadges(progress)).toEqual(["moonwalker", "red-planet", "sightseer", "explorer"]);
  });

  it("needs every mission at three stars for Perfect Pilot", () => {
    const missions = Object.fromEntries(MISSION_ORDER.map((id) => [id, { bestStars: 3, completions: 1 }]));
    const all = earnedBadges({ ...empty, missions, photosTaken: 5 });
    expect(all).toContain("perfect-pilot");
    expect(all).toContain("mission-master");
    expect(all).toContain("star-collector");
    expect(all).toContain("courier");
    expect(all).toContain("photographer");
  });

  it("only reports badges you don't have yet", () => {
    const progress = { ...empty, landed: ["moon"] as const };
    expect(newBadges(progress, ["moonwalker"])).toEqual([]);
    expect(newBadges(progress, [])).toEqual(["moonwalker"]);
  });
});
