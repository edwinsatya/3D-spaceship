import { BADGES, type BadgeId } from "@/game/data/badges";
import { MISSION_ORDER, type MissionId } from "@/game/data/missions";
import { BODY_ORDER, type BodyId } from "@/game/data/planets";
import { SURFACES } from "@/game/data/surfaces";

/** The parts of saved progress that badges look at. */
export interface BadgeProgress {
  missions: Partial<Record<MissionId, { bestStars: number; completions: number }>>;
  discovered: readonly BodyId[];
  landed: readonly BodyId[];
  pointsOfInterest: readonly string[];
  photosTaken: number;
}

export const BADGE_RULES = {
  photos: 5,
  stars: 12,
} as const;

const ALL_LANDMARKS = Object.values(SURFACES).flatMap((surface) => surface.pointsOfInterest.map((poi) => poi.id));

function starsOf(progress: BadgeProgress): number {
  return Object.values(progress.missions).reduce((sum, mission) => sum + (mission?.bestStars ?? 0), 0);
}

const CHECKS: Record<BadgeId, (progress: BadgeProgress) => boolean> = {
  "first-mission": (p) => Object.values(p.missions).some((mission) => (mission?.completions ?? 0) > 0),
  ace: (p) => Object.values(p.missions).some((mission) => mission?.bestStars === 3),
  courier: (p) => (p.missions["station-delivery"]?.completions ?? 0) > 0,
  photographer: (p) => p.photosTaken >= BADGE_RULES.photos,
  moonwalker: (p) => p.landed.includes("moon"),
  "red-planet": (p) => p.landed.includes("mars"),
  sightseer: (p) => ALL_LANDMARKS.every((id) => p.pointsOfInterest.includes(id)),
  explorer: (p) => BODY_ORDER.every((id) => p.discovered.includes(id)),
  "star-collector": (p) => starsOf(p) >= BADGE_RULES.stars,
  "mission-master": (p) => MISSION_ORDER.every((id) => (p.missions[id]?.completions ?? 0) > 0),
  "perfect-pilot": (p) => MISSION_ORDER.every((id) => p.missions[id]?.bestStars === 3),
};

/** Every badge the progress deserves, in display order (pure; unit-tested). */
export function earnedBadges(progress: BadgeProgress): BadgeId[] {
  return BADGES.filter((badge) => CHECKS[badge.id](progress)).map((badge) => badge.id);
}

/** Badges deserved but not owned yet. */
export function newBadges(progress: BadgeProgress, owned: readonly BadgeId[]): BadgeId[] {
  return earnedBadges(progress).filter((id) => !owned.includes(id));
}
