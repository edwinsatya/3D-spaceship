import { HUD } from "@/game/config/hud";
import { LOCALE_TAGS, type Locale } from "@/game/i18n/types";

const numberFormats = new Map<Locale, Intl.NumberFormat>();

function numberFormat(locale: Locale): Intl.NumberFormat {
  let format = numberFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE_TAGS[locale].bcp47, { maximumFractionDigits: 1 });
    numberFormats.set(locale, format);
  }
  return format;
}

export function formatNumber(value: number, locale: Locale): string {
  return numberFormat(locale).format(value);
}

/** World units per second → km/h read-out (rounded to HUD.speedStep). */
export function speedToKmh(unitsPerSecond: number): number {
  const kmh = unitsPerSecond * 3600 * HUD.unitKm;
  return Math.round(kmh / HUD.speedStep) * HUD.speedStep;
}

/** World units → km read-out with one decimal below 10 km. */
export function distanceToKm(units: number): number {
  const km = units * HUD.unitKm;
  return km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
}
