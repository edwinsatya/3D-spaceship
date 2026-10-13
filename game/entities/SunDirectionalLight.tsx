"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4, Vector3, type DirectionalLight, type Object3D } from "three";
import { VISUALS } from "@/game/config/visuals";
import { useQualitySettings } from "@/game/scenes/useQualitySettings";
import { runtime } from "@/game/systems/runtime";

const { lead, lightDistance, bias, normalBiasTexels, radius } = VISUALS.shadows;
const ORIGIN = new Vector3();
const UP = new Vector3(0, 1, 0);
const _center = new Vector3();
const _forward = new Vector3();

/** Marks `object` and everything under it as a shadow caster and/or receiver. */
export function setShadows(object: Object3D, cast: boolean, receive: boolean): void {
  object.traverse((child) => {
    child.castShadow = cast;
    child.receiveShadow = receive;
  });
}

/**
 * Ref for a group whose meshes cast and/or receive sun shadows. Re-applied on
 * every render of the owner, so meshes it mounts later are covered too.
 */
export function useShadows<T extends Object3D>(cast = true, receive = true) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (ref.current) setShadows(ref.current, cast, receive);
  });
  return ref;
}

interface SunDirectionalLightProps {
  /** Unit vector towards the sun (kept stable: memoise it). */
  direction: Vector3;
  intensity: number;
  /** Half width of the shadow box (u), see VISUALS.shadows.extent. */
  extent: number;
  color?: string;
}

/**
 * The sun as a directional light. On tiers with shadows its shadow camera is a
 * box that follows the ship, pushed ahead along the view, and snapped to whole
 * shadow-map texels so shadow edges don't crawl as you fly.
 */
export function SunDirectionalLight({ direction, intensity, extent, color = "#fff3e2" }: SunDirectionalLightProps) {
  const light = useRef<DirectionalLight>(null);
  const { shadowMapSize } = useQualitySettings();
  const shadows = shadowMapSize > 0;
  // Light space: +Z points at the sun, so X/Y span the shadow map.
  const basis = useMemo(() => new Matrix4().lookAt(direction, ORIGIN, UP), [direction]);
  const inverse = useMemo(() => basis.clone().invert(), [basis]);

  useLayoutEffect(() => {
    const current = light.current;
    if (!current || !shadows) return;
    const { shadow } = current;
    shadow.mapSize.set(shadowMapSize, shadowMapSize);
    // The renderer builds a new map at the new size.
    shadow.map?.dispose();
    shadow.map = null;
    const camera = shadow.camera;
    camera.left = -extent;
    camera.right = extent;
    camera.top = extent;
    camera.bottom = -extent;
    camera.near = 1;
    camera.far = lightDistance * 2;
    camera.updateProjectionMatrix();
    shadow.bias = bias;
    shadow.normalBias = ((extent * 2) / shadowMapSize) * normalBiasTexels;
    shadow.radius = radius;
  }, [shadows, shadowMapSize, extent]);

  useFrame(({ camera }) => {
    const current = light.current;
    if (!current) return;
    const ship = runtime.refs.ship;
    _center.set(0, 0, 0);
    if (shadows && ship) {
      camera.getWorldDirection(_forward);
      _center.copy(ship.position).addScaledVector(_forward, extent * lead);
      const texel = (extent * 2) / shadowMapSize;
      _center.applyMatrix4(inverse);
      _center.set(Math.round(_center.x / texel) * texel, Math.round(_center.y / texel) * texel, _center.z);
      _center.applyMatrix4(basis);
    }
    current.position.copy(_center).addScaledVector(direction, lightDistance);
    // The target is not in the scene graph, so its matrix is updated here.
    current.target.position.copy(_center);
    current.target.updateMatrixWorld();
  });

  return <directionalLight ref={light} intensity={intensity} color={color} castShadow={shadows} />;
}
