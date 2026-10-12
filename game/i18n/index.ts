import { en } from "./en";
import { id } from "./id";
import type { Dictionary, Locale, Localized, TranslationKey, TranslationParams } from "./types";

export * from "./types";

const dictionaries: Record<Locale, Dictionary> = { id, en };

const PARAM_PATTERN = /\{(\w+)\}/g;

function lookup(dict: Dictionary, key: TranslationKey): string {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const text = lookup(dictionaries[locale], key);
  if (!params) return text;
  return text.replace(PARAM_PATTERN, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function localize(value: Localized, locale: Locale): string {
  return value[locale];
}

export type Translator = (key: TranslationKey, params?: TranslationParams) => string;

export function createTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}
