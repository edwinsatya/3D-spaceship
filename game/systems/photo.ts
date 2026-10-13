import { Vector3 } from "three";
import { PHOTO, PHOTO_FILTERS, type PhotoFilterFunction, type PhotoFilterId } from "@/game/config/photo";
import type { CelestialBody } from "@/game/data/planets";
import type { FeatureTarget, PhotoTarget } from "@/game/data/photoTargets";
import { clamp01, smoothstep } from "./math";

const DEG = Math.PI / 180;

/** Unit direction of a texture point in the planet's own frame (three.js SphereGeometry UVs). */
export function textureDirection(u: number, latitude: number, target: Vector3): Vector3 {
  const phi = u * Math.PI * 2;
  const theta = (90 - latitude) * DEG;
  return target.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
}

/** Planet frame → location frame: spin about the pole (Y), then the axial tilt (about Z). */
export function bodyToWorld(local: Vector3, spin: number, tiltDegrees: number, target: Vector3): Vector3 {
  const x = local.x * Math.cos(spin) + local.z * Math.sin(spin);
  const z = -local.x * Math.sin(spin) + local.z * Math.cos(spin);
  const y = local.y;
  const tilt = tiltDegrees * DEG;
  return target.set(x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt), z);
}

const _local = new Vector3();

/** Where a surface feature is right now, and its outward normal (location frame). */
export function featurePlacement(
  feature: FeatureTarget,
  body: CelestialBody,
  spin: number,
  outPosition: Vector3,
  outNormal: Vector3,
): void {
  textureDirection(feature.u, feature.latitude, _local);
  bodyToWorld(_local, spin, body.axialTilt, outNormal);
  outPosition.set(...body.position).addScaledVector(outNormal, body.radius);
}

/** Spin angle that turns a surface feature to face `direction` (location frame) as well as it can. */
export function spinToFace(feature: FeatureTarget, body: CelestialBody, direction: Vector3): number {
  const tilt = body.axialTilt * DEG;
  // Undo the tilt, then compare azimuths around the pole (atan2(x, z) grows with the Y rotation).
  const dx = direction.x * Math.cos(tilt) + direction.y * Math.sin(tilt);
  const dz = direction.z;
  textureDirection(feature.u, feature.latitude, _local);
  return Math.atan2(dx, dz) - Math.atan2(_local.x, _local.z);
}

export interface PhotoCamera {
  position: Vector3;
  forward: Vector3;
  up: Vector3;
  /** Vertical field of view in degrees. */
  fov: number;
  aspect: number;
}

const _right = new Vector3();
const _relative = new Vector3();
const _toCamera = new Vector3();
const _normal = new Vector3();
const _point = new Vector3();
const _view = new Vector3();

/** Normalised screen position (−1..1, +y up) and depth; null when behind the camera. */
function project(point: Vector3, camera: PhotoCamera): { x: number; y: number; depth: number } | null {
  _relative.subVectors(point, camera.position);
  const depth = _relative.dot(camera.forward);
  if (depth <= 0) return null;
  _right.crossVectors(camera.forward, camera.up).normalize();
  const tanV = Math.tan((camera.fov * DEG) / 2);
  return { x: _relative.dot(_right) / (depth * tanV * camera.aspect), y: _relative.dot(camera.up) / (depth * tanV), depth };
}

/** Bigger is better up to `ideal`, then a gentle penalty once it overflows the frame. */
function sizeScore(fraction: number, min: number, ideal: number): number {
  if (fraction <= ideal) return clamp01((fraction - min) / (ideal - min));
  return clamp01(1 - (fraction - ideal) / (1.5 - ideal));
}

export interface PhotoScore {
  /** 0–100; 0 means the subject is not in the picture at all. */
  score: number;
  center: number;
  size: number;
  light: number;
  /** Feature: how face-on. Planet: how open the rings look. */
  angle: number;
}

const NOT_IN_FRAME: PhotoScore = { score: 0, center: 0, size: 0, light: 0, angle: 0 };

/** How good a shot of `target` the camera would take right now (pure; unit-tested). */
export function scorePhoto(target: PhotoTarget, body: CelestialBody, spin: number, camera: PhotoCamera, sun: Vector3): PhotoScore {
  const { scoring } = PHOTO;
  if (target.kind === "feature") {
    featurePlacement(target, body, spin, _point, _normal);
    _toCamera.subVectors(camera.position, _point).normalize();
    const facing = _normal.dot(_toCamera);
    const projected = project(_point, camera);
    if (facing <= 0.05 || !projected || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return NOT_IN_FRAME;
    const weights = scoring.feature;
    const center = 1 - clamp01(Math.hypot(projected.x, projected.y) / 1.2);
    const fraction = (target.size * body.radius * 2) / (2 * projected.depth * Math.tan((camera.fov * DEG) / 2));
    const size = sizeScore(fraction, weights.minSize, weights.idealSize);
    const angle = smoothstep(0.2, 0.85, facing);
    const light = smoothstep(0, 0.45, _normal.dot(sun));
    const score = 100 * (weights.center * center + weights.size * size + weights.facing * angle + weights.light * light);
    return { score: Math.round(score), center, size, light, angle };
  }

  _point.set(...body.position);
  const projected = project(_point, camera);
  if (!projected || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return NOT_IN_FRAME;
  const weights = scoring.planet;
  const outer = body.rings ? Math.max(...body.rings.bands.map((band) => band.to)) * body.radius : body.radius;
  const center = 1 - clamp01(Math.hypot(projected.x, projected.y) / 1.2);
  // The rings span the picture horizontally: compare their width with the frame's.
  const fill = (2 * outer) / (2 * projected.depth * Math.tan((camera.fov * DEG) / 2) * camera.aspect);
  const size = sizeScore(fill, weights.minSize, weights.idealSize);
  const tilt = body.axialTilt * DEG;
  _view.subVectors(_point, camera.position).normalize();
  const elevation = Math.abs(_view.x * -Math.sin(tilt) + _view.y * Math.cos(tilt));
  const angle = body.rings ? clamp01(elevation / scoring.ringOpen) : 1;
  _toCamera.subVectors(camera.position, _point).normalize();
  const light = smoothstep(-0.1, 0.6, _toCamera.dot(sun));
  const score = 100 * (weights.center * center + weights.size * size + weights.rings * angle + weights.light * light);
  return { score: Math.round(score), center, size, light, angle };
}

/** 3×4 affine colour matrix: rows r, g, b as [m0, m1, m2, offset] on 0..1 values. */
export type ColorMatrix = readonly [number, number, number, number][];

const IDENTITY: ColorMatrix = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
];

/** The matrices the CSS Filter Effects spec defines for each filter function. */
function functionMatrix(name: PhotoFilterFunction, amount: number): ColorMatrix {
  switch (name) {
    case "brightness":
      return [
        [amount, 0, 0, 0],
        [0, amount, 0, 0],
        [0, 0, amount, 0],
      ];
    case "contrast": {
      const offset = 0.5 - 0.5 * amount;
      return [
        [amount, 0, 0, offset],
        [0, amount, 0, offset],
        [0, 0, amount, offset],
      ];
    }
    case "saturate": {
      const s = amount;
      return [
        [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0],
        [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0],
        [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0],
      ];
    }
    case "grayscale": {
      const a = 1 - clamp01(amount);
      return [
        [0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a, 0],
        [0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a, 0],
        [0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a, 0],
      ];
    }
    case "sepia": {
      const a = 1 - clamp01(amount);
      return [
        [0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a, 0],
        [0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a, 0],
        [0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a, 0],
      ];
    }
    case "hue-rotate": {
      const c = Math.cos(amount * DEG);
      const s = Math.sin(amount * DEG);
      return [
        [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0],
        [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0],
        [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0],
      ];
    }
  }
}

/** `next` applied after `first`. */
function compose(next: ColorMatrix, first: ColorMatrix): ColorMatrix {
  return next.map((row) => {
    const out: [number, number, number, number] = [0, 0, 0, row[3]];
    for (let j = 0; j < 3; j++) {
      out[j] = row[0] * first[0][j] + row[1] * first[1][j] + row[2] * first[2][j];
      out[3] += row[j] * first[j][3];
    }
    return out;
  });
}

/** One matrix for a whole filter chain (CSS applies the functions left to right). */
export function filterMatrix(id: PhotoFilterId): ColorMatrix {
  return PHOTO_FILTERS[id].reduce<ColorMatrix>((matrix, [name, amount]) => compose(functionMatrix(name, amount), matrix), IDENTITY);
}

/** The same filter as a CSS `filter` value for the live preview. */
export function filterCss(id: PhotoFilterId): string {
  const chain = PHOTO_FILTERS[id];
  if (chain.length === 0) return "none";
  return chain.map(([name, amount]) => (name === "hue-rotate" ? `${name}(${amount}deg)` : `${name}(${amount})`)).join(" ");
}

/** Applies a colour matrix to RGBA pixels in place (alpha untouched). */
export function applyColorMatrix(pixels: Uint8ClampedArray, matrix: ColorMatrix): void {
  const [r, g, b] = matrix;
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i] / 255;
    const green = pixels[i + 1] / 255;
    const blue = pixels[i + 2] / 255;
    pixels[i] = (r[0] * red + r[1] * green + r[2] * blue + r[3]) * 255;
    pixels[i + 1] = (g[0] * red + g[1] * green + g[2] * blue + g[3]) * 255;
    pixels[i + 2] = (b[0] * red + b[1] * green + b[2] * blue + b[3]) * 255;
  }
}
