/** The single input object every device writes into and the flight system reads. */
export interface ControlInput {
  /** -1..1, positive = nose up. */
  pitch: number;
  /** -1..1, positive = turn right. */
  yaw: number;
  /** -1..1, positive = roll right. */
  roll: number;
  /** 0..1 target throttle. */
  throttle: number;
  boost: boolean;
}

/** Discrete, edge-triggered actions handled outside the frame loop. */
export type ControlAction = "toggleCamera" | "pause" | "mute" | "map" | "orbit" | "land";

export type InputDevice = "desktop" | "touch";

export interface SteeringSample {
  pitch: number;
  yaw: number;
  roll: number;
  /** -1, 0 or 1: throttle down/up request (keyboard style). */
  throttleDelta: number;
  /** Absolute throttle request (slider style) or null. */
  throttleAbsolute: number | null;
  boost: boolean;
  /** True when this source produced steering this frame. */
  active: boolean;
}

export interface InputSource {
  readonly id: string;
  /** Writes this frame's state into `out`. */
  sample(dt: number, out: SteeringSample): void;
  /** Called when a run starts (e.g. ignore a cursor still parked on the Start button). */
  resetForRun?(): void;
  dispose(): void;
}

export function createSteeringSample(): SteeringSample {
  return { pitch: 0, yaw: 0, roll: 0, throttleDelta: 0, throttleAbsolute: null, boost: false, active: false };
}

export function resetSteeringSample(sample: SteeringSample): void {
  sample.pitch = 0;
  sample.yaw = 0;
  sample.roll = 0;
  sample.throttleDelta = 0;
  sample.throttleAbsolute = null;
  sample.boost = false;
  sample.active = false;
}
