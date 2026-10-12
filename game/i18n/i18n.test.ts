import { describe, expect, it } from "vitest";
import { en } from "./en";
import { id } from "./id";
import { translate } from "./index";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

describe("i18n", () => {
  it("translates with parameters", () => {
    expect(translate("id", "hud.objectiveRings", { current: 3, total: 12 })).toBe("Lewati cincin 3/12");
    expect(translate("en", "hud.objectiveRings", { current: 3, total: 12 })).toBe("Fly through ring 3/12");
  });

  it("leaves unknown parameters untouched", () => {
    expect(translate("id", "hud.toastRing", { current: 1 })).toBe("Cincin 1/{total}");
  });

  it("keeps English and Indonesian dictionaries in sync", () => {
    expect(keysOf(en).sort()).toEqual(keysOf(id).sort());
  });
});
