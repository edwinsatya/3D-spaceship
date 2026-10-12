import { NoColorSpace, SRGBColorSpace, type WebGLRenderer, type WebGLRenderTarget } from "three";
import { EQUIRECT_DIRECTION, HASH, SIMPLEX_3D, SRGB_TO_LINEAR } from "@/game/scenes/shaders/noise";
import { bakeEquirect } from "./bake";

const HEADER = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uSeed;
${SIMPLEX_3D}
${HASH}
${EQUIRECT_DIRECTION}
${SRGB_TO_LINEAR}
`;

/** Shared by the day and night bakes so city lights sit on the same continents. */
const EARTH_COMMON = /* glsl */ `
const float SEA_LEVEL = 0.075;

float continentField(vec3 dir) {
  vec3 q = dir * 1.25 + vec3(uSeed * 1.7, uSeed * 0.31, -uSeed * 0.9);
  vec3 warp = vec3(simplex3(q + 11.3), simplex3(q + 27.1), simplex3(q - 7.7)) * 0.32;
  return fbm3(q + warp, 6) + 0.18 * fbm3(dir * 4.3 + 3.1, 3);
}

float moistureField(vec3 dir) {
  return fbm3(dir * 2.4 + vec3(5.2, uSeed, 1.3), 4) * 0.5 + 0.5;
}

float aridity(vec3 dir, float moisture) {
  float lat = abs(dir.y);
  float band = exp(-pow((lat - 0.4) / 0.17, 2.0));
  return smoothstep(0.52, 0.8, band * 0.85 + (1.0 - moisture) * 0.55);
}
`;

const EARTH_DAY_FRAGMENT = /* glsl */ `
${HEADER}
${EARTH_COMMON}
void main() {
  vec3 dir = equirectDirection(vUv);
  float lat = abs(dir.y);
  float h = continentField(dir);
  float land = smoothstep(SEA_LEVEL - 0.006, SEA_LEVEL + 0.006, h);
  float elevation = clamp((h - SEA_LEVEL) * 2.4, 0.0, 1.0);
  float depth = clamp((SEA_LEVEL - h) * 3.0, 0.0, 1.0);
  float moisture = moistureField(dir);
  float detail = fbm3(dir * 22.0, 3) * 0.5 + 0.5;
  float arid = aridity(dir, moisture);

  vec3 oceanShallow = srgbToLinear(vec3(0.07, 0.38, 0.55));
  vec3 oceanDeep = srgbToLinear(vec3(0.02, 0.08, 0.25));
  vec3 ocean = mix(oceanShallow, oceanDeep, smoothstep(0.0, 0.3, depth));

  vec3 forest = srgbToLinear(vec3(0.09, 0.28, 0.09));
  vec3 grass = srgbToLinear(vec3(0.33, 0.46, 0.2));
  vec3 desert = srgbToLinear(vec3(0.8, 0.66, 0.43));
  vec3 rock = srgbToLinear(vec3(0.46, 0.39, 0.33));
  vec3 tundra = srgbToLinear(vec3(0.5, 0.52, 0.44));

  vec3 ground = mix(grass, forest, smoothstep(0.45, 0.72, moisture));
  ground = mix(ground, desert, arid);
  ground = mix(ground, tundra, smoothstep(0.58, 0.78, lat));
  ground = mix(ground, rock, smoothstep(0.4, 0.85, elevation));
  ground *= 0.82 + detail * 0.36;

  vec3 color = mix(ocean, ground, land);
  float iceLine = 0.87 + simplex3(dir * 7.0) * 0.035;
  float ice = smoothstep(iceLine - 0.015, iceLine + 0.015, lat);
  float peaks = smoothstep(0.75, 0.95, elevation) * land;
  color = mix(color, srgbToLinear(vec3(0.93, 0.96, 0.99)), max(ice, peaks));

  float oceanMask = (1.0 - land) * (1.0 - ice);
  fragColor = vec4(color, oceanMask);
}
`;

/** R = city lights, G = clouds. */
const EARTH_NIGHT_FRAGMENT = /* glsl */ `
${HEADER}
${EARTH_COMMON}
void main() {
  vec3 dir = equirectDirection(vUv);
  float lat = abs(dir.y);
  float h = continentField(dir);
  float land = smoothstep(SEA_LEVEL - 0.002, SEA_LEVEL + 0.012, h);
  float arid = aridity(dir, moistureField(dir));

  float regions = smoothstep(0.48, 0.78, fbm3(dir * 3.4 + 40.0, 4) * 0.5 + 0.5);
  float coast = 1.0 + 1.2 * (1.0 - smoothstep(0.0, 0.05, h - SEA_LEVEL));
  float towns = smoothstep(0.7, 0.92, simplex3(dir * 140.0) * 0.5 + 0.5);
  float metro = smoothstep(0.55, 0.85, fbm3(dir * 38.0, 3) * 0.5 + 0.5);
  float habitable = (1.0 - smoothstep(0.68, 0.8, lat)) * (1.0 - arid * 0.85);
  float city = land * habitable * clamp(regions * coast * (towns * 0.7 + metro * 0.8), 0.0, 1.0);

  vec3 q = dir * 1.9 + vec3(uSeed * 3.1, 0.0, uSeed);
  vec3 warp = vec3(fbm3(q + 1.7, 3), fbm3(q + 9.2, 3), fbm3(q - 4.1, 3)) * 1.1;
  float c = fbm3(q * 1.7 + warp, 6) * 0.5 + 0.5;
  float bands = 0.82 + 0.18 * cos(lat * 10.0);
  float clouds = smoothstep(0.5, 0.78, c * bands + 0.06);

  fragColor = vec4(city, clouds, 0.0, 1.0);
}
`;

/** Tileable fbm (R, G at two scales) that sharpens planets up close. */
const DETAIL_FRAGMENT = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tileNoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash2(mod(i, period));
  float b = hash2(mod(i + vec2(1.0, 0.0), period));
  float c = hash2(mod(i + vec2(0.0, 1.0), period));
  float d = hash2(mod(i + vec2(1.0, 1.0), period));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float tileFbm(vec2 uv, float period) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amplitude * tileNoise(uv * period, period);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return sum / 0.97;
}

void main() {
  fragColor = vec4(tileFbm(vUv, 4.0), tileFbm(vUv + 0.37, 8.0), 0.0, 1.0);
}
`;

export function bakeDetail(renderer: WebGLRenderer, size: number, anisotropy: number): WebGLRenderTarget {
  return bakeEquirect(renderer, {
    width: size,
    height: size,
    fragmentShader: DETAIL_FRAGMENT,
    colorSpace: NoColorSpace,
    anisotropy,
    repeat: true,
  });
}

export interface PlanetBakeSize {
  width: number;
  anisotropy: number;
}

export function bakeEarthDay(renderer: WebGLRenderer, seed: number, size: PlanetBakeSize): WebGLRenderTarget {
  return bakeEquirect(renderer, {
    width: size.width,
    height: size.width / 2,
    fragmentShader: EARTH_DAY_FRAGMENT,
    uniforms: { uSeed: { value: seed } },
    colorSpace: SRGBColorSpace,
    anisotropy: size.anisotropy,
  });
}

export function bakeEarthNight(renderer: WebGLRenderer, seed: number, size: PlanetBakeSize): WebGLRenderTarget {
  return bakeEquirect(renderer, {
    width: size.width,
    height: size.width / 2,
    fragmentShader: EARTH_NIGHT_FRAGMENT,
    uniforms: { uSeed: { value: seed } },
    colorSpace: NoColorSpace,
    anisotropy: size.anisotropy,
  });
}
