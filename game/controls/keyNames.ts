import type { Locale } from "@/game/i18n/types";

/** Short, readable names for KeyboardEvent.code values (the code is layout-independent). */
const SPECIAL: Record<string, string> = {
  Space: "Space",
  Escape: "Esc",
  Tab: "Tab",
  Enter: "Enter",
  Backspace: "Backspace",
  ShiftLeft: "L-Shift",
  ShiftRight: "R-Shift",
  ControlLeft: "L-Ctrl",
  ControlRight: "R-Ctrl",
  AltLeft: "L-Alt",
  AltRight: "R-Alt",
  MetaLeft: "L-Meta",
  MetaRight: "R-Meta",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  CapsLock: "Caps",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

export function keyName(code: string): string {
  if (SPECIAL[code]) return SPECIAL[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

/** Keys that can't be rebound (browser / system shortcuts or reserved for menus). */
export const RESERVED_KEYS: ReadonlySet<string> = new Set(["MetaLeft", "MetaRight", "F5", "F11", "F12"]);

/** Words on keys that read differently per language. */
const LOCALIZED: Partial<Record<string, Partial<Record<Locale, string>>>> = {
  Space: { id: "Spasi" },
  Enter: { id: "Enter" },
  CapsLock: { id: "Caps" },
};

export function localizedKeyName(code: string, locale: Locale): string {
  return LOCALIZED[code]?.[locale] ?? keyName(code);
}
