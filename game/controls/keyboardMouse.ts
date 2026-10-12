import { KEY_BINDINGS, KEYBOARD_STEER, MOUSE, type KeyAction } from "@/game/config/controls";
import { clamp, moveTowards, shapeAxis } from "@/game/systems/math";
import type { ControlAction, InputSource, SteeringSample } from "./types";

const CODE_TO_ACTION = new Map<string, KeyAction>();
for (const [action, codes] of Object.entries(KEY_BINDINGS) as [KeyAction, readonly string[]][]) {
  for (const code of codes) CODE_TO_ACTION.set(code, action);
}

const EDGE_ACTIONS: Partial<Record<KeyAction, ControlAction>> = {
  toggleCamera: "toggleCamera",
  pause: "pause",
  mute: "mute",
};

/** Normalized cursor position relative to screen center, y up. Shared with the HUD reticle. */
export interface CursorState {
  x: number;
  y: number;
  /** Cursor is inside the window and steering with the mouse. */
  active: boolean;
}

/**
 * Mouse steering without pointer lock: the ship turns towards the cursor's
 * offset from screen center. Arrow keys temporarily take over steering.
 */
export class KeyboardMouseSource implements InputSource {
  readonly id = "keyboard-mouse";
  readonly cursor: CursorState = { x: 0, y: 0, active: false };

  private readonly held = new Set<KeyAction>();
  private arrowPitch = 0;
  private arrowYaw = 0;
  private mouseSuspended = false;
  private suspendX = 0;
  private suspendY = 0;
  private lastClientX = 0;
  private lastClientY = 0;

  constructor(
    private readonly target: Window,
    private readonly onAction: (action: ControlAction) => void,
  ) {
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.handleBlur);
    target.addEventListener("pointermove", this.handlePointerMove);
    target.addEventListener("mouseout", this.handleMouseOut);
  }

  /** Whether any steering key is held (used by the hint system). */
  isHeld(action: KeyAction): boolean {
    return this.held.has(action);
  }

  sample(dt: number, out: SteeringSample): void {
    const up = this.held.has("pitchUp") ? 1 : 0;
    const down = this.held.has("pitchDown") ? 1 : 0;
    const left = this.held.has("yawLeft") ? 1 : 0;
    const right = this.held.has("yawRight") ? 1 : 0;
    const usingArrows = up + down + left + right > 0;
    const ramp = KEYBOARD_STEER.rampRate * dt;
    this.arrowPitch = moveTowards(this.arrowPitch, up - down, ramp);
    this.arrowYaw = moveTowards(this.arrowYaw, right - left, ramp);

    if (usingArrows) {
      this.mouseSuspended = true;
      this.suspendX = this.lastClientX;
      this.suspendY = this.lastClientY;
    }

    const arrowsSteering = usingArrows || Math.abs(this.arrowPitch) + Math.abs(this.arrowYaw) > 0.001;
    if (arrowsSteering) {
      out.pitch = this.arrowPitch;
      out.yaw = this.arrowYaw;
      out.active = true;
    } else if (this.cursor.active && !this.mouseSuspended) {
      out.pitch = shapeAxis(this.cursor.y, MOUSE.deadzone, MOUSE.curve);
      out.yaw = shapeAxis(this.cursor.x, MOUSE.deadzone, MOUSE.curve);
      out.active = true;
    }

    const rollRight = this.held.has("rollRight") ? 1 : 0;
    const rollLeft = this.held.has("rollLeft") ? 1 : 0;
    out.roll = rollRight - rollLeft;
    const throttleUp = this.held.has("throttleUp") ? 1 : 0;
    const throttleDown = this.held.has("throttleDown") ? 1 : 0;
    out.throttleDelta = throttleUp - throttleDown;
    out.boost = this.held.has("boost");
    if (out.roll !== 0 || out.throttleDelta !== 0 || out.boost) out.active = true;
  }

  dispose(): void {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.target.removeEventListener("pointermove", this.handlePointerMove);
    this.target.removeEventListener("mouseout", this.handleMouseOut);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const action = CODE_TO_ACTION.get(event.code);
    if (!action) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
    // Keep Space/arrows from scrolling or activating focused buttons.
    if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
    if (event.repeat) return;
    this.held.add(action);
    const edge = EDGE_ACTIONS[action];
    if (edge) this.onAction(edge);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    const action = CODE_TO_ACTION.get(event.code);
    if (action) this.held.delete(action);
  };

  private handleBlur = () => {
    this.held.clear();
    this.cursor.active = false;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const width = this.target.innerWidth;
    const height = this.target.innerHeight;
    const halfShort = Math.min(width, height) / 2;
    const reach = halfShort * MOUSE.fullDeflection;
    this.cursor.x = clamp((event.clientX - width / 2) / reach, -1, 1);
    this.cursor.y = clamp(-(event.clientY - height / 2) / reach, -1, 1);
    this.cursor.active = true;
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    if (this.mouseSuspended) {
      const moved = Math.hypot(event.clientX - this.suspendX, event.clientY - this.suspendY);
      if (moved > MOUSE.retakeThresholdPx) this.mouseSuspended = false;
    }
  };

  /** `relatedTarget === null` means the pointer left the window: stop steering. */
  private handleMouseOut = (event: MouseEvent) => {
    if (event.relatedTarget === null) this.cursor.active = false;
  };
}
