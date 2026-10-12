import { Color, NoColorSpace, SRGBColorSpace, type WebGLRenderer, type WebGLRenderTarget } from "three";
import type { CelestialBody, RingData } from "@/game/data/planets";
import { EQUIRECT_DIRECTION, HASH, SIMPLEX_3D } from "@/game/scenes/shaders/noise";
import { bakeEquirect } from "./bake";

const HEADER = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uSeed;
${SIMPLEX_3D}
${HASH}
${EQUIRECT_DIRECTION}
`;

/** Cratered rock (Mercury, Moon, Mars): palette + crater density + dark plains. */
const ROCKY_FRAGMENT = /* glsl */ `
${HEADER}
uniform vec3 uLow;
uniform vec3 uHigh;
uniform vec3 uDark;
uniform float uCraters;
uniform float uMaria;
uniform float uPolar;
uniform float uCanyon;

float craters(vec3 p, float scale, float density) {
  vec3 cell = floor(p * scale);
  vec3 local = fract(p * scale);
  float height = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 offset = vec3(float(x), float(y), float(z));
    vec3 h = hash33(cell + offset + uSeed);
    if (h.z > density) continue;
    vec3 center = offset + 0.15 + h * 0.7 - local;
    float radius = 0.22 + 0.25 * hash13(cell + offset + 7.31);
    float d = length(center) / radius;
    float bowl = 1.0 - smoothstep(0.0, 0.95, d);
    float rim = smoothstep(0.7, 0.98, d) * (1.0 - smoothstep(0.98, 1.3, d));
    height += rim * 0.7 - bowl * 0.45;
  }
  return height;
}

void main() {
  vec3 dir = equirectDirection(vUv);
  float broad = fbm3(dir * 2.2 + uSeed * 0.37, 4) * 0.5 + 0.5;
  float maria = smoothstep(0.05, 0.28, fbm3(dir * 1.25 + uSeed, 4)) * uMaria * 2.0;
  float height = craters(dir, 5.0, 0.42 * uCraters)
    + craters(dir, 13.0, 0.4 * uCraters) * 0.6
    + craters(dir, 31.0, 0.36 * uCraters) * 0.35;
  float grain = fbm3(dir * 24.0, 3);
  vec3 ground = mix(uLow, uHigh, broad);
  ground = mix(ground, uDark, clamp(maria, 0.0, 0.9));
  vec3 color = ground * (0.92 + grain * 0.16) + uHigh * height * 0.16;

  if (uCanyon > 0.0) {
    float longitude = vUv.x * 6.28318;
    float window = smoothstep(3.8, 4.1, longitude) * (1.0 - smoothstep(4.9, 5.2, longitude));
    float path = dir.y - 0.05 - 0.02 * sin(longitude * 4.0);
    float canyon = exp(-path * path / 0.0012) * window * (0.6 + 0.4 * simplex3(dir * 30.0));
    color = mix(color, uDark * 0.6, canyon * uCanyon);
  }
  if (uPolar > 0.0) {
    float edge = 0.86 + simplex3(dir * 6.0 + uSeed) * 0.035;
    float ice = smoothstep(edge - 0.02, edge + 0.02, abs(dir.y));
    color = mix(color, vec3(0.92, 0.93, 0.95), ice * uPolar);
  }
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

/** Thick, swirling cloud deck (Venus). */
const CLOUDS_FRAGMENT = /* glsl */ `
${HEADER}
uniform vec3 uBase;
uniform vec3 uDarkTone;
uniform vec3 uBright;
void main() {
  vec3 dir = equirectDirection(vUv);
  vec3 q = dir * 2.0 + uSeed;
  vec3 warp = vec3(fbm3(q, 4), fbm3(q + 3.1, 4), fbm3(q - 2.7, 4));
  float n = fbm3(q * 1.5 + warp * 1.8, 6) * 0.5 + 0.5;
  float longitude = vUv.x * 6.28318;
  float chevron = sin(longitude * 2.0 + abs(dir.y) * 7.0 + n * 3.0);
  vec3 color = mix(uDarkTone, uBase, smoothstep(0.25, 0.65, n));
  color = mix(color, uBright, smoothstep(0.62, 0.9, n));
  color *= 0.93 + 0.07 * chevron;
  fragColor = vec4(color, 1.0);
}
`;

/** Banded gas/ice giant with turbulence and an optional oval storm. */
const GAS_FRAGMENT = /* glsl */ `
${HEADER}
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uBands;
uniform float uTurbulence;
uniform vec4 uStorm;
uniform vec3 uStormColor;
void main() {
  vec3 dir = equirectDirection(vUv);
  float lat = dir.y;
  vec3 q = dir * 3.0 + uSeed;
  float warp = fbm3(q, 4) * uTurbulence * 0.09;
  float swirl = fbm3(vec3(dir.x * 7.0, lat * 26.0, dir.z * 7.0) + uSeed, 3) * uTurbulence * 0.035;
  float l = lat + warp + swirl;
  float s1 = 0.5 + 0.5 * sin(l * uBands * 3.14159 + fbm3(dir * 2.0, 2) * 1.4 * uTurbulence);
  float s2 = 0.5 + 0.5 * sin(l * uBands * 0.53 * 3.14159 + 1.3);
  vec3 color = mix(mix(uC0, uC1, s1), mix(uC2, uC3, s1), s2 * 0.75);
  float streak = fbm3(vec3(dir.x * 2.0, l * 70.0, dir.z * 2.0), 3) * 0.5 + 0.5;
  color *= 0.9 + streak * 0.2;
  color *= mix(1.0, 0.82, smoothstep(0.75, 1.0, abs(lat)));

  if (uStorm.w > 0.0) {
    float v0 = 1.0 - acos(clamp(uStorm.x, -1.0, 1.0)) / 3.14159;
    float u0 = uStorm.y / 6.28318;
    vec2 d = vec2(vUv.x - u0, vUv.y - v0);
    d.x -= floor(d.x + 0.5);
    d /= vec2(uStorm.z * 0.9, uStorm.z * 0.55);
    float e = length(d);
    float angle = atan(d.y, d.x) + e * 4.0;
    float spiral = 0.5 + 0.5 * sin(angle * 3.0);
    float core = 1.0 - smoothstep(0.55, 1.0, e);
    float rim = smoothstep(0.75, 0.95, e) * (1.0 - smoothstep(0.95, 1.15, e));
    color = mix(color, uStormColor * (0.85 + 0.25 * spiral), core);
    color = mix(color, uC0, rim * 0.6);
  }
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

/** Radial ring profile: x = (r - inner) / (outer - inner); alpha = opacity. */
const RING_FRAGMENT = /* glsl */ `
${HEADER}
#define MAX_BANDS 6
uniform vec3 uRingColor;
uniform float uInner;
uniform float uOuter;
uniform vec3 uBands[MAX_BANDS];
uniform int uBandCount;
void main() {
  float r = mix(uInner, uOuter, vUv.x);
  float opacity = 0.0;
  for (int i = 0; i < MAX_BANDS; i++) {
    if (i >= uBandCount) break;
    vec3 band = uBands[i];
    float soft = 0.004;
    opacity = max(opacity, band.z * smoothstep(band.x - soft, band.x + soft, r) * (1.0 - smoothstep(band.y - soft, band.y + soft, r)));
  }
  float ringlets = 0.72 + 0.28 * (simplex3(vec3(r * 140.0, 0.0, uSeed)) * 0.5 + 0.5);
  float tone = 0.82 + 0.18 * (simplex3(vec3(r * 35.0, 3.0, uSeed)) * 0.5 + 0.5);
  fragColor = vec4(uRingColor * tone, clamp(opacity * ringlets, 0.0, 1.0));
}
`;

export interface SurfaceBakeSize {
  width: number;
  anisotropy: number;
}

const color = (hex: string) => new Color(hex);

/** Bakes the procedural surface for any non-Earth body. */
export function bakeSurface(renderer: WebGLRenderer, body: CelestialBody, size: SurfaceBakeSize): WebGLRenderTarget | null {
  const surface = body.surface;
  const common = {
    width: size.width,
    height: size.width / 2,
    colorSpace: SRGBColorSpace,
    anisotropy: size.anisotropy,
  } as const;
  const seed = { value: body.seed };
  switch (surface.type) {
    case "rocky":
      return bakeEquirect(renderer, {
        ...common,
        fragmentShader: ROCKY_FRAGMENT,
        uniforms: {
          uSeed: seed,
          uLow: { value: color(surface.palette[0]) },
          uHigh: { value: color(surface.palette[1]) },
          uDark: { value: color(surface.palette[2]) },
          uCraters: { value: surface.craters },
          uMaria: { value: surface.maria },
          uPolar: { value: surface.polarCaps ? 1 : 0 },
          uCanyon: { value: surface.canyon ? 1 : 0 },
        },
      });
    case "clouds":
      return bakeEquirect(renderer, {
        ...common,
        fragmentShader: CLOUDS_FRAGMENT,
        uniforms: {
          uSeed: seed,
          uBase: { value: color(surface.palette[0]) },
          uDarkTone: { value: color(surface.palette[1]) },
          uBright: { value: color(surface.palette[2]) },
        },
      });
    case "gas": {
      const storm = surface.storm;
      return bakeEquirect(renderer, {
        ...common,
        fragmentShader: GAS_FRAGMENT,
        uniforms: {
          uSeed: seed,
          uC0: { value: color(surface.palette[0]) },
          uC1: { value: color(surface.palette[1]) },
          uC2: { value: color(surface.palette[2]) },
          uC3: { value: color(surface.palette[3]) },
          uBands: { value: surface.bands },
          uTurbulence: { value: surface.turbulence },
          uStorm: { value: storm ? [storm.latitude, storm.longitude, storm.size, 1] : [0, 0, 0, 0] },
          uStormColor: { value: color(storm?.color ?? "#000000") },
        },
      });
    }
    default:
      return null;
  }
}

export const MAX_RING_BANDS = 6;

export function ringExtent(rings: RingData): { inner: number; outer: number } {
  return {
    inner: Math.min(...rings.bands.map((band) => band.from)),
    outer: Math.max(...rings.bands.map((band) => band.to)),
  };
}

export function bakeRings(renderer: WebGLRenderer, rings: RingData, seed: number): WebGLRenderTarget {
  const { inner, outer } = ringExtent(rings);
  const bands = rings.bands.slice(0, MAX_RING_BANDS).map((band) => [band.from, band.to, band.opacity]);
  while (bands.length < MAX_RING_BANDS) bands.push([0, 0, 0]);
  return bakeEquirect(renderer, {
    width: 1024,
    height: 4,
    fragmentShader: RING_FRAGMENT,
    uniforms: {
      uSeed: { value: seed },
      uRingColor: { value: color(rings.color) },
      uInner: { value: inner },
      uOuter: { value: outer },
      uBands: { value: new Float32Array(bands.flat()) },
      uBandCount: { value: rings.bands.length },
    },
    colorSpace: NoColorSpace,
    mipmaps: false,
  });
}
