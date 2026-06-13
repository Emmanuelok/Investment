/**
 * Vectorized strategy backtester — runs a position signal over real candles and
 * reports honest performance metrics (Sharpe, Sortino, Calmar, max DD, win rate,
 * exposure, turnover-costed returns). Long/flat or long/short, with bps costs.
 */
import type { Candle } from "@/lib/rng";
import { sma, ema, rsi, macd, bollinger } from "./indicators";

export type StrategyId = "buyhold" | "smaCross" | "rsiReversion" | "macdTrend" | "bollingerBreakout" | "donchian";

export type BacktestParams = {
  fast?: number;
  slow?: number;
  rsiLow?: number;
  rsiHigh?: number;
  lookback?: number;
  costBps?: number; // round-trip cost in basis points applied on position change
  allowShort?: boolean;
};

export type BacktestResult = {
  strategy: StrategyId;
  equity: number[]; // strategy equity curve, starts at 1
  benchmark: number[]; // buy & hold equity
  position: number[]; // -1/0/1 per bar
  metrics: {
    totalReturn: number; // %
    benchReturn: number; // %
    cagr: number; // %
    sharpe: number;
    sortino: number;
    maxDrawdown: number; // %
    calmar: number;
    volAnnual: number; // %
    winRate: number; // %
    trades: number;
    exposure: number; // % of bars in market
    profitFactor: number;
  };
};

/** Position signal in {-1,0,1} per bar (NaN until warmup). */
export function signal(strategy: StrategyId, candles: Candle[], p: BacktestParams = {}): number[] {
  const c = candles.map((x) => x.c);
  const n = c.length;
  const out = new Array(n).fill(0);
  const short = p.allowShort ?? false;

  switch (strategy) {
    case "buyhold":
      return out.map(() => 1);
    case "smaCross": {
      const f = sma(c, p.fast ?? 20), s = sma(c, p.slow ?? 50);
      for (let i = 0; i < n; i++) out[i] = !Number.isFinite(s[i]) ? 0 : f[i] > s[i] ? 1 : short ? -1 : 0;
      return out;
    }
    case "macdTrend": {
      const m = macd(c, p.fast ?? 12, p.slow ?? 26, 9);
      for (let i = 0; i < n; i++) out[i] = !Number.isFinite(m.hist[i]) ? 0 : m.hist[i] > 0 ? 1 : short ? -1 : 0;
      return out;
    }
    case "rsiReversion": {
      const r = rsi(c, 14), lo = p.rsiLow ?? 30, hi = p.rsiHigh ?? 55;
      let pos = 0;
      for (let i = 0; i < n; i++) {
        if (Number.isFinite(r[i])) { if (pos === 0 && r[i] < lo) pos = 1; else if (pos === 1 && r[i] > hi) pos = 0; }
        out[i] = pos;
      }
      return out;
    }
    case "bollingerBreakout": {
      const b = bollinger(c, p.lookback ?? 20, 2);
      let pos = 0;
      for (let i = 0; i < n; i++) {
        if (Number.isFinite(b.upper[i])) { if (c[i] > b.upper[i]) pos = 1; else if (c[i] < b.mid[i]) pos = short ? -1 : 0; }
        out[i] = pos;
      }
      return out;
    }
    case "donchian": {
      const lb = p.lookback ?? 20;
      let pos = 0;
      for (let i = lb; i < n; i++) {
        const hh = Math.max(...c.slice(i - lb, i)), ll = Math.min(...c.slice(i - lb, i));
        if (c[i] >= hh) pos = 1; else if (c[i] <= ll) pos = short ? -1 : 0;
        out[i] = pos;
      }
      return out;
    }
  }
}

export function runBacktest(strategy: StrategyId, candles: Candle[], p: BacktestParams = {}): BacktestResult {
  const c = candles.map((x) => x.c);
  const n = c.length;
  const cost = (p.costBps ?? 5) / 1e4;
  const pos = signal(strategy, candles, p);

  // daily simple returns; strategy earns prior-bar position; costs on position change
  const equity = [1], benchmark = [1];
  let bars = 0, inMkt = 0;
  let trades = 0;
  const tradeRets: number[] = [];
  let entryEq = 1, prevPos = 0;
  const stratRets: number[] = [];

  for (let i = 1; i < n; i++) {
    const ret = c[i] / c[i - 1] - 1;
    const heldPos = pos[i - 1] || 0;
    let r = heldPos * ret;
    if (pos[i - 1] !== prevPos) { r -= cost * Math.abs((pos[i - 1] || 0) - prevPos); if ((pos[i - 1] || 0) !== 0 && prevPos === 0) entryEq = equity[equity.length - 1]; if ((pos[i - 1] || 0) === 0 && prevPos !== 0) { tradeRets.push(equity[equity.length - 1] / entryEq - 1); trades++; } prevPos = pos[i - 1] || 0; }
    stratRets.push(r);
    equity.push(equity[equity.length - 1] * (1 + r));
    benchmark.push(benchmark[benchmark.length - 1] * (1 + ret));
    bars++;
    if (heldPos !== 0) inMkt++;
  }
  if (prevPos !== 0) { tradeRets.push(equity[equity.length - 1] / entryEq - 1); trades++; }

  const totalReturn = (equity[equity.length - 1] - 1) * 100;
  const benchReturn = (benchmark[benchmark.length - 1] - 1) * 100;
  const years = Math.max(bars / 252, 1e-6);
  const cagr = (Math.pow(equity[equity.length - 1], 1 / years) - 1) * 100;
  const mean = stratRets.reduce((a, b) => a + b, 0) / (stratRets.length || 1);
  const variance = stratRets.reduce((a, b) => a + (b - mean) ** 2, 0) / (stratRets.length || 1);
  const volAnnual = Math.sqrt(variance * 252) * 100;
  const sharpe = variance > 0 ? (mean * 252) / (Math.sqrt(variance) * Math.sqrt(252)) : 0;
  const downside = stratRets.filter((r) => r < 0);
  const dStd = downside.length ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length) : 0;
  const sortino = dStd > 0 ? (mean * 252) / (dStd * Math.sqrt(252)) : 0;

  let peak = -Infinity, maxDrawdown = 0;
  for (const e of equity) { peak = Math.max(peak, e); maxDrawdown = Math.min(maxDrawdown, e / peak - 1); }
  maxDrawdown *= 100;
  const calmar = maxDrawdown < 0 ? cagr / Math.abs(maxDrawdown) : 0;

  const wins = tradeRets.filter((r) => r > 0);
  const winRate = tradeRets.length ? (wins.length / tradeRets.length) * 100 : 0;
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(tradeRets.filter((r) => r <= 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  return {
    strategy, equity, benchmark, position: pos,
    metrics: {
      totalReturn, benchReturn, cagr, sharpe, sortino, maxDrawdown, calmar, volAnnual, winRate,
      trades, exposure: bars ? (inMkt / bars) * 100 : 0, profitFactor: Number.isFinite(profitFactor) ? profitFactor : 99,
    },
  };
}

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  buyhold: "Buy & Hold",
  smaCross: "SMA Crossover",
  rsiReversion: "RSI Mean-Reversion",
  macdTrend: "MACD Trend",
  bollingerBreakout: "Bollinger Breakout",
  donchian: "Donchian Channel",
};
