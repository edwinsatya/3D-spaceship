export type GamePhase = "boot" | "loading" | "menu" | "hangar" | "playing" | "paused" | "map" | "result";

/**
 * boot → loading → menu → playing ⇄ paused → result
 * menu ⇄ hangar → playing (test flight) → hangar
 * playing ⇄ map (Solar System map; the world is frozen while it is open)
 * plus the obvious exits back to the menu and restarts.
 */
const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  boot: ["loading"],
  loading: ["menu"],
  menu: ["playing", "hangar"],
  hangar: ["menu", "playing"],
  playing: ["paused", "result", "menu", "playing", "hangar", "map"],
  map: ["playing"],
  paused: ["playing", "menu", "hangar"],
  result: ["playing", "menu"],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextPhase(from: GamePhase, to: GamePhase): GamePhase {
  return canTransition(from, to) ? to : from;
}

/** Phases in which the 3D world simulation advances. */
export function isSimulating(phase: GamePhase): boolean {
  return phase === "playing" || phase === "result" || phase === "menu" || phase === "hangar";
}
