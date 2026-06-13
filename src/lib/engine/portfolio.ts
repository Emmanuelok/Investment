/**
 * Portfolio analytics engine — combines holdings into a portfolio return series
 * and computes annualized risk/return, drawdown, VaR/ES, beta, per-asset risk
 * contribution (component contribution to variance) and a diversification ratio.
 */
import { logReturns, beta as betaOf, historicalVar } from "./correlation";

export type Holding = { sym: string; weight: number; closes: number[] };

export type Contribution = {
  sym: string;
  weight: number; // normalized
  vol: number; // annualized %, standalone
  riskContribPct: number; // % of portfolio variance
  retContribPct: number; // % of portfolio mean return
};

export type PortfolioReport = {
  symbols: string[];
  equity: number[]; // rebased to 1
  annReturn: number; // %
  annVol: number; // %
  sharpe: number;
  sortino: number;
  maxDrawdown: number; // %
  var95: number; // 1-day %
  es95: number; // 1-day %
  beta: number | null;
  diversification: number;
  contributions: Contribution[];
};

const ANN = 252;

export function analyzePortfolio(holdings: Holding[], benchmarkCloses?: number[]): PortfolioReport {
  const wsum = holdings.reduce((a, h) => a + Math.abs(h.weight), 0) || 1;
  const hs = holdings.map((h) => ({ ...h, weight: h.weight / wsum }));

  // align to the shortest return history
  const retsBy = hs.map((h) => logReturns(h.closes));
  const minLen = Math.min(...retsBy.map((r) => r.length));
  const rets = retsBy.map((r) => r.slice(-minLen));

  // portfolio daily returns
  const port: number[] = new Array(minLen).fill(0);
  for (let t = 0; t < minLen; t++) for (let i = 0; i < hs.length; i++) port[t] += hs[i].weight * rets[i][t];

  const mean = port.reduce((a, b) => a + b, 0) / (minLen || 1);
  const variance = port.reduce((a, b) => a + (b - mean) ** 2, 0) / (minLen || 1);
  const sd = Math.sqrt(variance);
  const annReturn = (Math.exp(mean * ANN) - 1) * 100;
  const annVol = sd * Math.sqrt(ANN) * 100;
  const sharpe = sd > 0 ? (mean * ANN) / (sd * Math.sqrt(ANN)) : 0;
  const downside = port.filter((r) => r < 0);
  const dsd = downside.length ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length) : 0;
  const sortino = dsd > 0 ? (mean * ANN) / (dsd * Math.sqrt(ANN)) : 0;

  // equity curve + drawdown
  const equity = [1];
  for (let t = 0; t < minLen; t++) equity.push(equity[equity.length - 1] * Math.exp(port[t]));
  let peak = -Infinity, maxDrawdown = 0;
  for (const e of equity) { peak = Math.max(peak, e); maxDrawdown = Math.min(maxDrawdown, e / peak - 1); }

  const { var: var95, es: es95 } = historicalVar(port, 0.95);

  // component contribution to variance: CCV_i = w_i * Cov(r_i, r_p) ; Σ = σ_p²
  const meanI = rets.map((r) => r.reduce((a, b) => a + b, 0) / (minLen || 1));
  const contributions: Contribution[] = hs.map((h, i) => {
    let cov = 0;
    for (let t = 0; t < minLen; t++) cov += (rets[i][t] - meanI[i]) * (port[t] - mean);
    cov /= minLen || 1;
    const ccv = h.weight * cov;
    const stdI = Math.sqrt(rets[i].reduce((a, b) => a + (b - meanI[i]) ** 2, 0) / (minLen || 1));
    return {
      sym: h.sym,
      weight: h.weight,
      vol: stdI * Math.sqrt(ANN) * 100,
      riskContribPct: variance > 0 ? (ccv / variance) * 100 : 0,
      retContribPct: mean !== 0 ? ((h.weight * meanI[i]) / mean) * 100 : 0,
    };
  });

  // diversification ratio = Σ w_i σ_i / σ_p
  const weightedVol = hs.reduce((a, h, i) => {
    const stdI = Math.sqrt(rets[i].reduce((s, b) => s + (b - meanI[i]) ** 2, 0) / (minLen || 1));
    return a + h.weight * stdI;
  }, 0);
  const diversification = sd > 0 ? weightedVol / sd : 1;

  const bench = benchmarkCloses && benchmarkCloses.length > minLen ? betaOf(equity, benchmarkCloses, minLen) : null;

  return {
    symbols: hs.map((h) => h.sym),
    equity, annReturn, annVol, sharpe, sortino, maxDrawdown: maxDrawdown * 100,
    var95, es95, beta: bench, diversification, contributions,
  };
}
