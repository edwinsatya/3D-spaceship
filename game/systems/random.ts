/** Deterministic PRNG (mulberry32) so courses are identical every run. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    sign: () => (next() < 0.5 ? -1 : 1),
    int: (min: number, maxInclusive: number) => Math.floor(min + (maxInclusive - min + 1) * next()),
  };
}

export type Random = ReturnType<typeof createRandom>;
