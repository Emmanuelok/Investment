/**
 * Yield-curve analytics. From a set of (tenor, yield) points it computes the
 * 2s10s / 3m10s slopes, curvature (2-5-10 butterfly), implied forward rates
 * between tenors, inverted segments and a shape classification. Deterministic.
 */

export type CurvePoint = { tenorYears: number; label: string; yield: number }; // yield in %
export type Forward = { from: string; to: string; fromYears: number; toYears: number; rate: number };
export type CurveShape = "Normal" | "Flat" | "Inverted" | "Humped";
export type CurveAnalysis = {
  slope2s10s: number; // pp (10Y − 2Y)
  slope3m10s: number; // pp (10Y − 3M)
  curvature: number; // 2·5Y − 2Y − 10Y
  level: number; // 10Y (or average)
  shape: CurveShape;
  forwards: Forward[];
  invertedSegments: { from: string; to: string; spread: number }[];
};

/** Implied forward rate from t1→t2 given annually-compounded zero rates (in %). */
export function forwardRate(t1: number, y1: number, t2: number, y2: number): number {
  if (t2 <= t1) return y2;
  const a = Math.pow(1 + y1 / 100, t1);
  const b = Math.pow(1 + y2 / 100, t2);
  return (Math.pow(b / a, 1 / (t2 - t1)) - 1) * 100;
}

const at = (pts: CurvePoint[], tenor: number) => pts.find((p) => Math.abs(p.tenorYears - tenor) < 1e-6)?.yield;

export function analyzeCurve(points: CurvePoint[]): CurveAnalysis {
  const pts = [...points].sort((a, b) => a.tenorYears - b.tenorYears);
  const y2 = at(pts, 2), y10 = at(pts, 10), y3m = at(pts, 0.25), y5 = at(pts, 5);
  const slope2s10s = (y10 ?? 0) - (y2 ?? 0);
  const slope3m10s = (y10 ?? 0) - (y3m ?? 0);
  const curvature = 2 * (y5 ?? 0) - (y2 ?? 0) - (y10 ?? 0);
  const level = y10 ?? pts.reduce((s, p) => s + p.yield, 0) / (pts.length || 1);

  const forwards: Forward[] = [];
  for (let i = 1; i < pts.length; i++) {
    forwards.push({ from: pts[i - 1].label, to: pts[i].label, fromYears: pts[i - 1].tenorYears, toYears: pts[i].tenorYears, rate: forwardRate(pts[i - 1].tenorYears, pts[i - 1].yield, pts[i].tenorYears, pts[i].yield) });
  }

  const invertedSegments: { from: string; to: string; spread: number }[] = [];
  for (let i = 1; i < pts.length; i++) if (pts[i].yield < pts[i - 1].yield - 0.01) invertedSegments.push({ from: pts[i - 1].label, to: pts[i].label, spread: pts[i].yield - pts[i - 1].yield });

  const maxPt = pts.reduce((a, b) => (b.yield > a.yield ? b : a), pts[0]);
  const isHumped = maxPt.tenorYears > pts[0].tenorYears && maxPt.tenorYears < pts[pts.length - 1].tenorYears && maxPt.yield > pts[0].yield + 0.1 && maxPt.yield > pts[pts.length - 1].yield + 0.1;
  let shape: CurveShape;
  if (slope2s10s < -0.1) shape = "Inverted";
  else if (isHumped) shape = "Humped";
  else if (Math.abs(slope2s10s) < 0.25) shape = "Flat";
  else shape = "Normal";

  return { slope2s10s, slope3m10s, curvature, level, shape, forwards, invertedSegments };
}
