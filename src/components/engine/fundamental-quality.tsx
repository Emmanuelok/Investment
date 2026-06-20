"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import {
  piotroskiFScore,
  altmanZScore,
  qualityGrade,
  type FinancialYear,
  type Piotroski,
  type Altman,
  type QualityGrade,
} from "@/lib/engine/fundamental-score";
import { earningsQuality, type EarningsQuality } from "@/lib/engine/earnings-quality";
import { cn } from "@/lib/cn";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

interface FinancialsLive {
  live: true;
  source: string;
  asOf: string;
  symbol: string;
  cik: string;
  name: string;
  cur: FinancialYear;
  prior: FinancialYear;
  piotroski: Piotroski;
  altman: Altman;
  quality: QualityGrade;
  earnings: EarningsQuality;
}
type FinancialsResponse = FinancialsLive | { live: false };

interface ViewModel {
  name: string;
  cur: FinancialYear;
  prior: FinancialYear;
  piotroski: Piotroski;
  altman: Altman;
  quality: QualityGrade;
  earnings: EarningsQuality;
}

/* ── Formatting ────────────────────────────────────────────────────────────── */

/** Compact USD from raw dollars, e.g. 60922000000 → "$60.9B". */
const money = (n?: number): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(0)}`;
};

const yoy = (cur?: number, prior?: number): number | null =>
  cur != null && prior != null && Number.isFinite(cur) && Number.isFinite(prior) && prior !== 0
    ? (cur / prior - 1) * 100
    : null;

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/* ── Demo data (NVDA) ──────────────────────────────────────────────────────── */

function demoModel(): ViewModel {
  const cur: FinancialYear = {
    fiscalYear: 2024, revenue: 60922e6, netIncome: 29760e6, operatingCashFlow: 28090e6,
    totalAssets: 65728e6, totalLiabilities: 22750e6, currentAssets: 44345e6, currentLiabilities: 10631e6,
    longTermDebt: 8459e6, grossProfit: 44301e6, retainedEarnings: 29840e6, ebit: 32972e6,
    stockholdersEquity: 42978e6, sharesOutstanding: 24600e6, marketCap: 3.0e12,
  };
  const prior: FinancialYear = {
    fiscalYear: 2023, revenue: 26974e6, netIncome: 4368e6, operatingCashFlow: 5641e6,
    totalAssets: 41182e6, totalLiabilities: 19081e6, currentAssets: 23073e6, currentLiabilities: 6563e6,
    longTermDebt: 9703e6, grossProfit: 15356e6, retainedEarnings: 10171e6, ebit: 5577e6,
    stockholdersEquity: 22101e6, sharesOutstanding: 24700e6,
  };
  const piotroski = piotroskiFScore(cur, prior);
  const altman = altmanZScore(cur);
  const quality = qualityGrade({
    profitMargin: (cur.netIncome! / cur.revenue!) * 100,
    grossMargin: (cur.grossProfit! / cur.revenue!) * 100,
    roe: (cur.netIncome! / cur.stockholdersEquity!) * 100,
    revenueGrowth: (cur.revenue! / prior.revenue! - 1) * 100,
    debtToEquity: (cur.totalLiabilities! / cur.stockholdersEquity!) * 100,
  });
  const earnings = earningsQuality(cur, prior);
  return { name: "NVIDIA Corporation", cur, prior, piotroski, altman, quality, earnings };
}

/* ── Tone maps ─────────────────────────────────────────────────────────────── */

const GRADE_COLOR: Record<QualityGrade["grade"], string> = {
  A: "text-pos", B: "text-pos", C: "text-warn", D: "text-neg", F: "text-neg",
};
const GRADE_RING: Record<QualityGrade["grade"], string> = {
  A: "var(--pos)", B: "var(--pos)", C: "var(--warn)", D: "var(--neg)", F: "var(--neg)",
};
const PIOTROSKI_CHIP: Record<Piotroski["label"], "pos" | "warn" | "neg"> = {
  Strong: "pos", Moderate: "warn", Weak: "neg",
};
const PIOTROSKI_RING: Record<Piotroski["label"], string> = {
  Strong: "var(--pos)", Moderate: "var(--warn)", Weak: "var(--neg)",
};
const ALTMAN_CHIP: Record<Altman["zone"], "pos" | "warn" | "neg" | "default"> = {
  Safe: "pos", Grey: "warn", Distress: "neg", Unknown: "default",
};
const ALTMAN_COLOR: Record<Altman["zone"], string> = {
  Safe: "text-pos", Grey: "text-warn", Distress: "text-neg", Unknown: "text-dim",
};

/* ── Component ─────────────────────────────────────────────────────────────── */

export function FundamentalQuality({ symbol = "NVDA" }: { symbol?: string }) {
  const [active, setActive] = useState(symbol);
  const [field, setField] = useState(symbol);
  const [status, setStatus] = useState<Status>("loading");
  const [model, setModel] = useState<ViewModel | null>(null);
  const [source, setSource] = useState("");
  const [updated, setUpdated] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/edgar/financials?symbol=${encodeURIComponent(active)}`, { cache: "no-store" });
      const j = (await r.json()) as FinancialsResponse;
      if (j.live) {
        setModel({ name: j.name, cur: j.cur, prior: j.prior, piotroski: j.piotroski, altman: j.altman, quality: j.quality, earnings: j.earnings });
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setModel(demoModel());
        setStatus("demo");
      }
    } catch {
      setModel(demoModel());
      setStatus("demo");
    }
  }, [active]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setField(symbol); setActive(symbol); }, [symbol]);

  const submit = () => {
    const next = field.trim().toUpperCase();
    if (SYM_RE.test(next) && next !== active) setActive(next);
  };

  const m = model ?? demoModel();
  const { name, cur, prior, piotroski, altman, quality, earnings } = m;

  const finRows: { label: string; cur?: number; prior?: number }[] = [
    { label: "Revenue", cur: cur.revenue, prior: prior.revenue },
    { label: "Net Income", cur: cur.netIncome, prior: prior.netIncome },
    { label: "Operating Cash Flow", cur: cur.operatingCashFlow, prior: prior.operatingCashFlow },
    { label: "Gross Profit", cur: cur.grossProfit, prior: prior.grossProfit },
    { label: "Total Assets", cur: cur.totalAssets, prior: prior.totalAssets },
    { label: "Total Liabilities", cur: cur.totalLiabilities, prior: prior.totalLiabilities },
    { label: "Stockholders' Equity", cur: cur.stockholdersEquity, prior: prior.stockholdersEquity },
  ].filter((r) => r.cur != null || r.prior != null);

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title={`Fundamental Quality — ${name}`}
        sub="Piotroski F-Score · Altman Z-Score · quality grade — from SEC-reported financials"
        right={
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <input
                value={field}
                onChange={(e) => setField(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="SYMBOL"
                aria-label="Ticker symbol"
                spellCheck={false}
                maxLength={10}
                className="h-7 w-24 rounded border border-line bg-elevated/40 px-2 font-mono text-2xs uppercase tracking-wider text-ink outline-none placeholder:text-dim focus:border-line-strong"
              />
              <button
                onClick={submit}
                className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink"
                aria-label="Load symbol"
              >
                ↵
              </button>
            </div>
            {status === "loading" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" />
                computing…
              </span>
            ) : status === "live" ? (
              <>
                <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                  </span>
                  ENGINE · LIVE · {source}
                </span>
                <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                ENGINE · DEMO DATA
              </span>
            )}
          </div>
        }
      />

      {/* 1 ── Headline scorecards */}
      <div className="grid gap-px border-b border-line bg-line md:grid-cols-3">
        {/* a. Quality grade */}
        <div className="bg-panel px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="kpi-label">QUALITY GRADE</span>
            <span className="font-mono text-2xs tabular-nums text-dim">{quality.score}/100</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={cn("font-mono text-5xl font-semibold leading-none tracking-tight", GRADE_COLOR[quality.grade])}>
              {quality.grade}
            </span>
            <span className="font-mono text-sm text-dim">score {quality.score}</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {quality.drivers.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", d.good ? "bg-pos" : "bg-neg")} />
                  {d.name}
                </span>
                <span className="font-mono tabular-nums text-ink">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* b. Piotroski F-Score */}
        <div className="bg-panel px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="kpi-label">PIOTROSKI F-SCORE</span>
            <span className="font-mono text-2xs tabular-nums text-dim">{piotroski.pct.toFixed(0)}%</span>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <Ring
              value={piotroski.score}
              max={piotroski.max}
              size={84}
              stroke={8}
              color={PIOTROSKI_RING[piotroski.label]}
              label={`${piotroski.score}/${piotroski.max}`}
              sub="F-SCORE"
            />
            <div className="space-y-2">
              <Chip tone={PIOTROSKI_CHIP[piotroski.label]}>{piotroski.label}</Chip>
              <div className="font-mono text-2xs text-dim">{piotroski.pct.toFixed(0)}% of evaluable</div>
            </div>
          </div>
        </div>

        {/* c. Altman Z-Score */}
        <div className="bg-panel px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="kpi-label">ALTMAN Z-SCORE</span>
            <span className="font-mono text-2xs tabular-nums text-dim">bankruptcy risk</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={cn("font-mono text-5xl font-semibold leading-none tracking-tight", ALTMAN_COLOR[altman.zone])}>
              {altman.z != null ? altman.z.toFixed(2) : "—"}
            </span>
          </div>
          <div className="mt-3">
            <Chip tone={ALTMAN_CHIP[altman.zone]}>{altman.zone}</Chip>
          </div>
          <div className="mt-2 font-mono text-2xs text-dim">Safe &gt; 2.99 · Grey 1.81–2.99 · Distress &lt; 1.81</div>
        </div>
      </div>

      {/* 2 ── Piotroski criteria checklist */}
      <div className="border-b border-line px-4 py-4">
        <div className="mb-3 section-label text-[11px] text-muted">Piotroski Criteria</div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {piotroski.criteria.map((c) => {
            const icon = c.pass === null ? "—" : c.pass ? "✓" : "✗";
            const iconColor = c.pass === null ? "text-dim" : c.pass ? "text-pos" : "text-neg";
            return (
              <div key={c.name} className="flex items-start gap-2">
                <span className={cn("mt-0.5 w-3 shrink-0 text-center font-mono text-sm", iconColor)}>{icon}</span>
                <div className="min-w-0">
                  <div className="text-xs text-ink">{c.name}</div>
                  <div className="font-mono text-2xs text-dim">{c.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 ── Reported financials */}
      <div className="overflow-x-auto border-b border-line">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <Th>Metric</Th>
              <Th right>FY{cur.fiscalYear ?? "—"}</Th>
              <Th right>FY{prior.fiscalYear ?? "—"}</Th>
              <Th right>YoY %</Th>
            </tr>
          </thead>
          <tbody>
            {finRows.map((row) => {
              const change = yoy(row.cur, row.prior);
              return (
                <tr key={row.label} className="hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink">{row.label}</Td>
                  <Td right className="text-ink">{money(row.cur)}</Td>
                  <Td right className="text-muted">{money(row.prior)}</Td>
                  <Td right className={change == null ? "text-dim" : change >= 0 ? "text-pos" : "text-neg"}>
                    {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4 ── Altman components */}
      {altman.components.length > 0 ? (
        <div className="border-b border-line px-4 py-4">
          <div className="mb-3 section-label text-[11px] text-muted">Altman Z Components</div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {altman.components.map((comp) => (
              <div key={comp.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">{comp.name}</span>
                <span className="font-mono tabular-nums text-ink">{comp.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5 ── Earnings quality */}
      <div className="border-b border-line px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="section-label text-[11px] text-muted">Earnings Quality (accruals)</span>
          <span className={cn("font-mono text-lg font-semibold leading-none", GRADE_COLOR[earnings.grade])}>{earnings.grade}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Accruals ratio (NI−CFO)/assets</span>
              <span className={cn("font-mono tabular-nums", earnings.accrualsRatio == null ? "text-dim" : earnings.accrualsRatio < 5 ? "text-pos" : earnings.accrualsRatio > 15 ? "text-neg" : "text-warn")}>
                {earnings.accrualsRatio == null ? "—" : `${earnings.accrualsRatio.toFixed(1)}%`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Cash conversion (CFO/NI)</span>
              <span className={cn("font-mono tabular-nums", earnings.cashConversion == null ? "text-dim" : earnings.cashConversion >= 0.9 ? "text-pos" : earnings.cashConversion >= 0.6 ? "text-warn" : "text-neg")}>
                {earnings.cashConversion == null ? "—" : `${earnings.cashConversion.toFixed(2)}×`}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {earnings.flags.map((fl, i) => (
              <div key={i} className="flex items-start gap-1.5 text-2xs">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", fl.tone === "pos" ? "bg-pos" : fl.tone === "neg" ? "bg-neg" : "bg-warn")} />
                <span className="text-muted">{fl.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 font-mono text-2xs text-dim">
        Piotroski F-Score (0–9) gauges fundamental momentum; Altman Z flags bankruptcy risk; grade blends margins,
        returns, growth &amp; leverage. Financials are as-reported in SEC 10-K filings.
      </div>
    </Panel>
  );
}
