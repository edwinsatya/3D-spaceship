import { getConsoleFunction, setConsoleFunction } from "three";

/**
 * Known deprecation warnings caused by third-party code we cannot change.
 *
 * - `THREE.Clock` (deprecated in three r183): @react-three/fiber 9.x, the latest
 *   stable release, still creates one per Canvas. The Clock keeps working; R3F
 *   moves to THREE.Timer in v10. Remove this entry when upgrading to R3F v10.
 */
export const SILENCED_THREE_WARNINGS: readonly string[] = ["THREE.Clock: This module has been deprecated"];

let installed = false;

/**
 * Routes three.js console output through its official `setConsoleFunction`
 * hook and drops only the warnings listed above. Everything else is forwarded
 * unchanged. Must run before the Canvas is created.
 */
export function installThreeConsoleFilter(): void {
  if (installed) return;
  installed = true;
  const previous = getConsoleFunction();
  setConsoleFunction((type, message, ...params) => {
    if (type === "warn" && SILENCED_THREE_WARNINGS.some((silenced) => message.startsWith(silenced))) return;
    if (previous) previous(type, message, ...params);
    else console[type](message, ...params);
  });
}
