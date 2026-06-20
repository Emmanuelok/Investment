/**
 * Monte-Carlo simulation engine — geometric Brownian motion price paths with a
 * seeded RNG (deterministic & reproducible). Returns the terminal distribution,
 * percentiles, probability of hitting a target, and path-based VaR.
 */
import { Rng } from "@/lib/rng";

export type MCInput = {
  spot: number;
  driftPct: number; // annualized expected return %
  volPct: number; // annualized volatility %
  days: number; // horizon in trading days
  paths: number; // number of simulated paths
  seed?: string;
  target?: number; // optional price target for prob-of-hitting
};

export type MCResult = {
  spot: number;
  days: number;
  paths: number;
  terminalMean: number;
  terminalMedian: number;
  p5: number; p10: number; p25: number; p75: number; p90: number; p95: number;
  expectedReturnPct: number;
  var95Pct: number; // % move at the 5th percentile (negative)
  probAboveTarget: number | null; // 0..100
  probUp: number; // % of paths ending above spot
  target: number | null;
  samplePaths: number[][]; // ≤ 48 paths, downsampled steps for plotting
  histogram: { x: number; count: number }[]; // terminal-price distribution
};

const pct = (sorted: number[], p: number) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)))];

export function simulateGBM(input: MCInput): MCResult {
  const paths = Math.max(100, Math.min(20000, Math.round(input.paths)));
  const days = Math.max(1, Math.min(1260, Math.round(input.days)));
  const r = new Rng(input.seed ?? `mc-${input.spot}-${input.driftPct}-${input.volPct}-${days}-${paths}`);
  const dt = 1 / 252;
  const mu = input.driftPct / 100;
  const sigma = Math.max(input.volPct / 100, 1e-6);
  const drift = (mu - (sigma * sigma) / 2) * dt;
  const diffusion = sigma * Math.sqrt(dt);

  const keepPaths = Math.min(48, paths);
  const stepEvery = Math.max(1, Math.floor(days / 60)); // ≤ ~60 plotted points
  const samplePaths: number[][] = [];
  const terminal: number[] = new Array(paths);

  for (let p = 0; p < paths; p++) {
    let s = input.spot;
    const keep = p < keepPaths;
    const traj: number[] = keep ? [s] : [];
    for (let d = 1; d <= days; d++) {
      s *= Math.exp(drift + diffusion * r.gauss(0, 1));
      if (keep && (d % stepEvery === 0 || d === days)) traj.push(s);
    }
    if (keep) samplePaths.push(traj);
    terminal[p] = s;
  }

  const sorted = [...terminal].sort((a, b) => a - b);
  const terminalMean = terminal.reduce((a, b) => a + b, 0) / paths;
  const terminalMedian = pct(sorted, 50);
  const p5 = pct(sorted, 5);
  const expectedReturnPct = (terminalMean / input.spot - 1) * 100;
  const var95Pct = (p5 / input.spot - 1) * 100;
  const probUp = (terminal.filter((x) => x > input.spot).length / paths) * 100;
  const probAboveTarget = input.target != null && Number.isFinite(input.target) ? (terminal.filter((x) => x >= input.target!).length / paths) * 100 : null;

  // histogram (24 bins between p1 and p99 to avoid outlier squish)
  const lo = pct(sorted, 1), hi = pct(sorted, 99);
  const bins = 24, width = (hi - lo) / bins || 1;
  const histogram = Array.from({ length: bins }, (_, i) => ({ x: lo + (i + 0.5) * width, count: 0 }));
  for (const v of terminal) { const idx = Math.max(0, Math.min(bins - 1, Math.floor((v - lo) / width))); histogram[idx].count++; }

  return {
    spot: input.spot, days, paths, terminalMean, terminalMedian,
    p5, p10: pct(sorted, 10), p25: pct(sorted, 25), p75: pct(sorted, 75), p90: pct(sorted, 90), p95: pct(sorted, 95),
    expectedReturnPct, var95Pct, probAboveTarget, probUp, target: input.target ?? null, samplePaths, histogram,
  };
}
