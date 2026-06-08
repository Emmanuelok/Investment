/**
 * HELIOS — deterministic demo data for the charting + order-flow cockpit.
 * All data is seeded for reproducibility. DEMO snapshots only — live full-depth
 * feeds via exchange websockets when enabled.
 */
import { Rng, priceWalk, candleSeries } from "@/lib/rng";
import type { Candle } from "@/lib/rng";

/* ── Symbol catalogue ─────────────────────────────────────────────────────── */
export type HeliosSymbol = {
  sym: string;
  name: string;
  price: number;
  chg: number;
  vol: string;
  depthCap: "full-depth" | "top-of-book" | "delayed";
};

export const HELIOS_SYMBOLS: HeliosSymbol[] = [
  { sym: "BTC-USD",  name: "Bitcoin / USD",       price: 67241.0, chg:  1.84, vol: "28.3B", depthCap: "full-depth"   },
  { sym: "ETH-USD",  name: "Ethereum / USD",       price:  3528.4, chg:  0.92, vol:  "9.1B", depthCap: "full-depth"   },
  { sym: "ES1!",     name: "E-mini S&P 500 (CME)", price:  5412.5, chg:  0.33, vol: "41.2B", depthCap: "top-of-book"  },
  { sym: "NQ1!",     name: "E-mini Nasdaq (CME)",  price: 19134.0, chg:  0.56, vol: "17.8B", depthCap: "top-of-book"  },
  { sym: "NVDA",     name: "NVIDIA Corp",           price:   121.4, chg:  2.11, vol:  "4.4B", depthCap: "delayed"      },
  { sym: "AAPL",     name: "Apple Inc",             price:   214.3, chg: -0.27, vol:  "2.1B", depthCap: "delayed"      },
  { sym: "SPY",      name: "S&P 500 ETF",           price:   548.2, chg:  0.38, vol:  "7.9B", depthCap: "top-of-book"  },
];

/* ── Candle series for each timeframe ─────────────────────────────────────── */
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W";

export function getCandles(sym: string, tf: Timeframe, n = 120): Candle[] {
  const vol = tf === "1m" ? 0.004 : tf === "5m" ? 0.008 : tf === "15m" ? 0.012 : tf === "1h" ? 0.018 : tf === "4h" ? 0.024 : 0.03;
  const base = HELIOS_SYMBOLS.find((s) => s.sym === sym)?.price ?? 100;
  return candleSeries(`${sym}-${tf}`, n, base, vol, 0.0003);
}

/* ── Indicators ───────────────────────────────────────────────────────────── */
export function rsiSeries(candles: Candle[], period = 14): number[] {
  const closes = candles.map((c) => c.c);
  const rsi: number[] = new Array(period).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d >= 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

/* ── Order book heatmap rows ──────────────────────────────────────────────── */
export type HeatmapRow = {
  price: number;
  cells: number[]; // normalised 0..1 intensity per time bucket
};

export function orderBookHeatmap(sym: string, nPriceLevels = 20, nTimeBuckets = 40): HeatmapRow[] {
  const r = new Rng(`${sym}-heatmap`);
  const base = HELIOS_SYMBOLS.find((s) => s.sym === sym)?.price ?? 100;
  const tick = base > 10000 ? 10 : base > 1000 ? 0.25 : 0.01;
  const rows: HeatmapRow[] = [];
  for (let i = 0; i < nPriceLevels; i++) {
    const price = base + (nPriceLevels / 2 - i) * tick;
    const isMid = i === Math.floor(nPriceLevels / 2);
    const cells = Array.from({ length: nTimeBuckets }, (_, t) => {
      // Cluster large orders near round numbers and mid
      const proximity = isMid ? 0.6 : 1 / (1 + Math.abs(i - nPriceLevels / 2) * 0.3);
      const base = r.float(0, 0.3) + proximity * r.float(0.1, 0.55);
      // Sweeps: occasionally spike intensity
      const sweep = r.bool(0.04) ? r.float(0.75, 1.0) : 0;
      return Math.min(1, base + sweep);
    });
    rows.push({ price, cells });
  }
  return rows;
}

/* ── Footprint cluster data ───────────────────────────────────────────────── */
export type FootprintRow = {
  price: number;
  bid: number;
  ask: number;
  delta: number;
  imbalance: "bid" | "ask" | "neutral";
  poc: boolean;
};

export function footprintData(sym: string, candle: Candle): FootprintRow[] {
  const r = new Rng(`${sym}-fp-${candle.o.toFixed(2)}`);
  const tick = candle.c > 10000 ? 10 : candle.c > 1000 ? 0.25 : 0.01;
  const levels = 14;
  const low = candle.l;
  const rows: FootprintRow[] = [];
  let maxVol = 0;
  const raw = Array.from({ length: levels }, (_, i) => {
    const price = low + i * tick * ((candle.h - candle.l) / (levels * tick));
    const ask = Math.round(r.float(100, 8000));
    const bid = Math.round(r.float(100, 8000));
    maxVol = Math.max(maxVol, ask + bid);
    return { price, bid, ask };
  });
  const pocIdx = raw.reduce((mi, row, i) => (row.ask + row.bid > raw[mi].ask + raw[mi].bid ? i : mi), 0);
  raw.forEach((row, i) => {
    const delta = row.ask - row.bid;
    const ratio = row.ask / (row.bid || 1);
    const imbalance: "bid" | "ask" | "neutral" = ratio > 2.5 ? "ask" : ratio < 0.4 ? "bid" : "neutral";
    rows.push({ ...row, delta, imbalance, poc: i === pocIdx });
  });
  return rows.reverse();
}

/* ── CVD (cumulative volume delta) series ────────────────────────────────── */
export function cvdSeries(sym: string, n = 80): number[] {
  const r = new Rng(`${sym}-cvd`);
  const values: number[] = [0];
  for (let i = 1; i < n; i++) {
    const delta = r.gauss(50, 800);
    values.push(values[i - 1] + delta);
  }
  return values;
}

/* ── Volume profile (VAH / VAL / POC) ────────────────────────────────────── */
export type VolumeProfileBar = {
  price: number;
  vol: number;
  pct: number;
  poc: boolean;
  vah: boolean;
  val: boolean;
};

export function volumeProfile(sym: string, candles: Candle[]): VolumeProfileBar[] {
  const r = new Rng(`${sym}-vp`);
  const allPrices = candles.flatMap((c) => [c.h, c.l, c.o, c.c]);
  const hi = Math.max(...allPrices);
  const lo = Math.min(...allPrices);
  const levels = 24;
  const step = (hi - lo) / levels;
  const bars: { price: number; vol: number }[] = Array.from({ length: levels }, (_, i) => ({
    price: lo + (i + 0.5) * step,
    vol: Math.round(r.float(500, 8000) * (1 + r.gauss(0, 0.4))),
  }));
  // Bump middle levels (value area tends to be near mid)
  bars.forEach((b, i) => {
    const dist = Math.abs(i - levels / 2) / (levels / 2);
    b.vol = Math.max(100, Math.round(b.vol * (1 + (1 - dist) * 1.4)));
  });
  const maxVol = Math.max(...bars.map((b) => b.vol));
  const totalVol = bars.reduce((s, b) => s + b.vol, 0);
  const pocIdx = bars.reduce((mi, b, i) => (b.vol > bars[mi].vol ? i : mi), 0);
  // Value area = 70% of volume around POC
  let vaVol = bars[pocIdx].vol;
  let lo2 = pocIdx, hi2 = pocIdx;
  while (vaVol < totalVol * 0.7 && (lo2 > 0 || hi2 < levels - 1)) {
    const addLo = lo2 > 0 ? bars[lo2 - 1].vol : 0;
    const addHi = hi2 < levels - 1 ? bars[hi2 + 1].vol : 0;
    if (addLo >= addHi && lo2 > 0) { lo2--; vaVol += bars[lo2].vol; }
    else if (hi2 < levels - 1) { hi2++; vaVol += bars[hi2].vol; }
    else break;
  }
  return bars.map((b, i) => ({
    ...b,
    pct: (b.vol / maxVol) * 100,
    poc: i === pocIdx,
    vah: i === hi2,
    val: i === lo2,
  }));
}

/* ── DOM (depth of market) data ──────────────────────────────────────────── */
export type DomRow = {
  price: number;
  bidSize: number;
  askSize: number;
  isMid: boolean;
};

export function domRows(sym: string, levels = 20): DomRow[] {
  const r = new Rng(`${sym}-dom`);
  const base = HELIOS_SYMBOLS.find((s) => s.sym === sym)?.price ?? 100;
  const tick = base > 10000 ? 10 : base > 1000 ? 0.25 : 0.01;
  const rows: DomRow[] = [];
  for (let i = levels; i >= -levels; i--) {
    const price = base + i * tick;
    const isMid = i === 0;
    const side = i > 0 ? "ask" : "bid";
    const dist = Math.abs(i);
    const sizeBase = r.float(50, 1200) * Math.exp(-dist * 0.12);
    const bigBlock = r.bool(0.08) ? r.float(2000, 8000) : 0;
    const size = Math.round(sizeBase + bigBlock);
    rows.push({
      price,
      bidSize: side === "bid" || isMid ? size : 0,
      askSize: side === "ask" ? size : 0,
      isMid,
    });
  }
  return rows;
}

/* ── Time & Sales tape ────────────────────────────────────────────────────── */
export type TapeRow = {
  time: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  large: boolean;
};

export function tapeSeries(sym: string, n = 40): TapeRow[] {
  const r = new Rng(`${sym}-tape`);
  const base = HELIOS_SYMBOLS.find((s) => s.sym === sym)?.price ?? 100;
  const tick = base > 10000 ? 1 : base > 1000 ? 0.25 : 0.01;
  const rows: TapeRow[] = [];
  let price = base;
  for (let i = 0; i < n; i++) {
    price += r.gauss(0, tick * 2);
    const size = Math.round(r.float(1, 50) * (r.bool(0.06) ? 40 : 1));
    const side: "buy" | "sell" = r.bool(0.52) ? "buy" : "sell";
    const ss = String(n - i).padStart(2, "0");
    rows.push({
      time: `14:32:${ss}`,
      price: Math.round(price * 100) / 100,
      size,
      side,
      large: size > 300,
    });
  }
  return rows;
}

/* ── Scanner setups ───────────────────────────────────────────────────────── */
export type SetupRow = {
  sym: string;
  name: string;
  setup: string;
  score: number;
  trigger: string;
  price: number;
  chgPct: number;
  relVol: number;
  argus: boolean;
};

export const SCANNER_SETUPS: SetupRow[] = [
  { sym: "BTC-USD",  name: "Bitcoin",        setup: "ARGUS-Signal",  score: 94, trigger: "Sweep + absorption cluster at 66,800",   price: 67241.0, chgPct:  1.84, relVol: 3.2, argus: true  },
  { sym: "NVDA",     name: "NVIDIA Corp",     setup: "Momentum",      score: 88, trigger: "5-day run, volume expansion, NDX leader", price:   121.4, chgPct:  2.11, relVol: 2.8, argus: false },
  { sym: "ES1!",     name: "E-mini S&P",      setup: "Breakout",      score: 82, trigger: "5,420 resistance reclaim w/ gap fill",   price:  5412.5, chgPct:  0.33, relVol: 1.9, argus: true  },
  { sym: "ETH-USD",  name: "Ethereum",        setup: "Absorption",    score: 79, trigger: "Bid-side stacking at 3,480 defends",     price:  3528.4, chgPct:  0.92, relVol: 2.4, argus: false },
  { sym: "AAPL",     name: "Apple Inc",       setup: "Sweep",         score: 74, trigger: "Ask sweep 2.1M shares, large print",     price:   214.3, chgPct: -0.27, relVol: 1.6, argus: false },
  { sym: "PLTR",     name: "Palantir",        setup: "ARGUS-Signal",  score: 71, trigger: "Gov-contract NLP + insider buy",         price:    28.7, chgPct:  1.43, relVol: 2.1, argus: true  },
  { sym: "NQ1!",     name: "E-mini Nasdaq",   setup: "Momentum",      score: 68, trigger: "Gap above 200 SMA, volume surge",        price: 19134.0, chgPct:  0.56, relVol: 1.7, argus: false },
  { sym: "GLD",      name: "Gold Trust",      setup: "Breakout",      score: 65, trigger: "ATH retest on macro/CPI tailwind",       price:   214.9, chgPct:  0.71, relVol: 1.4, argus: false },
  { sym: "LMT",      name: "Lockheed Martin", setup: "ARGUS-Signal",  score: 63, trigger: "Congressional buy cluster + contract",   price:   463.1, chgPct:  0.48, relVol: 1.3, argus: true  },
  { sym: "XLE",      name: "Energy Sector",   setup: "Momentum",      score: 58, trigger: "OXY + COP leading sector rotation",      price:    91.2, chgPct:  0.92, relVol: 1.2, argus: false },
];

/* ── Replay sessions ─────────────────────────────────────────────────────── */
export type ReplaySession = {
  id: string;
  label: string;
  date: string;
  sym: string;
  event: string;
};

export const REPLAY_SESSIONS: ReplaySession[] = [
  { id: "btc-mar24",  label: "BTC — Mar 2024 ATH Breakout",      date: "2024-03-05", sym: "BTC-USD", event: "All-time high reclaim, $69K sweep" },
  { id: "nvda-q4",    label: "NVDA — Q4 2023 Earnings Gap-Up",   date: "2023-11-22", sym: "NVDA",    event: "+10% gap open, AI spending surge" },
  { id: "es-cpi",     label: "ES — CPI Day Volatility 2023",     date: "2023-09-13", sym: "ES1!",    event: "Higher-than-expected CPI reversal" },
  { id: "btc-ftx",    label: "BTC — FTX Collapse Cascade",       date: "2022-11-09", sym: "BTC-USD", event: "−25% gap, sweep cascade, recovery" },
  { id: "es-svb",     label: "ES — SVB Crisis Flash-Crash",      date: "2023-03-10", sym: "ES1!",    event: "Bank run news, 90-point intraday swing" },
];

/* ── Replay sim position ─────────────────────────────────────────────────── */
export type SimPosition = {
  sym: string;
  side: "LONG" | "FLAT";
  qty: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  target: number;
  stop: number;
};

export function simPosition(sym: string): SimPosition {
  const r = new Rng(`${sym}-sim`);
  const base = HELIOS_SYMBOLS.find((s) => s.sym === sym)?.price ?? 100;
  const avgPrice = base * (1 - r.float(0.003, 0.012));
  const currentPrice = base;
  const qty = sym.includes("USD") ? r.int(1, 3) : r.int(5, 20);
  const pnl = (currentPrice - avgPrice) * qty;
  const tick = base > 10000 ? 100 : base > 1000 ? 5 : 0.5;
  return {
    sym,
    side: "LONG",
    qty,
    avgPrice,
    currentPrice,
    pnl,
    target: currentPrice + tick * r.float(4, 8),
    stop: avgPrice - tick * r.float(2, 4),
  };
}

/* ── Charting chart-type and drawing tool definitions (static metadata) ───── */
export const CHART_TYPES = [
  { id: "candlestick", label: "Candlestick" },
  { id: "heikin-ashi", label: "Heikin-Ashi" },
  { id: "renko",       label: "Renko" },
  { id: "range",       label: "Range" },
  { id: "tick",        label: "Tick" },
  { id: "pf",          label: "P&F" },
] as const;

export const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];

export const INDICATORS = [
  { id: "sma",   label: "SMA(20)",     active: true  },
  { id: "ema",   label: "EMA(9)",      active: false },
  { id: "vwap",  label: "VWAP",        active: true  },
  { id: "bb",    label: "BBands",      active: false },
  { id: "rsi",   label: "RSI(14)",     active: true  },
  { id: "macd",  label: "MACD",        active: false },
  { id: "atr",   label: "ATR(14)",     active: false },
  { id: "obv",   label: "OBV",         active: false },
];

export const DRAWING_TOOLS = [
  { id: "trendline",   label: "Trendline",   icon: "activity" },
  { id: "fib",         label: "Fib Retrace", icon: "layers"   },
  { id: "gann",        label: "Gann Fan",    icon: "grid"     },
  { id: "elliott",     label: "Elliott Wave",icon: "wave"     },
  { id: "pitchfork",   label: "Pitchfork",   icon: "route"    },
  { id: "hline",       label: "H-Line",      icon: "gauge"    },
  { id: "rect",        label: "Rectangle",   icon: "bars"     },
] as const;
