import {
  BackSide,
  BufferGeometry,
  ClampToEdgeWrapping,
  CubeCamera,
  Float32BufferAttribute,
  GLSL3,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  RawShaderMaterial,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  UnsignedByteType,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
  type ColorSpace,
  type IUniform,
  type WebGLRenderer,
} from "three";

const FULLSCREEN_VERTEX = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

function fullscreenTriangle(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  return geometry;
}

export interface EquirectBakeOptions {
  width: number;
  height: number;
  /** GLSL3 fragment shader: `in vec2 vUv; out vec4 fragColor;`. Writes linear values. */
  fragmentShader: string;
  uniforms?: Record<string, IUniform>;
  /** SRGBColorSpace for albedo (hardware-encoded storage), NoColorSpace for data. */
  colorSpace: ColorSpace;
  mipmaps?: boolean;
  anisotropy?: number;
  /** Tile vertically too (detail textures); equirect maps clamp at the poles. */
  repeat?: boolean;
}

/**
 * Renders a procedural equirectangular texture once on the GPU.
 * The result is sampled like any texture file, so swapping in real
 * textures later does not change the materials.
 */
export function bakeEquirect(renderer: WebGLRenderer, options: EquirectBakeOptions): WebGLRenderTarget {
  const mipmaps = options.mipmaps ?? true;
  const target = new WebGLRenderTarget(options.width, options.height, {
    type: UnsignedByteType,
    colorSpace: options.colorSpace,
    generateMipmaps: mipmaps,
    minFilter: mipmaps ? LinearMipmapLinearFilter : LinearFilter,
    magFilter: LinearFilter,
    wrapS: RepeatWrapping,
    wrapT: options.repeat ? RepeatWrapping : ClampToEdgeWrapping,
    depthBuffer: false,
    anisotropy: options.anisotropy ?? 1,
  });

  const geometry = fullscreenTriangle();
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: options.fragmentShader,
    uniforms: options.uniforms ?? {},
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new Scene();
  scene.add(mesh);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const previousTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(previousTarget);

  geometry.dispose();
  material.dispose();
  return target;
}

export interface CubeBakeOptions {
  size: number;
  /** GLSL1-style fragment shader for ShaderMaterial with `varying vec3 vDir`. Writes linear values. */
  fragmentShader: string;
  uniforms?: Record<string, IUniform>;
  colorSpace: ColorSpace;
}

/** Renders a procedural environment (sky) into a cube map once. */
export function bakeCube(renderer: WebGLRenderer, options: CubeBakeOptions): WebGLCubeRenderTarget {
  const target = new WebGLCubeRenderTarget(options.size, {
    type: UnsignedByteType,
    colorSpace: options.colorSpace,
    generateMipmaps: false,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
  });
  const camera = new CubeCamera(0.1, 10, target);
  const geometry = new SphereGeometry(5, 48, 24);
  const material = new ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: options.fragmentShader,
    uniforms: options.uniforms ?? {},
    side: BackSide,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  camera.update(renderer, scene);
  geometry.dispose();
  material.dispose();
  return target;
}
