/**
 * Crypto-regime engine. Reads the digital-asset backdrop the same way a macro
 * desk reads equities: BTC's trend versus its 50/200-day averages sets the
 * primary Bull/Neutral/Bear regime; the ETH/BTC ratio is crypto's internal
 * risk-appetite gauge (alts leading = risk-on); and the share of coins above
 * their 200-day average is crypto breadth. Per coin it also reports RSI,
 * trailing returns and drawdown from the cycle high. Pure & deterministic;
 * reuses the project SMA / RSI indicators.
 */

import { sma, rsi } from "./indicators";

export type CoinSeries = { id: string; label: string; closes: number[] };

export type CoinRead = {
  id: string;
  label: string;
  price: number;
  aboveSMA50: boolean;
  aboveSMA200: boolean;
  pctFrom200dma: number; // % above/below the 200-day average
  rsi: number;
  ret30d: number;
  ret90d: number;
  drawdownFromHigh: number; // ≤0, % below the trailing high
  trend: "Up" | "Neutral" | "Down";
};

export type CryptoRegime = "Bull" | "Neutral" | "Bear";
export type CryptoRisk = "Risk-on" | "Neutral" | "Risk-off";

export type CryptoRegimeReport = {
  coins: CoinRead[];
  btcRegime: CryptoRegime;
  breadthPct: number; // % of coins above their 200-DMA
  ethBtcRatio: number | null;
  ethBtcChange30d: number; // %
  riskAppetite: CryptoRisk;
};

const lastNum = (a: number[]): number => {
  for (let i = a.length - 1; i >= 0; i--) if (Number.isFinite(a[i])) return a[i];
  return NaN;
};
const ret = (c: number[], days: number): number => {
  const n = c.length;
  return n > days && c[n - 1 - days] > 0 ? (c[n - 1] / c[n - 1 - days] - 1) * 100 : 0;
};

export function coinRead(id: string, label: string, closes: number[]): CoinRead | null {
  const n = closes.length;
  if (n < 60) return null;
  const price = closes[n - 1];
  const s50 = lastNum(sma(closes, Math.min(50, n)));
  const s200 = lastNum(sma(closes, Math.min(200, n)));
  const r = lastNum(rsi(closes, 14));
  const high = Math.max(...closes.slice(-365));
  const ret30d = ret(closes, 30);
  const ret90d = ret(closes, 90);
  const aboveSMA50 = Number.isFinite(s50) ? price > s50 : false;
  const aboveSMA200 = Number.isFinite(s200) ? price > s200 : false;
  const trend: CoinRead["trend"] = aboveSMA50 && aboveSMA200 && ret30d > 0 ? "Up" : !aboveSMA50 && !aboveSMA200 ? "Down" : "Neutral";
  return {
    id,
    label,
    price,
    aboveSMA50,
    aboveSMA200,
    pctFrom200dma: Number.isFinite(s200) && s200 > 0 ? (price / s200 - 1) * 100 : 0,
    rsi: Number.isFinite(r) ? r : 50,
    ret30d,
    ret90d,
    drawdownFromHigh: high > 0 ? (price / high - 1) * 100 : 0,
    trend,
  };
}

function ratioChange(a: number[], b: number[], days: number): { ratio: number; change: number } | null {
  const T = Math.min(a.length, b.length);
  if (T < days + 1) return null;
  const ai = a.slice(a.length - T);
  const bi = b.slice(b.length - T);
  const cur = bi[T - 1] > 0 ? ai[T - 1] / bi[T - 1] : null;
  const past = bi[T - 1 - days] > 0 ? ai[T - 1 - days] / bi[T - 1 - days] : null;
  if (cur === null || past === null || past === 0) return null;
  return { ratio: cur, change: (cur / past - 1) * 100 };
}

export function buildCryptoRegime(series: CoinSeries[]): CryptoRegimeReport {
  const coins: CoinRead[] = [];
  for (const s of series) {
    const r = coinRead(s.id, s.label, s.closes);
    if (r) coins.push(r);
  }

  const btc = coins.find((c) => c.id === "btc");
  const btcRegime: CryptoRegime = btc ? (btc.aboveSMA200 && btc.ret90d > 0 ? "Bull" : !btc.aboveSMA200 ? "Bear" : "Neutral") : "Neutral";

  const breadthPct = coins.length ? (coins.filter((c) => c.aboveSMA200).length / coins.length) * 100 : 0;

  const btcCloses = series.find((s) => s.id === "btc")?.closes;
  const ethCloses = series.find((s) => s.id === "eth")?.closes;
  const eb = btcCloses && ethCloses ? ratioChange(ethCloses, btcCloses, 30) : null;
  const ethBtcRatio = eb ? eb.ratio : null;
  const ethBtcChange30d = eb ? eb.change : 0;

  let riskAppetite: CryptoRisk = "Neutral";
  if (btcRegime === "Bull" && ethBtcChange30d > 0) riskAppetite = "Risk-on";
  else if (btcRegime === "Bear" || ethBtcChange30d < -5) riskAppetite = "Risk-off";

  return { coins, btcRegime, breadthPct, ethBtcRatio, ethBtcChange30d, riskAppetite };
}
