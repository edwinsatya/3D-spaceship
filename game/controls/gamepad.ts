import { GAMEPAD } from "@/game/config/controls";
import { clamp, shapeAxis } from "@/game/systems/math";
import { analogPitch, inputTuning } from "./tuning";
import type { ControlAction, InputSource, SteeringSample } from "./types";

type ButtonName = keyof typeof GAMEPAD.buttons;

/** Buttons that fire once per press (handled outside the frame loop, like keyboard shortcuts). */
const EDGE_BUTTONS: Partial<Record<ButtonName, ControlAction>> = {
  land: "land",
  orbit: "orbit",
  toggleCamera: "toggleCamera",
  map: "map",
  pause: "pause",
  photo: "photo",
};

function firstGamepad(): Gamepad | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  for (const pad of navigator.getGamepads()) if (pad && pad.connected) return pad;
  return null;
}

function pressed(pad: Gamepad, index: number): boolean {
  return pad.buttons[index]?.pressed ?? false;
}

/**
 * Standard-mapping gamepads: left stick steers, RT/LT throttle up/down,
 * A boosts, LB/RB roll; menu buttons fire actions. Buttons are polled on
 * their own animation frame so Start can also resume a paused game.
 */
export class GamepadSource implements InputSource {
  readonly id = "gamepad";
  private readonly wasPressed = new Set<ButtonName>();
  private frame = 0;

  constructor(
    private readonly onAction: (action: ControlAction) => void,
    private readonly onConnect: (name: string | null) => void = () => {},
  ) {
    if (typeof window === "undefined") return;
    window.addEventListener("gamepadconnected", this.handleConnect);
    window.addEventListener("gamepaddisconnected", this.handleDisconnect);
    if (firstGamepad()) this.startPolling();
  }

  sample(_dt: number, out: SteeringSample): void {
    const pad = firstGamepad();
    if (!pad) return;
    const gain = inputTuning.sensitivity;
    const x = pad.axes[GAMEPAD.axes.steerX] ?? 0;
    const y = pad.axes[GAMEPAD.axes.steerY] ?? 0;
    const yaw = shapeAxis(clamp(x * gain, -1, 1), GAMEPAD.deadzone, GAMEPAD.curve);
    // Stick up is negative on the Gamepad API; up = nose up.
    const pitch = analogPitch(shapeAxis(clamp(-y * gain, -1, 1), GAMEPAD.deadzone, GAMEPAD.curve));
    const { buttons } = GAMEPAD;
    const up = pad.buttons[buttons.throttle]?.value ?? 0;
    const down = pad.buttons[buttons.brake]?.value ?? 0;
    const throttle = (up > GAMEPAD.triggerThreshold ? up : 0) - (down > GAMEPAD.triggerThreshold ? down : 0);
    const roll = (pressed(pad, buttons.rollRight) ? 1 : 0) - (pressed(pad, buttons.rollLeft) ? 1 : 0);
    const boost = pressed(pad, buttons.boost);
    if (yaw === 0 && pitch === 0 && throttle === 0 && roll === 0 && !boost) return;
    out.yaw = yaw;
    out.pitch = pitch;
    out.throttleDelta = throttle;
    out.roll = roll;
    out.boost = boost;
    out.active = true;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (typeof window === "undefined") return;
    window.removeEventListener("gamepadconnected", this.handleConnect);
    window.removeEventListener("gamepaddisconnected", this.handleDisconnect);
  }

  private startPolling(): void {
    if (this.frame) return;
    const poll = () => {
      const pad = firstGamepad();
      if (!pad) {
        this.frame = 0;
        return;
      }
      for (const [name, action] of Object.entries(EDGE_BUTTONS) as [ButtonName, ControlAction][]) {
        const down = pressed(pad, GAMEPAD.buttons[name]);
        if (down && !this.wasPressed.has(name)) this.onAction(action);
        if (down) this.wasPressed.add(name);
        else this.wasPressed.delete(name);
      }
      this.frame = requestAnimationFrame(poll);
    };
    this.frame = requestAnimationFrame(poll);
  }

  private handleConnect = (event: GamepadEvent) => {
    this.onConnect(event.gamepad.id);
    this.startPolling();
  };

  private handleDisconnect = () => {
    this.onConnect(firstGamepad()?.id ?? null);
  };
}
