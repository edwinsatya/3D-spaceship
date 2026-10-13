/**
 * Words a typed leaderboard name may not contain (English and Indonesian).
 * The same lists live in leaderboard_blocked_anywhere / leaderboard_blocked_words
 * (supabase/migrations/20261013030000_leaderboard_nicknames.sql); a unit test
 * keeps them identical, so add a word to both.
 */

/** Matched inside the name, after look-alike digits and repeated letters are squashed. */
export const BLOCKED_ANYWHERE: readonly string[] = [
  "fuck", "shit", "bitch", "cunt", "asshole", "bastard", "slut", "whore", "nigger", "nigga", "faggot", "retard",
  "porn", "penis", "vagina", "pussy", "dildo", "twat", "milf", "horny", "hitler", "piss",
  "anjing", "bangsat", "bajingan", "keparat", "brengsek", "kontol", "ngentot", "entot", "memek", "pepek", "peler",
  "titit", "jembut", "pelacur", "lonte", "bokep", "ngewe", "ngaceng", "jancok", "jancuk", "goblok", "tolol",
  "kampret", "bencong", "tetek",
  "fck", "fvck", "phuck", "kntl", "ngntd", "bgst", "gblk", "anjg", "memk",
];

/** Matched as whole words only: they hide inside harmless words (pantai, masuk, cockpit, grape…). */
export const BLOCKED_WORDS: readonly string[] = [
  "ass", "dick", "cock", "cum", "tits", "boob", "boobs", "sex", "sexy", "rape", "nazi", "fag", "wank", "prick",
  "nude", "naked", "babi", "asu", "tai", "tahi", "bego", "monyet", "perek", "coli", "sange", "cok", "banci",
  "fuk", "fack", "mmk", "asw", "njing", "jnck",
];
