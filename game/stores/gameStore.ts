import { create } from "zustand";
import type { InputDevice } from "@/game/controls/types";
import { MISSIONS, type MissionId } from "@/game/data/missions";
import type { LocationId } from "@/game/data/planets";
import type { SurfaceId } from "@/game/data/surfaces";
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
  /** Which planet scene is loaded (menu, hangar and free flight start at Earth; missions at their own). */
  location: LocationId;
  /** Landing site currently loaded instead of the space scene (Moon or Mars). */
  surface: SurfaceId | null;
  cameraMode: CameraMode;
  webgl: WebGLStatus;

  transition: (to: GamePhase) => boolean;
  setWebGL: (status: WebGLStatus) => void;
  setDevice: (device: InputDevice) => void;
  /** Starts a run; missions fly `missionId` (or the selected one). */
  startRun: (mode: GameMode, missionId?: MissionId) => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  showResult: () => void;
  toMenu: () => void;
  toggleCamera: () => void;
  setLocation: (location: LocationId) => void;
  setSurface: (surface: SurfaceId | null) => void;
  openMap: () => void;
  closeMap: () => void;
  openPhoto: () => void;
  closePhoto: () => void;
  openHangar: () => void;
  closeHangar: () => void;
  /** Ends a test flight (timer or button) and returns to the hangar. */
  endTestFlight: () => void;
}

function runLocation(mode: GameMode, missionId: MissionId): LocationId {
  return mode === "mission" ? MISSIONS[missionId].location : "earth";
}

export const useGameStore = create<GameStore>()((set, get) => ({
  phase: "boot",
  mode: "mission",
  missionId: "orbit-rings",
  runId: 0,
  device: "desktop",
  location: "earth",
  surface: null,
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
  startRun: (mode, missionId) => {
    const { phase, runId } = get();
    if (!canTransition(phase, "playing")) return;
    const mission = missionId ?? get().missionId;
    set({
      phase: "playing",
      mode,
      missionId: mission,
      runId: runId + 1,
      cameraMode: "chase",
      location: runLocation(mode, mission),
      surface: null,
    });
  },
  restart: () => {
    const { phase, runId, mode, missionId } = get();
    if (!canTransition(phase, "playing")) return;
    set({ phase: "playing", runId: runId + 1, location: runLocation(mode, missionId), surface: null });
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
    if (get().transition("menu")) set({ location: "earth", surface: null });
  },
  toggleCamera: () => {
    const { phase, cameraMode } = get();
    if (phase !== "playing") return;
    set({ cameraMode: cameraMode === "chase" ? "cockpit" : "chase" });
  },
  setLocation: (location) => {
    if (get().location !== location) set({ location });
  },
  setSurface: (surface) => {
    if (get().surface !== surface) set({ surface });
  },
  openMap: () => {
    const { phase, mode, surface } = get();
    if (phase === "playing" && mode === "freeflight" && !surface) set({ phase: "map" });
  },
  closeMap: () => {
    if (get().phase === "map") set({ phase: "playing" });
  },
  openPhoto: () => {
    if (get().phase === "playing") set({ phase: "photo" });
  },
  closePhoto: () => {
    if (get().phase === "photo") set({ phase: "playing" });
  },
  openHangar: () => {
    if (get().phase === "menu") set({ phase: "hangar" });
  },
  closeHangar: () => {
    if (get().phase === "hangar") set({ phase: "menu" });
  },
  endTestFlight: () => {
    const { phase, mode } = get();
    if (mode === "testflight" && (phase === "playing" || phase === "paused")) set({ phase: "hangar", location: "earth", surface: null });
  },
}));
