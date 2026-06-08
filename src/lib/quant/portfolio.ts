/**
 * Mean-variance portfolio math for the interactive optimizer.
 * Covariance is built from a one-factor (CAPM-style) structure, so it is
 * always positive semi-definite. Deterministic given the seed.
 */
import { Rng } from "@/lib/rng";

export type Asset = { sym: string; beta: number; idio: number; alpha: number; mu: number; vol: number };
export type Portfolio = { w: number[]; ret: number; vol: number; sharpe: number };

const RF = 0.04;
const MKT_PREMIUM = 0.05;
const MKT_VOL = 0.16;

const SYMS = ["NVDA", "MSFT", "LMT", "XOM", "JPM", "UNH", "TLT", "GLD"];

export function buildAssets(): { assets: Asset[]; cov: number[][] } {
  const r = new Rng("opt-assets");
  const assets: Asset[] = SYMS.map((sym) => {
    const beta = Math.round(r.float(0.25, 1.7) * 100) / 100;
    const idio = Math.round(r.float(0.08, 0.34) * 100) / 100;
    const alpha = Math.round(r.gauss(0.01, 0.03) * 1000) / 1000;
    const mu = RF + beta * MKT_PREMIUM + alpha;
    const vol = Math.sqrt(beta * beta * MKT_VOL * MKT_VOL + idio * idio);
    return { sym, beta, idio, alpha, mu, vol };
  });
  const n = assets.length;
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      cov[i][j] = assets[i].beta * assets[j].beta * MKT_VOL * MKT_VOL + (i === j ? assets[i].idio * assets[i].idio : 0);
    }
  return { assets, cov };
}

export function stats(w: number[], assets: Asset[], cov: number[][]): Portfolio {
  let ret = 0;
  for (let i = 0; i < w.length; i++) ret += w[i] * assets[i].mu;
  let v = 0;
  for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) v += w[i] * w[j] * cov[i][j];
  const vol = Math.sqrt(Math.max(v, 1e-12));
  return { w, ret, vol, sharpe: (ret - RF) / vol };
}

/** Monte-Carlo long-only portfolios (deterministic). */
export function randomPortfolios(assets: Asset[], cov: number[][], n = 1400): Portfolio[] {
  const r = new Rng("opt-cloud");
  const out: Portfolio[] = [];
  for (let k = 0; k < n; k++) {
    const conc = r.float(0.2, 2.5);
    const raw = assets.map(() => Math.exp(r.gauss(0, conc)));
    const s = raw.reduce((a, b) => a + b, 0);
    const w = raw.map((x) => x / s);
    out.push(stats(w, assets, cov));
  }
  return out;
}

/** Upper-left efficient envelope of a portfolio cloud. */
export function envelope(ps: Portfolio[], bins = 40): Portfolio[] {
  const sorted = [...ps].sort((a, b) => a.vol - b.vol);
  const minV = sorted[0].vol, maxV = sorted[sorted.length - 1].vol;
  const step = (maxV - minV) / bins || 1;
  const best: Portfolio[] = [];
  for (let b = 0; b < bins; b++) {
    const lo = minV + b * step, hi = lo + step;
    let pick: Portfolio | null = null;
    for (const p of sorted) if (p.vol >= lo && p.vol < hi && (!pick || p.ret > pick.ret)) pick = p;
    if (pick) best.push(pick);
  }
  // keep monotonically increasing return (true frontier)
  const front: Portfolio[] = [];
  let maxRet = -Infinity;
  for (const p of best) if (p.ret > maxRet) { front.push(p); maxRet = p.ret; }
  return front;
}

export function minVariance(ps: Portfolio[]): Portfolio {
  return ps.reduce((a, b) => (b.vol < a.vol ? b : a));
}
export function maxSharpe(ps: Portfolio[]): Portfolio {
  return ps.reduce((a, b) => (b.sharpe > a.sharpe ? b : a));
}

/** Mean-variance utility selection: argmax ret − ½·λ·variance. */
export function selectByRiskAversion(ps: Portfolio[], lambda: number): Portfolio {
  return ps.reduce((a, b) => {
    const ua = a.ret - 0.5 * lambda * a.vol * a.vol;
    const ub = b.ret - 0.5 * lambda * b.vol * b.vol;
    return ub > ua ? b : a;
  });
}

/** Diversification ratio = Σ w_i σ_i / σ_p (1 = concentrated, higher = more diversified). */
export function diversification(p: Portfolio, assets: Asset[]): number {
  const wAvgVol = p.w.reduce((a, w, i) => a + w * assets[i].vol, 0);
  return wAvgVol / p.vol;
}
