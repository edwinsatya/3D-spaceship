import {
  attackDecay,
  createSawTable,
  fadeEdges,
  foldLoop,
  noiseSource,
  normalize,
  onePoleCoefficient,
  readTable,
  seconds,
  StateVariableFilter,
  TAU,
} from "./dsp";
import type { EngineVoice } from "@/game/data/ships";
import { createRandom } from "@/game/systems/random";

export type SoundId =
  | "boost"
  | "ring"
  | "pickup"
  | "collision"
  | "countdown"
  | "go"
  | "click"
  | "denied"
  | "fanfare"
  | "star"
  | "warp"
  | "discovery"
  | "rumble"
  | "music";

export interface SynthesizedSound {
  samples: Float32Array;
  sampleRate: number;
}

const SFX_RATE = 44100;
const MUSIC_RATE = 32000;

/** Seamless 2 s engine hum. All partials complete whole cycles in the loop. */
export function engineSound(voice: EngineVoice): SynthesizedSound {
  const sr = SFX_RATE;
  const duration = 2;
  const out = seconds(duration, sr);
  const noise = noiseSource(11);
  const raw = new Float32Array(out.length);
  for (let i = 0; i < raw.length; i++) raw[i] = noise();
  // Run the low-pass twice so the filter state wraps around: no click at the loop point.
  const a = onePoleCoefficient(voice.noiseCutoff, sr);
  let y = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < raw.length; i++) {
      y += a * (raw[i] - y);
      if (pass === 1) raw[i] = y;
    }
  }
  const [p1, p2, p3] = voice.partials;
  const f = voice.base;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const saw = 2 * ((f * t) % 1) - 1;
    const tone =
      p1 * Math.sin(TAU * f * t) + p2 * Math.sin(TAU * 2 * f * t + 0.3) + p3 * Math.sin(TAU * 3 * f * t + 1.1) + voice.saw * saw;
    const throb = 1 + voice.throbDepth * Math.sin(TAU * voice.throb * t);
    out[i] = Math.tanh((tone * throb + raw[i] * voice.noise) * voice.drive);
  }
  return { samples: normalize(out, 0.85), sampleRate: sr };
}

function boost(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(1.3, sr);
  const noise = noiseSource(23);
  const filter = new StateVariableFilter();
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const sweep = t < 0.45 ? 250 * Math.pow(12, t / 0.45) : 3000 * Math.pow(0.4, (t - 0.45) / 0.85);
    filter.process(noise(), sweep, 0.7, sr);
    const env = attackDecay(t, 0.05, 2.6);
    const thump = Math.sin(TAU * 80 * t * (1 - t * 0.4)) * attackDecay(t, 0.005, 12);
    out[i] = filter.band * env * 1.4 + thump * 0.6;
  }
  return { samples: fadeEdges(normalize(out, 0.8), sr), sampleRate: sr };
}

function bell(frequencies: { f: number; at: number }[], duration: number, decay: number): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(duration, sr);
  const partials = [
    { ratio: 1, amp: 1, decay: 1 },
    { ratio: 2.0, amp: 0.42, decay: 1.5 },
    { ratio: 3.01, amp: 0.2, decay: 2 },
    { ratio: 4.23, amp: 0.09, decay: 2.8 },
  ];
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    let value = 0;
    for (const note of frequencies) {
      const local = t - note.at;
      if (local < 0) continue;
      for (const p of partials) {
        value += p.amp * Math.sin(TAU * note.f * p.ratio * local) * attackDecay(local, 0.002, decay * p.decay);
      }
    }
    out[i] = value;
  }
  return { samples: fadeEdges(normalize(out, 0.75), sr), sampleRate: sr };
}

function pickup(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(0.6, sr);
  const notes = [1046.5, 1318.5, 1568, 2093];
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    let value = 0;
    notes.forEach((f, n) => {
      const local = t - n * 0.055;
      if (local < 0) return;
      const wave = Math.sin(TAU * f * local) + 0.25 * Math.sin(TAU * 3 * f * local);
      value += wave * attackDecay(local, 0.003, 9);
    });
    out[i] = value;
  }
  return { samples: fadeEdges(normalize(out, 0.7), sr), sampleRate: sr };
}

function collision(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(0.75, sr);
  const noise = noiseSource(37);
  const a = onePoleCoefficient(900, sr);
  let lp = 0;
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const freq = 35 + 75 * Math.exp(-t * 7);
    phase += freq / sr;
    lp += a * (noise() - lp);
    const body = Math.sin(TAU * phase) * attackDecay(t, 0.002, 5.5);
    const crunch = lp * attackDecay(t, 0.001, 13) * 2.4;
    out[i] = Math.tanh((body + crunch) * 2.2);
  }
  return { samples: fadeEdges(normalize(out, 0.85), sr), sampleRate: sr };
}

function beep(frequency: number, duration: number, decay: number, chord: number[] = []): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(duration, sr);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const vibrato = 1 + 0.004 * Math.sin(TAU * 6 * t);
    let value = Math.sin(TAU * frequency * vibrato * t) + 0.3 * Math.sin(TAU * frequency * 2 * t);
    for (const f of chord) value += 0.5 * Math.sin(TAU * f * vibrato * t);
    out[i] = value * attackDecay(t, 0.004, decay);
  }
  return { samples: fadeEdges(normalize(out, 0.6), sr), sampleRate: sr };
}

function click(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(0.08, sr);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const freq = 900 + 900 * Math.exp(-t * 60);
    out[i] = Math.sin(TAU * freq * t) * attackDecay(t, 0.001, 55);
  }
  return { samples: fadeEdges(normalize(out, 0.5), sr), sampleRate: sr };
}

function denied(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(0.32, sr);
  const a = onePoleCoefficient(700, sr);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const square = Math.sin(TAU * 140 * t) > 0 ? 1 : -1;
    lp += a * (square - lp);
    const gate = t < 0.12 || (t > 0.17 && t < 0.29) ? 1 : 0;
    out[i] = lp * gate;
  }
  return { samples: fadeEdges(normalize(out, 0.45), sr, 0.004, 0.03), sampleRate: sr };
}

function fanfare(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(2.2, sr);
  const notes = [523.25, 659.25, 783.99, 1046.5];
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    let value = 0;
    notes.forEach((f, n) => {
      const local = t - n * 0.11;
      if (local < 0) return;
      const tri = (2 / Math.PI) * Math.asin(Math.sin(TAU * f * local));
      value += (Math.sin(TAU * f * local) * 0.7 + tri * 0.3) * attackDecay(local, 0.004, n === 3 ? 1.6 : 3.2);
    });
    const chordAt = t - 0.45;
    if (chordAt > 0) {
      for (const f of [523.25, 659.25, 783.99]) value += 0.35 * Math.sin(TAU * f * chordAt) * attackDecay(chordAt, 0.08, 1.4);
    }
    out[i] = value;
  }
  return { samples: fadeEdges(normalize(out, 0.7), sr), sampleRate: sr };
}

/** Hyperspace jump: rising filtered noise, a pitch sweep and a shimmering tail. */
function warp(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(3.8, sr);
  const noise = noiseSource(61);
  const filter = new StateVariableFilter();
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const rise = Math.min(1, t / 2.2);
    filter.process(noise(), 180 * Math.pow(22, rise), 0.55, sr);
    const sweep = 70 + 520 * rise * rise;
    phase += sweep / sr;
    const envelope = Math.min(1, t / 0.4) * (t < 2.6 ? 1 : Math.exp(-(t - 2.6) * 3.2));
    const shimmer = t > 1.8 ? Math.sin(TAU * 2637 * t) * 0.12 * Math.sin(TAU * 9 * t) * Math.exp(-(t - 1.8) * 1.4) : 0;
    out[i] = (filter.band * 1.3 + Math.sin(TAU * phase) * 0.35) * envelope + shimmer;
  }
  return { samples: fadeEdges(normalize(out, 0.8), sr), sampleRate: sr };
}

/** "Planet discovered!": a bright major-9 bell arpeggio with sparkle. */
function discovery(): SynthesizedSound {
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66].map((f, i) => ({ f, at: i * 0.09 }));
  const bellSound = bell(notes, 2.4, 1.6);
  const noise = noiseSource(73);
  const samples = bellSound.samples;
  for (let i = 0; i < samples.length; i++) {
    const t = i / bellSound.sampleRate;
    samples[i] += noise() * 0.05 * Math.exp(-t * 2.5) * (0.5 + 0.5 * Math.sin(TAU * 13 * t));
  }
  return { samples: normalize(samples, 0.75), sampleRate: bellSound.sampleRate };
}

/** Atmospheric entry rumble: low noise with crackles. */
function rumble(): SynthesizedSound {
  const sr = SFX_RATE;
  const out = seconds(3.2, sr);
  const noise = noiseSource(83);
  const a = onePoleCoefficient(220, sr);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    lp += a * (noise() - lp);
    const crackle = noise() > 0.998 ? noise() * 0.8 : 0;
    const envelope = Math.min(1, t / 0.5) * (t < 2.5 ? 1 : Math.exp(-(t - 2.5) * 4));
    out[i] = Math.tanh((lp * 3 + crackle) * 1.5) * envelope;
  }
  return { samples: fadeEdges(normalize(out, 0.85), sr), sampleRate: sr };
}

/** Ambient space pad (32 s seamless loop): four lush chords + sparse echoing plucks. */
function music(): SynthesizedSound {
  const sr = MUSIC_RATE;
  const chordLength = 8;
  const chords = [
    [146.83, 185.0, 220.0, 277.18, 329.63],
    [123.47, 146.83, 185.0, 220.0, 329.63],
    [98.0, 146.83, 185.0, 246.94, 277.18],
    [110.0, 164.81, 185.0, 246.94, 293.66],
  ];
  const loopSeconds = chords.length * chordLength;
  const tail = 5;
  const out = seconds(loopSeconds + tail, sr);
  const table = createSawTable(2048, 7);
  const attack = 2.2;
  const release = 2.8;
  const phaseRandom = createRandom(7);

  // Pads
  chords.forEach((chord, index) => {
    const start = index * chordLength;
    const end = start + chordLength;
    const first = Math.floor(start * sr);
    const last = Math.min(out.length, Math.floor((end + release) * sr));
    const phases = chord.map(() => [phaseRandom.next(), phaseRandom.next()]);
    const lpCoefficient = onePoleCoefficient(1100, sr);
    let lp = 0;
    for (let i = first; i < last; i++) {
      const t = i / sr;
      const local = t - start;
      const env =
        local < attack ? local / attack : t < end ? 1 : Math.max(0, 1 - (t - end) / release);
      let value = 0;
      chord.forEach((f, n) => {
        const p = phases[n];
        p[0] += (f * 1.003) / sr;
        p[1] += (f * 0.997) / sr;
        value += readTable(table, p[0]) + readTable(table, p[1]);
      });
      const wobble = 0.85 + 0.15 * Math.sin(TAU * 0.11 * t);
      lp += lpCoefficient * wobble * (value - lp);
      out[i] += lp * env * 0.11;
    }
  });

  // Sub drone on chord roots
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const chord = chords[Math.floor(t / chordLength) % chords.length];
    out[i] += Math.sin(TAU * (chord[0] / 2) * t) * 0.06;
  }

  // Sparse plucks with a feedback echo
  const random = createRandom(99);
  const pluck = new Float32Array(out.length);
  for (let step = 0; step < loopSeconds * 2; step++) {
    if (random.next() < 0.45) continue;
    const at = step * 0.5;
    const chord = chords[Math.floor(at / chordLength) % chords.length];
    const f = chord[random.int(1, chord.length - 1)] * 4;
    const first = Math.floor(at * sr);
    const length = Math.floor(1.6 * sr);
    for (let i = 0; i < length && first + i < pluck.length; i++) {
      const t = i / sr;
      pluck[first + i] += Math.sin(TAU * f * t) * attackDecay(t, 0.003, 3.2) * 0.09;
    }
  }
  const delay = Math.floor(0.375 * sr);
  for (let i = delay; i < pluck.length; i++) pluck[i] += pluck[i - delay] * 0.38;
  for (let i = 0; i < out.length; i++) out[i] += pluck[i];

  const looped = foldLoop(out, Math.floor(loopSeconds * sr));
  return { samples: normalize(looped, 0.7), sampleRate: sr };
}

export const SOUND_BUILDERS: Record<SoundId, () => SynthesizedSound> = {
  boost,
  ring: () =>
    bell(
      [
        { f: 1318.5, at: 0 },
        { f: 1975.5, at: 0.085 },
      ],
      1.5,
      3.2,
    ),
  pickup,
  collision,
  countdown: () => beep(660, 0.25, 14),
  go: () => beep(1320, 0.7, 4.5, [1661.2, 1975.5]),
  click,
  denied,
  fanfare,
  star: () => bell([{ f: 1568, at: 0 }], 0.6, 6),
  warp,
  discovery,
  rumble,
  music,
};
