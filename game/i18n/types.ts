import type { en } from "./en";

export type Locale = "en" | "id";

export const LOCALES: readonly Locale[] = ["en", "id"];
export const DEFAULT_LOCALE: Locale = "en";

/** BCP 47 tags for <html lang>, Intl and Open Graph. */
export const LOCALE_TAGS: Record<Locale, { bcp47: string; openGraph: string }> = {
  en: { bcp47: "en-US", openGraph: "en_US" },
  id: { bcp47: "id-ID", openGraph: "id_ID" },
};

/** A string available in every supported locale (used by game/data). */
export type Localized = Record<Locale, string>;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Paths<Dictionary>;

export type TranslationParams = Record<string, string | number>;
