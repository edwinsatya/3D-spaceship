import { FLIGHT } from "@/game/config/flight";
import { clamp, clamp01 } from "@/game/systems/math";
import { createSteeringSample, resetSteeringSample, type ControlInput, type InputSource } from "./types";

/** Merges every input source into one ControlInput, once per frame. */
export class InputManager {
  readonly input: ControlInput = { pitch: 0, yaw: 0, roll: 0, throttle: 0, boost: false };
  /** Id of the source that produced input most recently. */
  lastActiveSource: string | null = null;

  private readonly scratch = createSteeringSample();

  constructor(private readonly sources: InputSource[]) {}

  setThrottle(value: number): void {
    this.input.throttle = clamp01(value);
  }

  resetForRun(): void {
    for (const source of this.sources) source.resetForRun?.();
  }

  update(dt: number, enabled: boolean): void {
    const input = this.input;
    input.pitch = 0;
    input.yaw = 0;
    input.roll = 0;
    input.boost = false;
    if (!enabled) return;

    let throttle = input.throttle;
    for (const source of this.sources) {
      const sample = this.scratch;
      resetSteeringSample(sample);
      source.sample(dt, sample);
      if (!sample.active) continue;
      this.lastActiveSource = source.id;
      input.pitch += sample.pitch;
      input.yaw += sample.yaw;
      input.roll += sample.roll;
      input.boost = input.boost || sample.boost;
      if (sample.throttleAbsolute !== null) throttle = sample.throttleAbsolute;
      else throttle += sample.throttleDelta * FLIGHT.throttleRate * dt;
    }
    input.pitch = clamp(input.pitch, -1, 1);
    input.yaw = clamp(input.yaw, -1, 1);
    input.roll = clamp(input.roll, -1, 1);
    input.throttle = clamp01(throttle);
  }

  dispose(): void {
    for (const source of this.sources) source.dispose();
  }
}
