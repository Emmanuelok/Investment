/**
 * Correlation & cross-asset risk engine — Pearson correlation matrix over
 * aligned log returns, plus beta and a portfolio diversification ratio.
 */

export const logReturns = (closes: number[]): number[] => closes.slice(1).map((c, i) => Math.log(c / closes[i]));

export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const x = a.slice(-n), y = b.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  const d = Math.sqrt(sxx * syy);
  return d === 0 ? 0 : sxy / d;
}

export type CorrMatrix = { symbols: string[]; matrix: number[][] };

/** Correlation matrix over the last `window` aligned returns. */
export function correlationMatrix(series: Record<string, number[]>, window = 90): CorrMatrix {
  const symbols = Object.keys(series);
  const rets = symbols.map((s) => logReturns(series[s]).slice(-window));
  const matrix = symbols.map((_, i) => symbols.map((_, j) => (i === j ? 1 : Math.round(pearson(rets[i], rets[j]) * 1000) / 1000)));
  return { symbols, matrix };
}

/** Beta of `asset` vs `benchmark` from aligned returns. */
export function beta(assetCloses: number[], benchCloses: number[], window = 90): number {
  const a = logReturns(assetCloses).slice(-window);
  const b = logReturns(benchCloses).slice(-window);
  const n = Math.min(a.length, b.length);
  if (n < 2) return 1;
  const x = b.slice(-n), y = a.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let cov = 0, varb = 0;
  for (let i = 0; i < n; i++) { cov += (x[i] - mx) * (y[i] - my); varb += (x[i] - mx) ** 2; }
  return varb === 0 ? 1 : cov / varb;
}

/** Average pairwise correlation — a quick read on how clustered a basket is. */
export function avgPairwiseCorr(cm: CorrMatrix): number {
  const n = cm.symbols.length;
  if (n < 2) return 0;
  let sum = 0, cnt = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { sum += cm.matrix[i][j]; cnt++; }
  return cnt ? sum / cnt : 0;
}

/** Historical VaR & expected shortfall (1-day) from a return series, at conf (e.g. 0.95). */
export function historicalVar(returns: number[], conf = 0.95): { var: number; es: number } {
  if (returns.length < 5) return { var: 0, es: 0 };
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor((1 - conf) * sorted.length) - 1);
  const v = sorted[idx];
  const tail = sorted.slice(0, idx + 1);
  const es = tail.reduce((s, x) => s + x, 0) / tail.length;
  return { var: v * 100, es: es * 100 };
}
