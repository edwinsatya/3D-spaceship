"use client";

import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useQualitySettings } from "./useQualitySettings";

/** Bloom on engines, stars and rings + filmic tone mapping. Disabled on the low tier. */
export function Effects() {
  const { bloom, multisampling } = useQualitySettings();
  if (!bloom) return null;
  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={1.05} radius={0.72} />
      <Vignette offset={0.32} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
