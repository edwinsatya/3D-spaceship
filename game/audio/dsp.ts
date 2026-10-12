/** Tiny offline DSP toolkit used to synthesize placeholder sounds at load time. */
import { createRandom } from "@/game/systems/random";

export const TAU = Math.PI * 2;

export function seconds(duration: number, sampleRate: number): Float32Array {
  return new Float32Array(Math.ceil(duration * sampleRate));
}

export function noiseSource(seed: number) {
  const random = createRandom(seed);
  return () => random.next() * 2 - 1;
}

/** One-pole low-pass coefficient for a cutoff frequency. */
export function onePoleCoefficient(cutoff: number, sampleRate: number): number {
  return 1 - Math.exp((-TAU * cutoff) / sampleRate);
}

/** Chamberlin state-variable filter (stable for cutoff < sampleRate / 6). */
export class StateVariableFilter {
  low = 0;
  band = 0;
  high = 0;

  process(input: number, cutoff: number, damping: number, sampleRate: number): void {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, sampleRate / 6)) / sampleRate);
    this.low += f * this.band;
    this.high = input - this.low - damping * this.band;
    this.band += f * this.high;
  }
}

/** Single-cycle band-limited sawtooth table for cheap pad oscillators. */
export function createSawTable(size: number, harmonics: number): Float32Array {
  const table = new Float32Array(size + 1);
  for (let i = 0; i <= size; i++) {
    let value = 0;
    for (let h = 1; h <= harmonics; h++) value += Math.sin((TAU * h * i) / size) / h;
    table[i] = value * 0.55;
  }
  return table;
}

export function readTable(table: Float32Array, phase: number): number {
  const size = table.length - 1;
  const position = (phase - Math.floor(phase)) * size;
  const index = Math.floor(position);
  const fraction = position - index;
  return table[index] + (table[index + 1] - table[index]) * fraction;
}

export function attackDecay(t: number, attack: number, decayRate: number): number {
  if (t < 0) return 0;
  const rise = attack > 0 ? Math.min(1, t / attack) : 1;
  return rise * Math.exp(-decayRate * t);
}

export function normalize(samples: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  if (max > 0) {
    const gain = peak / max;
    for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  }
  return samples;
}

/** Short fades at both ends to avoid clicks. */
export function fadeEdges(samples: Float32Array, sampleRate: number, fadeIn = 0.003, fadeOut = 0.02): Float32Array {
  const inSamples = Math.min(samples.length, Math.floor(fadeIn * sampleRate));
  const outSamples = Math.min(samples.length, Math.floor(fadeOut * sampleRate));
  for (let i = 0; i < inSamples; i++) samples[i] *= i / inSamples;
  for (let i = 0; i < outSamples; i++) samples[samples.length - 1 - i] *= i / outSamples;
  return samples;
}

/** Folds the tail after `loopLength` back onto the start so the loop is seamless. */
export function foldLoop(samples: Float32Array, loopLength: number): Float32Array {
  const loop = samples.slice(0, loopLength);
  for (let i = loopLength; i < samples.length; i++) loop[(i - loopLength) % loopLength] += samples[i];
  return loop;
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return buffer;
}
