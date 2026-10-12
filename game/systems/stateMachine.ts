export type GamePhase = "boot" | "loading" | "menu" | "playing" | "paused" | "result";

/**
 * boot → loading → menu → playing ⇄ paused → result
 * plus the obvious exits back to the menu and restarts.
 */
const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  boot: ["loading"],
  loading: ["menu"],
  menu: ["playing"],
  playing: ["paused", "result", "menu", "playing"],
  paused: ["playing", "menu"],
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
  return phase === "playing" || phase === "result" || phase === "menu";
}
