import type { id } from "./id";

export type Locale = "id" | "en";

export const LOCALES: readonly Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";

/** A string available in every supported locale (used by game/data). */
export type Localized = Record<Locale, string>;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof id>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Paths<Dictionary>;

export type TranslationParams = Record<string, string | number>;
