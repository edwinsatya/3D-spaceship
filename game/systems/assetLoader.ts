import { TextureLoader, type ColorSpace, type Texture, type WebGLRenderer } from "three";
import { ASSET_PATHS } from "@/game/config/assets";

type KTX2LoaderInstance = InstanceType<(typeof import("three/examples/jsm/loaders/KTX2Loader.js"))["KTX2Loader"]>;

let ktx2Loader: Promise<KTX2LoaderInstance> | null = null;

function getKTX2Loader(renderer: WebGLRenderer): Promise<KTX2LoaderInstance> {
  // Loaded on demand so the transcoder never lands in the main bundle unless used.
  ktx2Loader ??= import("three/examples/jsm/loaders/KTX2Loader.js").then(({ KTX2Loader }) =>
    new KTX2Loader().setTranscoderPath(ASSET_PATHS.basisTranscoder).detectSupport(renderer),
  );
  return ktx2Loader;
}

/** Loads a texture file (.ktx2 via Basis transcoder, otherwise JPG/PNG/WebP). */
export async function loadTexture(renderer: WebGLRenderer, url: string, colorSpace: ColorSpace): Promise<Texture> {
  const texture = url.endsWith(".ktx2")
    ? await (await getKTX2Loader(renderer)).loadAsync(url)
    : await new TextureLoader().loadAsync(url);
  texture.colorSpace = colorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
