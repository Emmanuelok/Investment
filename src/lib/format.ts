/** Formatting helpers — terminal-grade, locale-stable (en-US fixed). */

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat("en-US", opts);

export const fmtNum = (n: number, dp = 2) =>
  nf({ minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

export const fmtInt = (n: number) => nf({ maximumFractionDigits: 0 }).format(n);

export function fmtCompact(n: number, dp = 1): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(dp)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(dp)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(dp)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(dp)}K`;
  return `${sign}${abs.toFixed(dp)}`;
}

export const fmtUsd = (n: number, dp = 2) =>
  nf({ style: "currency", currency: "USD", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

export const fmtUsdCompact = (n: number) => `$${fmtCompact(n)}`;

export const fmtPct = (n: number, dp = 2) => `${n >= 0 ? "" : ""}${n.toFixed(dp)}%`;

export const fmtSignedPct = (n: number, dp = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(dp)}%`;

export const fmtSigned = (n: number, dp = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(dp)}`;

export const fmtBps = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}bps`;

export function signClass(n: number): string {
  return n > 0 ? "text-pos" : n < 0 ? "text-neg" : "text-muted";
}

/** Fixed UTC clock string for SSR; the live ticker hydrates client-side. */
export function utcClock(d = new Date()): string {
  return d.toISOString().slice(11, 19);
}
