/**
 * Deterministic PRNG + helpers.
 *
 * Every "live-looking" dataset in PANTHEON is generated from a fixed seed so
 * that server and client render byte-identical output (no hydration drift) and
 * the demo is reproducible to the bit — mirroring the platform's real
 * reproducibility mandate.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string -> seed hash (FNV-1a). */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  private next: () => number;
  constructor(seed: number | string) {
    this.next = mulberry32(typeof seed === "string" ? hashSeed(seed) : seed);
  }
  float(min = 0, max = 1): number {
    return min + (max - min) * this.next();
  }
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  bool(p = 0.5): boolean {
    return this.next() < p;
  }
  /** Standard normal via Box–Muller. */
  gauss(mean = 0, sd = 1): number {
    const u = Math.max(this.next(), 1e-9);
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

/**
 * Generate a geometric-Brownian-ish price walk — used for sparklines and
 * candles. Deterministic given the seed.
 */
export function priceWalk(
  seed: number | string,
  n: number,
  start = 100,
  vol = 0.018,
  drift = 0.0006,
): number[] {
  const r = new Rng(seed);
  const out: number[] = [start];
  for (let i = 1; i < n; i++) {
    const prev = out[i - 1];
    const shock = r.gauss(drift, vol);
    out.push(Math.max(0.01, prev * (1 + shock)));
  }
  return out;
}

export type Candle = { o: number; h: number; l: number; c: number; v: number };

export function candleSeries(
  seed: number | string,
  n: number,
  start = 100,
  vol = 0.02,
  drift = 0.0004,
): Candle[] {
  const r = new Rng(seed);
  const out: Candle[] = [];
  let c = start;
  for (let i = 0; i < n; i++) {
    const o = c;
    const move = r.gauss(drift, vol);
    c = Math.max(0.5, o * (1 + move));
    const wick = Math.abs(r.gauss(0, vol * 0.9));
    const h = Math.max(o, c) * (1 + wick);
    const l = Math.min(o, c) * (1 - wick);
    const v = Math.round(r.float(0.4, 1) * 1_000_000 * (1 + Math.abs(move) * 30));
    out.push({ o, h, l, c, v });
  }
  return out;
}
