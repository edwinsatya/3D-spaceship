/** Chunks that let custom ShaderMaterials follow the renderer's tone mapping & output colour space. */
export const OUTPUT_CHUNKS = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** Camera-facing quad: `position.xy` in [-1, 1] is the corner, `uSize` the half-size in world units. */
export const BILLBOARD_VERTEX = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = position.xy;
  vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mvPosition.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/** Full-screen triangle/quad in clip space (screen overlays). */
export const FULLSCREEN_OVERLAY_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
