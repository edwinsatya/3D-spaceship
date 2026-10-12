import { create } from "zustand";
import type { InputDevice } from "@/game/controls/types";
import type { MissionId } from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";
import { canTransition, type GamePhase } from "@/game/systems/stateMachine";

export type GameMode = "mission" | "freeflight" | "testflight";
export type CameraMode = "chase" | "cockpit";
export type WebGLStatus = "unknown" | "supported" | "unsupported";

interface GameStore {
  phase: GamePhase;
  mode: GameMode;
  missionId: MissionId;
  /** Increments on every (re)start so systems can reset. */
  runId: number;
  device: InputDevice;
  /** Which planet scene is loaded (missions, menu and hangar are at Earth). */
  location: LocationId;
  cameraMode: CameraMode;
  webgl: WebGLStatus;

  transition: (to: GamePhase) => boolean;
  setWebGL: (status: WebGLStatus) => void;
  setDevice: (device: InputDevice) => void;
  startRun: (mode: GameMode) => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  showResult: () => void;
  toMenu: () => void;
  toggleCamera: () => void;
  setLocation: (location: LocationId) => void;
  openMap: () => void;
  closeMap: () => void;
  openHangar: () => void;
  closeHangar: () => void;
  /** Ends a test flight (timer or button) and returns to the hangar. */
  endTestFlight: () => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  phase: "boot",
  mode: "mission",
  missionId: "orbit-rings",
  runId: 0,
  device: "desktop",
  location: "earth",
  cameraMode: "chase",
  webgl: "unknown",

  transition: (to) => {
    const { phase } = get();
    if (!canTransition(phase, to)) return false;
    set({ phase: to });
    return true;
  },
  setWebGL: (webgl) => set({ webgl }),
  setDevice: (device) => {
    if (get().device !== device) set({ device });
  },
  startRun: (mode) => {
    const { phase, runId } = get();
    if (!canTransition(phase, "playing")) return;
    set({ phase: "playing", mode, runId: runId + 1, cameraMode: "chase", location: "earth" });
  },
  restart: () => {
    const { phase, runId } = get();
    if (!canTransition(phase, "playing")) return;
    set({ phase: "playing", runId: runId + 1, location: "earth" });
  },
  pause: () => {
    if (get().phase === "playing") set({ phase: "paused" });
  },
  resume: () => {
    if (get().phase === "paused") set({ phase: "playing" });
  },
  togglePause: () => {
    const { phase } = get();
    if (phase === "playing") set({ phase: "paused" });
    else if (phase === "paused") set({ phase: "playing" });
  },
  showResult: () => {
    get().transition("result");
  },
  toMenu: () => {
    if (get().transition("menu")) set({ location: "earth" });
  },
  toggleCamera: () => {
    const { phase, cameraMode } = get();
    if (phase !== "playing") return;
    set({ cameraMode: cameraMode === "chase" ? "cockpit" : "chase" });
  },
  setLocation: (location) => {
    if (get().location !== location) set({ location });
  },
  openMap: () => {
    const { phase, mode } = get();
    if (phase === "playing" && mode === "freeflight") set({ phase: "map" });
  },
  closeMap: () => {
    if (get().phase === "map") set({ phase: "playing" });
  },
  openHangar: () => {
    if (get().phase === "menu") set({ phase: "hangar" });
  },
  closeHangar: () => {
    if (get().phase === "hangar") set({ phase: "menu" });
  },
  endTestFlight: () => {
    const { phase, mode } = get();
    if (mode === "testflight" && (phase === "playing" || phase === "paused")) set({ phase: "hangar", location: "earth" });
  },
}));
