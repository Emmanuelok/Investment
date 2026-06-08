/**
 * A real, in-browser event-driven backtester with realistic frictions and
 * first-class overfitting controls — the KEPLER mandate, made functional.
 *
 *  - Strategies are pure functions: candles + params -> target position per bar.
 *  - No look-ahead: the position decided at bar i earns the return from i -> i+1.
 *  - Realistic fills: per-turnover cost (slippage + commission) in bps.
 *  - Overfitting: Deflated Sharpe Ratio + Probability of Backtest Overfitting
 *    (PBO via Combinatorially Symmetric Cross-Validation).
 */
import type { Candle } from "@/lib/rng";
import { mean, std, skewness, kurtosis, normCdf, normInv } from "@/lib/quant/stats";
import { sma, ema, rsi } from "@/lib/quant/indicators";

export type ParamSpec = { key: string; label: string; min: number; max: number; step: number; default: number };
export type StrategyId = "sma_cross" | "momentum" | "rsi_meanrev" | "breakout";

export type StrategyDef = {
  id: StrategyId;
  name: string;
  blurb: string;
  params: ParamSpec[];
  /** target position in [-1, 1] for each bar, using only info up to that bar. */
  positions: (candles: Candle[], p: Record<string, number>) => number[];
};

const px = (c: Candle[]) => c.map((x) => x.c);

export const STRATEGIES: Record<StrategyId, StrategyDef> = {
  sma_cross: {
    id: "sma_cross",
    name: "SMA Crossover",
    blurb: "Long when fast SMA is above slow SMA; flat otherwise. The classic trend follower.",
    params: [
      { key: "fast", label: "Fast SMA", min: 3, max: 50, step: 1, default: 10 },
      { key: "slow", label: "Slow SMA", min: 20, max: 200, step: 5, default: 50 },
    ],
    positions: (c, p) => {
      const f = sma(px(c), Math.round(p.fast));
      const s = sma(px(c), Math.round(p.slow));
      return c.map((_, i) => (f[i] != null && s[i] != null && (f[i] as number) > (s[i] as number) ? 1 : 0));
    },
  },
  momentum: {
    id: "momentum",
    name: "Time-Series Momentum",
    blurb: "Long if trailing N-bar return is positive, short if negative. Trend persistence.",
    params: [
      { key: "lookback", label: "Lookback", min: 5, max: 120, step: 1, default: 40 },
      { key: "allowShort", label: "Allow short (0/1)", min: 0, max: 1, step: 1, default: 1 },
    ],
    positions: (c, p) => {
      const n = Math.round(p.lookback);
      const cl = px(c);
      return c.map((_, i) => {
        if (i < n) return 0;
        const r = cl[i] / cl[i - n] - 1;
        if (r > 0) return 1;
        return p.allowShort >= 0.5 ? -1 : 0;
      });
    },
  },
  rsi_meanrev: {
    id: "rsi_meanrev",
    name: "RSI Mean-Reversion",
    blurb: "Buy oversold, sell overbought — a contrarian short-horizon strategy.",
    params: [
      { key: "period", label: "RSI period", min: 5, max: 30, step: 1, default: 14 },
      { key: "lo", label: "Oversold", min: 10, max: 45, step: 1, default: 30 },
      { key: "hi", label: "Overbought", min: 55, max: 90, step: 1, default: 70 },
    ],
    positions: (c, p) => {
      const r = rsi(px(c), Math.round(p.period));
      let pos = 0;
      return c.map((_, i) => {
        const v = r[i];
        if (v == null) return 0;
        if (v < p.lo) pos = 1;
        else if (v > p.hi) pos = 0;
        return pos;
      });
    },
  },
  breakout: {
    id: "breakout",
    name: "Donchian Breakout",
    blurb: "Long on a new N-bar high, exit on a new N-bar low. Captures sustained moves.",
    params: [
      { key: "entry", label: "Entry window", min: 5, max: 100, step: 1, default: 20 },
      { key: "exit", label: "Exit window", min: 3, max: 60, step: 1, default: 10 },
    ],
    positions: (c, p) => {
      const e = Math.round(p.entry), x = Math.round(p.exit);
      let pos = 0;
      return c.map((cur, i) => {
        if (i < e) return 0;
        const hi = Math.max(...c.slice(i - e, i).map((k) => k.h));
        const lo = Math.min(...c.slice(i - Math.min(x, i), i).map((k) => k.l));
        if (cur.c >= hi) pos = 1;
        else if (cur.c <= lo) pos = 0;
        return pos;
      });
    },
  },
};

export type BacktestResult = {
  equity: number[]; // starts at 1.0
  rets: number[]; // per-bar strategy returns (net of cost)
  benchmark: number[]; // buy & hold equity
  metrics: {
    totalReturn: number;
    cagr: number;
    sharpe: number;
    sortino: number;
    maxDD: number;
    vol: number;
    winRate: number;
    profitFactor: number;
    turnover: number;
    trades: number;
    exposure: number;
    calmar: number;
  };
};

const ANN = 252;

export function runBacktest(candles: Candle[], strat: StrategyDef, params: Record<string, number>, costBps = 5): BacktestResult {
  const pos = strat.positions(candles, params);
  const equity: number[] = [1];
  const benchmark: number[] = [1];
  const rets: number[] = [];
  let trades = 0, grossWin = 0, grossLoss = 0, wins = 0, exposedBars = 0, turnoverSum = 0;
  const cost = costBps / 10000;

  for (let i = 1; i < candles.length; i++) {
    const mktRet = candles[i].c / candles[i - 1].c - 1;
    const p = pos[i - 1]; // position decided at i-1, earns i-1 -> i
    const dTurn = Math.abs(p - (pos[i - 2] ?? 0));
    if (dTurn > 0) trades += dTurn > 0.5 ? 1 : 0;
    turnoverSum += dTurn;
    const r = p * mktRet - dTurn * cost;
    rets.push(r);
    if (p !== 0) exposedBars++;
    if (r > 0) { wins++; grossWin += r; } else grossLoss += -r;
    equity.push(equity[equity.length - 1] * (1 + r));
    benchmark.push(benchmark[benchmark.length - 1] * (1 + mktRet));
  }

  const m = mean(rets);
  const sd = std(rets) || 1e-12;
  const downside = std(rets.filter((x) => x < 0)) || 1e-12;
  let peak = -Infinity, maxDD = 0;
  for (const e of equity) { peak = Math.max(peak, e); maxDD = Math.min(maxDD, e / peak - 1); }
  const years = candles.length / ANN;
  const totalReturn = equity[equity.length - 1] - 1;
  const cagr = years > 0 ? Math.pow(equity[equity.length - 1], 1 / years) - 1 : 0;
  const sharpe = (m / sd) * Math.sqrt(ANN);
  const sortino = (m / downside) * Math.sqrt(ANN);

  return {
    equity, rets, benchmark,
    metrics: {
      totalReturn,
      cagr,
      sharpe,
      sortino,
      maxDD,
      vol: sd * Math.sqrt(ANN),
      winRate: rets.length ? wins / rets.length : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
      turnover: turnoverSum,
      trades,
      exposure: rets.length ? exposedBars / rets.length : 0,
      calmar: maxDD < 0 ? cagr / Math.abs(maxDD) : 0,
    },
  };
}

/* ── Overfitting diagnostics ─────────────────────────────────────────────── */

/**
 * Deflated Sharpe Ratio (Bailey & López de Prado). Adjusts an observed Sharpe
 * for the number of trials, non-normal returns, and sample length. Returns a
 * probability in [0,1] that the true Sharpe exceeds 0 after deflation.
 */
export function deflatedSharpe(rets: number[], observedSharpePerBar: number, nTrials: number, varianceOfTrialSharpes: number): number {
  const T = rets.length;
  if (T < 8) return 0;
  const g3 = skewness(rets);
  const g4 = kurtosis(rets); // non-excess
  const emc = 0.5772156649; // Euler–Mascheroni
  const N = Math.max(nTrials, 1);
  // expected max Sharpe across N independent trials (per-bar units)
  const sr0 =
    Math.sqrt(varianceOfTrialSharpes || 1e-9) *
    ((1 - emc) * normInv(1 - 1 / N) + emc * normInv(1 - 1 / (N * Math.E)));
  const denom = Math.sqrt(1 - g3 * observedSharpePerBar + ((g4 - 1) / 4) * observedSharpePerBar ** 2) || 1e-9;
  const z = ((observedSharpePerBar - sr0) * Math.sqrt(T - 1)) / denom;
  return normCdf(z);
}

/**
 * Probability of Backtest Overfitting via CSCV. Splits the return matrix
 * (configs × time) into S blocks, forms all C(S, S/2) in-sample combinations,
 * picks the best IS config, and measures how often it lands below the OOS
 * median — i.e. how often the "best" backtest is overfit.
 */
export function pbo(retsMatrix: number[][], S = 10): number {
  const nConfigs = retsMatrix.length;
  if (nConfigs < 2) return 0;
  const T = Math.min(...retsMatrix.map((r) => r.length));
  const blockLen = Math.floor(T / S);
  if (blockLen < 2) return 0;
  const blocks: number[][][] = []; // [block][config][ret]
  for (let b = 0; b < S; b++) {
    const slice: number[][] = retsMatrix.map((r) => r.slice(b * blockLen, (b + 1) * blockLen));
    blocks.push(slice);
  }
  const combos = chooseHalf(S);
  const sr = (xs: number[]) => {
    const sd = std(xs);
    return sd > 0 ? mean(xs) / sd : 0;
  };
  let overfit = 0, total = 0;
  for (const isIdx of combos) {
    const isSet = new Set(isIdx);
    const osIdx = Array.from({ length: S }, (_, i) => i).filter((i) => !isSet.has(i));
    const isSharpe = retsMatrix.map((_, ci) => sr(isIdx.flatMap((b) => blocks[b][ci])));
    const osSharpe = retsMatrix.map((_, ci) => sr(osIdx.flatMap((b) => blocks[b][ci])));
    let best = 0;
    for (let ci = 1; ci < nConfigs; ci++) if (isSharpe[ci] > isSharpe[best]) best = ci;
    const sortedOs = [...osSharpe].sort((a, b) => a - b);
    const rank = sortedOs.indexOf(osSharpe[best]);
    const relRank = rank / (nConfigs - 1); // 0..1
    const logit = Math.log((relRank + 1e-6) / (1 - relRank + 1e-6));
    if (logit <= 0) overfit++;
    total++;
  }
  return total ? overfit / total : 0;
}

function chooseHalf(S: number): number[][] {
  const k = Math.floor(S / 2);
  const res: number[][] = [];
  const combo: number[] = [];
  const rec = (start: number) => {
    if (combo.length === k) { res.push([...combo]); return; }
    for (let i = start; i < S; i++) { combo.push(i); rec(i + 1); combo.pop(); }
  };
  rec(0);
  return res;
}

/** Run a parameter sweep over the first param of a strategy -> per-config return series. */
export function sweep(candles: Candle[], strat: StrategyDef, base: Record<string, number>, costBps = 5): { rets: number[][]; sharpes: number[]; grid: number[] } {
  const spec = strat.params[0];
  const grid: number[] = [];
  for (let v = spec.min; v <= spec.max; v += spec.step) grid.push(v);
  const trimmed = grid.filter((_, i) => i % Math.max(1, Math.floor(grid.length / 24)) === 0).slice(0, 24);
  const rets: number[][] = [];
  const sharpes: number[] = [];
  for (const v of trimmed) {
    const res = runBacktest(candles, strat, { ...base, [spec.key]: v }, costBps);
    rets.push(res.rets);
    sharpes.push(res.metrics.sharpe);
  }
  return { rets, sharpes, grid: trimmed };
}
