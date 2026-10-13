import { SETTINGS } from "@/game/config/settings";
import { clamp, shapeAxis } from "@/game/systems/math";
import { analogPitch, inputTuning } from "./tuning";
import type { InputSource, SteeringSample } from "./types";

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS asks for motion access from a tap; other browsers allow it directly. */
export async function requestGyroPermission(): Promise<boolean> {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return false;
  const request = (DeviceOrientationEvent as unknown as OrientationPermission).requestPermission;
  if (typeof request !== "function") return true;
  try {
    return (await request()) === "granted";
  } catch {
    return false;
  }
}

export function gyroSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

/**
 * Tilt steering for phones held in landscape: tilting like a steering wheel
 * turns, tilting the top edge away pitches down. Angles are measured from the
 * pose at the start of a run (or when recentred), so any comfortable grip works.
 */
export class GyroSource implements InputSource {
  readonly id = "gyro";
  private beta: number | null = null;
  private gamma: number | null = null;
  private neutral: { x: number; y: number } | null = null;

  constructor() {
    if (typeof window !== "undefined") window.addEventListener("deviceorientation", this.handleOrientation);
  }

  /** Tilt in "screen" axes: x = steering-wheel roll, y = forward/back, in degrees. */
  private screenTilt(): { x: number; y: number } | null {
    if (this.beta === null || this.gamma === null) return null;
    const angle = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
    if (angle === 90) return { x: this.beta, y: -this.gamma };
    if (angle === 270 || angle === -90) return { x: -this.beta, y: this.gamma };
    return { x: this.gamma, y: this.beta };
  }

  recenter(): void {
    this.neutral = this.screenTilt();
  }

  sample(_dt: number, out: SteeringSample): void {
    if (!inputTuning.gyro) return;
    const tilt = this.screenTilt();
    if (!tilt) return;
    this.neutral ??= tilt;
    const { gyroFullTilt, gyroDeadzone } = SETTINGS.controls;
    const range = gyroFullTilt / inputTuning.gyroSensitivity;
    const yaw = shapeAxis(clamp((tilt.x - this.neutral.x) / range, -1, 1), gyroDeadzone, 1.2);
    const pitch = analogPitch(shapeAxis(clamp(-(tilt.y - this.neutral.y) / range, -1, 1), gyroDeadzone, 1.2));
    if (yaw === 0 && pitch === 0) return;
    out.yaw = yaw;
    out.pitch = pitch;
    out.active = true;
  }

  resetForRun(): void {
    this.recenter();
  }

  dispose(): void {
    if (typeof window !== "undefined") window.removeEventListener("deviceorientation", this.handleOrientation);
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    this.beta = event.beta;
    this.gamma = event.gamma;
  };
}
