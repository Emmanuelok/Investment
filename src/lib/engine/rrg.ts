/**
 * Relative-Rotation-Graph engine. Computes JdK-style RS-Ratio (relative strength
 * vs its own trend) and RS-Momentum (rate of change of the ratio), both centered
 * at 100, and classifies a symbol into one of four rotation quadrants plus a tail
 * (trajectory) for plotting. Deterministic.
 */
import { sma } from "./indicators";

export type Quadrant = "Leading" | "Weakening" | "Lagging" | "Improving";

export function quadrantOf(ratio: number, momentum: number): Quadrant {
  if (ratio >= 100 && momentum >= 100) return "Leading";
  if (ratio >= 100 && momentum < 100) return "Weakening";
  if (ratio < 100 && momentum < 100) return "Lagging";
  return "Improving";
}

export type RRGPoint = { ratio: number; momentum: number };
export type RRGResult = { ratio: number; momentum: number; quadrant: Quadrant; tail: RRGPoint[] };

export function computeRRG(closes: number[], benchCloses: number[], window = 12, tailLen = 8): RRGResult | null {
  const n = Math.min(closes.length, benchCloses.length);
  if (n < window * 3) return null;
  const a = closes.slice(-n), b = benchCloses.slice(-n);
  const rs = a.map((c, i) => (b[i] !== 0 ? (c / b[i]) * 100 : NaN));
  const rsSma = sma(rs, window);

  // RS-Ratio = 100 * RS / SMA(RS) — centered at 100
  const ratioValid: number[] = [];
  for (let i = 0; i < rs.length; i++) if (Number.isFinite(rsSma[i]) && rsSma[i] !== 0 && Number.isFinite(rs[i])) ratioValid.push((100 * rs[i]) / rsSma[i]);
  if (ratioValid.length < window + 2) return null;

  // RS-Momentum = 100 * Ratio / SMA(Ratio) — centered at 100
  const ratioSma = sma(ratioValid, window);
  const pts: RRGPoint[] = [];
  for (let i = window - 1; i < ratioValid.length; i++) {
    if (Number.isFinite(ratioSma[i]) && ratioSma[i] !== 0) {
      pts.push({ ratio: ratioValid[i], momentum: (100 * ratioValid[i]) / ratioSma[i] });
    }
  }
  if (!pts.length) return null;
  const last = pts[pts.length - 1];
  return { ratio: last.ratio, momentum: last.momentum, quadrant: quadrantOf(last.ratio, last.momentum), tail: pts.slice(-tailLen) };
}
