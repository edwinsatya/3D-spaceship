import { LEADERBOARD } from "@/game/config/leaderboard";
import { BLOCKED_ANYWHERE, BLOCKED_WORDS } from "@/game/data/blockedWords";

/** Why a typed leaderboard name isn't accepted (the server answers nickname_<problem>). */
export type NicknameProblem = "length" | "characters" | "contact" | "blocked";

export const NICKNAME_PROBLEMS: readonly NicknameProblem[] = ["length", "characters", "contact", "blocked"];

/** Look-alike digits read as letters (4nj1ng → anjing). */
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" };
const squash = (text: string) => text.replace(/([a-z])\1+/g, "$1");
const SQUASHED_ANYWHERE = BLOCKED_ANYWHERE.map(squash);

/** Runs of spaces become one, ends are trimmed (the server does the same). */
export function cleanNickname(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/**
 * Pure (unit-tested), mirroring leaderboard_nickname_problem on the server so
 * the player hears why straight away. Expects a cleaned name.
 */
export function nicknameProblem(name: string): NicknameProblem | null {
  const { min, max, maxDigits } = LEADERBOARD.nickname;
  const length = [...name].length;
  if (length < min || length > max) return "length";
  if (!/^[A-Za-z0-9]([A-Za-z0-9 _.-]*[A-Za-z0-9])?$/.test(name) || name.includes("  ")) return "characters";
  const lower = name.toLowerCase();
  if (name.replace(/[^0-9]/g, "").length > maxDigits || /(www|http)/.test(lower)) return "contact";
  const plain = lower.replace(/[0134578]/g, (digit) => LEET[digit]);
  const letters = squash(plain.replace(/[^a-z]/g, ""));
  if (SQUASHED_ANYWHERE.some((word) => letters.includes(word))) return "blocked";
  for (const token of new Set([...lower.split(/[^a-z]+/), ...plain.split(/[^a-z]+/)])) {
    if (BLOCKED_WORDS.includes(token) || BLOCKED_WORDS.includes(squash(token))) return "blocked";
  }
  return null;
}
