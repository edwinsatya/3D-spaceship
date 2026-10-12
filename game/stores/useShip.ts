"use client";

import { SHIPS_BY_ID, type ShipCustomization, type ShipDefinition } from "@/game/data/ships";
import { resolvePaint, resolveShipId } from "@/game/systems/shipConfig";
import { useProgressStore } from "./progressStore";

/** The selected ship and its (validated) paint job. */
export function useSelectedShip(): { ship: ShipDefinition; paint: ShipCustomization } {
  const selected = useProgressStore((state) => state.ships.selected);
  const saved = useProgressStore((state) => state.ships.paint[resolveShipId(state.ships.selected)]);
  const id = resolveShipId(selected);
  return { ship: SHIPS_BY_ID[id], paint: resolvePaint(id, saved) };
}
