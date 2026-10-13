export const AUDIO = {
  masterVolume: 0.9,
  musicVolume: 0.32,
  sfxVolume: 0.75,
  engineVolume: { idle: 0.07, max: 0.26, boost: 0.36 },
  /** Engine playback rate (pitch) from 0 speed to boost speed. */
  enginePitch: { min: 0.62, max: 1.35, boost: 1.6 },
  /** Seconds between engine parameter updates (avoid per-frame audio calls). */
  engineUpdateInterval: 0.05,
  engineResponse: 6,
  /** Synthesis sample rate for procedural sounds. */
  sampleRate: 44100,
  musicFadeIn: 2.5,
  /** Hangar: rev of the picked ship's engine (seconds held, seconds to fade in/out). */
  enginePreview: { duration: 1.1, fade: 0.25 },
} as const;
