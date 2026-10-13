import { LEADERBOARD } from "@/game/config/leaderboard";
import type { Locale } from "@/game/i18n/types";

/**
 * Leaderboard names: an adjective, a space word and a number ("Swift Comet
 * 42"). The server only stores the three indices, so there is no free text to
 * moderate and nothing personal on the board; each player sees the words in
 * their own language. Append-only: reordering would rename everyone.
 */
export interface CallSign {
  adjective: number;
  noun: number;
  tag: number;
}

export const CALL_SIGN_ADJECTIVES: Record<Locale, readonly string[]> = {
  en: ["Swift", "Brave", "Bright", "Cosmic", "Lucky", "Clever", "Mighty", "Happy", "Silver", "Golden", "Rapid", "Daring", "Stellar", "Turbo", "Jolly", "Calm"],
  id: ["Gesit", "Berani", "Cerah", "Kosmik", "Mujur", "Cerdik", "Perkasa", "Ceria", "Perak", "Emas", "Kilat", "Tangguh", "Gemilang", "Turbo", "Riang", "Tenang"],
};

export const CALL_SIGN_NOUNS: Record<Locale, readonly string[]> = {
  en: ["Comet", "Rocket", "Nova", "Falcon", "Meteor", "Pulsar", "Orbit", "Quasar", "Nebula", "Photon", "Galaxy", "Asteroid", "Voyager", "Pilot", "Star", "Moon"],
  id: ["Komet", "Roket", "Nova", "Elang", "Meteor", "Pulsar", "Orbit", "Kuasar", "Nebula", "Foton", "Galaksi", "Asteroid", "Penjelajah", "Pilot", "Bintang", "Bulan"],
};

const { adjectives, nouns, tagMin, tagMax } = LEADERBOARD.callSign;

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export function isCallSign(value: unknown): value is CallSign {
  const sign = value as Partial<CallSign> | null;
  return (
    typeof sign === "object" &&
    sign !== null &&
    inRange(sign.adjective, 0, adjectives - 1) &&
    inRange(sign.noun, 0, nouns - 1) &&
    inRange(sign.tag, tagMin, tagMax)
  );
}

/** "Swift Comet 42" / "Komet Gesit 42" (Indonesian puts the adjective after the noun). */
export function callSignName(sign: CallSign, locale: Locale): string {
  const adjective = CALL_SIGN_ADJECTIVES[locale][sign.adjective] ?? "?";
  const noun = CALL_SIGN_NOUNS[locale][sign.noun] ?? "?";
  return locale === "id" ? `${noun} ${adjective} ${sign.tag}` : `${adjective} ${noun} ${sign.tag}`;
}

/** A random call sign, different from `previous` when one is given. */
export function randomCallSign(previous?: CallSign, random: () => number = Math.random): CallSign {
  const pick = (count: number) => Math.min(count - 1, Math.floor(random() * count));
  const sign = { adjective: pick(adjectives), noun: pick(nouns), tag: tagMin + pick(tagMax - tagMin + 1) };
  // A re-roll always changes the words: move to one of the other adjectives.
  if (previous && sign.adjective === previous.adjective && sign.noun === previous.noun) {
    sign.adjective = (sign.adjective + 1 + pick(adjectives - 1)) % adjectives;
  }
  return sign;
}
