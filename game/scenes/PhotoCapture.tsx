"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { usePhotoStore } from "@/game/stores/photoStore";
import { filterCss } from "@/game/systems/photo";
import { currentPhotoScore, processCapture } from "@/game/systems/photoCapture";
import { runtime } from "@/game/systems/runtime";
import { useQualitySettings } from "./useQualitySettings";

/** Runs after the composer (priority 2) so the shutter grabs the finished frame. */
const AFTER_RENDER = 2;

/**
 * Mounted while photo mode is open: live filter preview on the canvas, the
 * ship toggle, and the capture right after a frame has been drawn.
 */
export function PhotoCapture() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const { bloom } = useQualitySettings();
  const filter = usePhotoStore((state) => state.filter);
  const hideShip = usePhotoStore((state) => state.hideShip);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.filter = filterCss(filter);
    return () => {
      canvas.style.filter = "";
    };
  }, [gl, filter]);

  useEffect(
    () => () => {
      if (runtime.refs.ship) runtime.refs.ship.visible = true;
    },
    [],
  );

  useFrame(() => {
    if (runtime.refs.ship) runtime.refs.ship.visible = !hideShip;
    // A priority > 0 callback turns off R3F's own render: without bloom nobody else draws.
    if (!bloom) gl.render(scene, camera);
    if (!runtime.photo.captureRequested) return;
    runtime.photo.captureRequested = false;
    const canvas = gl.domElement;
    const score = currentPhotoScore(canvas.width / canvas.height);
    void processCapture(createImageBitmap(canvas), { filter, score }).catch((error) => console.warn("[photo] capture failed", error));
  }, AFTER_RENDER);

  return null;
}
