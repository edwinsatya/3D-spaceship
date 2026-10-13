import type { Localized } from "@/game/i18n/types";
import type { BodyId } from "./planets";

export type BadgeId =
  | "first-mission"
  | "ace"
  | "courier"
  | "photographer"
  | "moonwalker"
  | "red-planet"
  | "sightseer"
  | "explorer"
  | "star-collector"
  | "mission-master"
  | "perfect-pilot";

export type BadgeIcon = { kind: "body"; id: BodyId } | { kind: "symbol"; id: "rocket" | "star" | "photo" | "cargo" | "trophy" | "flag" };

export interface BadgeDefinition {
  id: BadgeId;
  name: Localized;
  description: Localized;
  icon: BadgeIcon;
}

/** Thresholds live in game/systems/badges.ts next to the checks. */
export const BADGES: readonly BadgeDefinition[] = [
  {
    id: "first-mission",
    name: { en: "First Mission", id: "Misi Pertama" },
    description: { en: "Finish any mission.", id: "Selesaikan misi apa saja." },
    icon: { kind: "symbol", id: "rocket" },
  },
  {
    id: "ace",
    name: { en: "Ace Pilot", id: "Pilot Jagoan" },
    description: { en: "Earn three stars on a mission.", id: "Dapatkan tiga bintang di satu misi." },
    icon: { kind: "symbol", id: "star" },
  },
  {
    id: "courier",
    name: { en: "Space Courier", id: "Kurir Angkasa" },
    description: { en: "Deliver all the cargo to the station.", id: "Antar semua kargo ke stasiun." },
    icon: { kind: "symbol", id: "cargo" },
  },
  {
    id: "photographer",
    name: { en: "Space Photographer", id: "Fotografer Angkasa" },
    description: { en: "Take 5 photos in photo mode.", id: "Ambil 5 foto di mode foto." },
    icon: { kind: "symbol", id: "photo" },
  },
  {
    id: "moonwalker",
    name: { en: "Moon Lander", id: "Pendarat Bulan" },
    description: { en: "Land on the Moon.", id: "Mendarat di Bulan." },
    icon: { kind: "body", id: "moon" },
  },
  {
    id: "red-planet",
    name: { en: "Red Planet Pilot", id: "Pilot Planet Merah" },
    description: { en: "Land on Mars.", id: "Mendarat di Mars." },
    icon: { kind: "body", id: "mars" },
  },
  {
    id: "sightseer",
    name: { en: "Sightseer", id: "Penjelajah Situs" },
    description: { en: "Visit every landing-site landmark on the Moon and Mars.", id: "Kunjungi semua situs pendaratan di Bulan dan Mars." },
    icon: { kind: "symbol", id: "flag" },
  },
  {
    id: "explorer",
    name: { en: "Solar System Explorer", id: "Penjelajah Tata Surya" },
    description: { en: "Discover every world in the Encyclopedia.", id: "Temukan semua dunia di Ensiklopedia." },
    icon: { kind: "body", id: "saturn" },
  },
  {
    id: "star-collector",
    name: { en: "Star Collector", id: "Pengumpul Bintang" },
    description: { en: "Collect 12 mission stars.", id: "Kumpulkan 12 bintang misi." },
    icon: { kind: "symbol", id: "star" },
  },
  {
    id: "mission-master",
    name: { en: "Mission Master", id: "Ahli Misi" },
    description: { en: "Finish every mission.", id: "Selesaikan semua misi." },
    icon: { kind: "symbol", id: "trophy" },
  },
  {
    id: "perfect-pilot",
    name: { en: "Perfect Pilot", id: "Pilot Sempurna" },
    description: { en: "Three stars on every mission.", id: "Tiga bintang di semua misi." },
    icon: { kind: "symbol", id: "trophy" },
  },
];

export function isBadgeId(value: unknown): value is BadgeId {
  return BADGES.some((badge) => badge.id === value);
}
