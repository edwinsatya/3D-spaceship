import { SRGBColorSpace, type WebGLCubeRenderTarget, type WebGLRenderer } from "three";
import { HASH, SIMPLEX_3D, SRGB_TO_LINEAR } from "@/game/scenes/shaders/noise";
import { bakeCube } from "./bake";

/** Directions shared with the 3D gas billboards so both layers line up. */
export const NEBULA_DIRECTIONS = [
  { direction: [0.72, 0.28, -0.62], color: "#7b3fe4", strength: 0.42 },
  { direction: [-0.35, -0.42, -0.84], color: "#1e9fb5", strength: 0.38 },
  { direction: [-0.82, 0.48, 0.32], color: "#d9467a", strength: 0.26 },
] as const;

const MILKY_WAY_NORMAL = [0.3, 0.85, -0.42] as const;
const GALACTIC_CENTER = [-0.62, 0.2, -0.76] as const;
const GALAXY_DIRECTION = [-0.28, -0.48, 0.83] as const;

function vec3(values: readonly number[]): string {
  return `vec3(${values.map((v) => v.toFixed(4)).join(", ")})`;
}

function hexToVec3(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return vec3([(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255));
}

const SKY_FRAGMENT = /* glsl */ `
varying vec3 vDir;
${SIMPLEX_3D}
${HASH}
${SRGB_TO_LINEAR}

vec3 stars(vec3 d, float scale, float threshold, float brightness) {
  vec3 p = d * scale;
  vec3 cell = floor(p);
  vec4 h = vec4(hash33(cell), hash13(cell + 17.17));
  if (h.w < threshold) return vec3(0.0);
  vec3 starPos = cell + 0.25 + h.xyz * 0.5;
  float dist = length(p - starPos);
  float intensity = exp(-dist * dist / 0.012) * brightness * (0.35 + 0.65 * fract(h.w * 13.7));
  vec3 tint = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.82, 0.62), fract(h.w * 47.3));
  return tint * intensity;
}

vec3 nebula(vec3 d, vec3 center, vec3 color, float strength) {
  float facing = dot(d, normalize(center));
  float falloff = smoothstep(0.55, 1.0, facing);
  if (falloff <= 0.0) return vec3(0.0);
  vec3 q = d * 2.6 + center * 3.0;
  vec3 warp = vec3(fbm3(q, 3), fbm3(q + 5.2, 3), fbm3(q - 3.7, 3));
  float density = fbm3(q * 1.4 + warp * 1.3, 5) * 0.5 + 0.5;
  density = pow(smoothstep(0.4, 1.0, density), 1.8);
  float filaments = pow(1.0 - abs(simplex3(q * 2.2 + warp * 1.5)), 8.0) * 0.35;
  return srgbToLinear(color) * (density + filaments * density) * falloff * strength;
}

vec3 galaxy(vec3 d, vec3 center) {
  vec3 c = normalize(center);
  if (dot(d, c) < 0.97) return vec3(0.0);
  vec3 t1 = normalize(cross(c, vec3(0.0, 1.0, 0.0)));
  vec3 t2 = cross(c, t1);
  vec2 uv = vec2(dot(d, t1), dot(d, t2)) / 0.055;
  float a = 0.6;
  uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  uv.y *= 2.4;
  float r = length(uv);
  float angle = atan(uv.y, uv.x);
  float arms = 0.5 + 0.5 * cos(2.0 * angle - log(r + 0.02) * 5.5);
  float disk = exp(-r * 3.2);
  float core = exp(-r * 16.0);
  return srgbToLinear(vec3(0.72, 0.7, 1.0)) * disk * (0.25 + 0.75 * pow(arms, 3.0)) * 0.55
    + vec3(1.0, 0.88, 0.72) * core * 0.9;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 color = srgbToLinear(vec3(0.012, 0.014, 0.035));

  vec3 mwNormal = normalize(${vec3(MILKY_WAY_NORMAL)});
  float b = dot(d, mwNormal);
  float band = exp(-b * b / 0.02);
  float core = pow(max(dot(d, normalize(${vec3(GALACTIC_CENTER)})), 0.0), 5.0);
  float body = fbm3(d * 3.2 + 2.0, 5) * 0.5 + 0.5;
  float dust = smoothstep(0.48, 0.72, fbm3(d * 7.0 + 8.0, 4) * 0.5 + 0.5);
  vec3 mwColor = mix(vec3(0.5, 0.56, 0.85), vec3(1.0, 0.82, 0.6), core);
  color += srgbToLinear(mwColor) * band * body * (1.0 - dust * 0.75) * (0.08 + core * 0.22);
  color += stars(d, 420.0, 0.55, 0.9) * (0.4 + band * 1.2);

  ${NEBULA_DIRECTIONS.map(
    (n) => `color += nebula(d, ${vec3(n.direction)}, ${hexToVec3(n.color)}, ${n.strength.toFixed(3)});`,
  ).join("\n  ")}
  color += galaxy(d, ${vec3(GALAXY_DIRECTION)});

  color += stars(d, 160.0, 0.72, 1.0);
  color += stars(d, 70.0, 0.86, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`;

export function bakeSky(renderer: WebGLRenderer, size: number): WebGLCubeRenderTarget {
  return bakeCube(renderer, { size, fragmentShader: SKY_FRAGMENT, colorSpace: SRGBColorSpace });
}
