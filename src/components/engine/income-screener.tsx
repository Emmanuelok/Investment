"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildIncomeScreen,
  type IncomeStock,
  type IncomeRead,
  type IncomeScreenReport,
  type IncomeGrade,
} from "@/lib/engine/income-screener";

/* ── Types matching /api/engine/income-screener ────────────────────────────── */

type LiveReport = IncomeScreenReport & { source: string; asOf: string };

type LiveResponse = ({ live: true } & LiveReport) | { live: false; error?: string };

type Status = "loading" | "live" | "demo";

/* ── Grade presentation (static maps — no dynamic Tailwind) ────────────────── */

const GRADE_TONE: Record<IncomeGrade, "pos" | "accent" | "warn" | "neg"> = {
  "Top pick": "pos",
  Solid: "accent",
  Fair: "warn",
  Risky: "neg",
};

const scoreColor = (v: number): string => (v >= 70 ? "var(--pos)" : v >= 45 ? "var(--accent)" : "var(--neg)");

const payoutClass = (v: number): string => (v > 90 ? "text-neg" : v >= 60 ? "text-warn" : "text-pos");

const debtClass = (v: number): string => (v > 2.5 ? "text-neg" : v > 2 ? "text-warn" : "text-muted");

/* ── Demo universe — the SAME engine math, run client-side ─────────────────── */

const DEMO_RAW: [string, string, number, number, number, number][] = [
  // symbol, name, dividendYield %, payoutRatio %, roe %, debt/equity
  ["JNJ", "Johnson & Johnson", 3.1, 45, 25, 0.5],
  ["KO", "Coca-Cola", 3.0, 68, 40, 1.6],
  ["VZ", "Verizon", 6.7, 55, 22, 1.8],
  ["MO", "Altria", 8.2, 80, 120, 2.2],
  ["T", "AT&T", 6.5, 95, 12, 1.5],
  ["O", "Realty Income", 5.6, 75, 8, 0.8],
  ["XOM", "Exxon Mobil", 3.5, 40, 18, 0.3],
  ["PG", "Procter & Gamble", 2.4, 60, 30, 0.7],
  ["IBM", "IBM", 4.0, 70, 30, 2.6],
  ["ABBV", "AbbVie", 3.6, 50, 70, 4.0],
];

function buildDemo(): LiveReport {
  const demoStocks: IncomeStock[] = DEMO_RAW.map(([symbol, name, dividendYield, payoutRatio, roe, debtToEquity]) => ({
    symbol,
    name,
    dividendYield,
    payoutRatio,
    roe,
    debtToEquity,
  }));
  return { ...buildIncomeScreen(demoStocks), source: "demo", asOf: "" };
}

const DEMO = buildDemo();

/* ── Sub-score mini-bar (yield / safety / quality) ─────────────────────────── */

function ScoreLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-2xs uppercase tracking-wider text-dim">{label}</span>
      <div className="flex-1" role="img" aria-label={`${label} score ${Math.round(value)} of 100`}>
        <ProgressBar value={value} color={color} height={4} />
      </div>
      <span className="w-7 shrink-0 text-right font-mono text-2xs tabular-nums text-muted">{Math.round(value)}</span>
    </div>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function IncomeScreener() {
  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<LiveReport>(DEMO);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/income-screener", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live && j.stocks.length) {
        setReport({
          stocks: j.stocks,
          avgYield: j.avgYield,
          best: j.best,
          scanned: j.scanned,
          source: j.source,
          asOf: j.asOf,
        });
        setStatus("live");
      } else {
        setReport(DEMO);
        setStatus("demo");
      }
    } catch {
      setReport(DEMO);
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const asOf = status === "live" && report.asOf ? new Date(report.asOf).toLocaleTimeString("en-US", { hour12: false }) : "";

  const top: IncomeRead | null = report.stocks.length > 0 ? report.stocks[0] : null;

  return (
    <Panel>
      <PanelHeader
        title="Quality-Income Screener"
        sub="Ranks dividend payers on a blend that rewards yield but penalizes the yield trap — unsafe payout, weak ROE or heavy leverage"
        right={
          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…
              </span>
            ) : status === "live" ? (
              <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                </span>
                ENGINE · LIVE · {report.source}
                {asOf ? <span className="text-pos/70">· {asOf}</span> : null}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" /> ENGINE · DEMO DATA
              </span>
            )}
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh income screener"
            >
              ↻
            </button>
          </div>
        }
      />

      {status === "loading" ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: top pick spotlight + score breakdown ── */}
          {top ? (
            <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
              <div className="space-y-3 bg-base p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-2 py-1 font-mono text-sm font-semibold text-ink">
                    {top.symbol}
                  </span>
                  <span className="truncate text-sm text-dim">{top.name}</span>
                  <Chip tone={GRADE_TONE[top.grade]}>{top.grade}</Chip>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className="font-mono text-4xl font-semibold leading-none tracking-tight text-pos">
                    {fmtNum(top.dividendYield, 1)}%
                  </span>
                  <span className="text-sm text-dim">dividend yield</span>
                  <span className="font-mono text-2xl font-semibold leading-none tracking-tight text-accent">
                    {top.composite}
                  </span>
                  <span className="text-sm text-dim">composite score</span>
                </div>

                <p className="text-sm text-muted">
                  Screened {report.scanned} payer{report.scanned === 1 ? "" : "s"} —{" "}
                  <span className="text-ink">{report.best ?? top.symbol}</span> leads on quality income at{" "}
                  <span className="text-pos">{fmtNum(top.dividendYield, 1)}%</span> yield.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Scanned" value={`${report.scanned}`} />
                  <Stat label="Avg yield" value={`${fmtNum(report.avgYield, 2)}%`} tone="accent" />
                  <Stat label="Top pick" value={report.best ?? top.symbol} tone="pos" />
                </div>
              </div>

              {/* Score breakdown for the leader */}
              <div className="space-y-3 bg-base p-4">
                <div>
                  <div className="section-label">Score Breakdown · {top.symbol}</div>
                  <p className="mt-1 text-2xs text-dim">How the composite is built.</p>
                </div>
                <div className="space-y-2.5">
                  <ScoreLine label="Yield" value={top.yieldScore} color="var(--pos)" />
                  <ScoreLine label="Safety" value={top.safetyScore} color="var(--accent)" />
                  <ScoreLine label="Quality" value={top.qualityScore} color="var(--info)" />
                  <div className="border-t border-line pt-2.5">
                    <ScoreLine label="Composite" value={top.composite} color={scoreColor(top.composite)} />
                  </div>
                </div>
                {top.flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {top.flags.map((f) => (
                      <Chip key={f} tone="warn" className="text-2xs">
                        {f}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── Ranked table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr>
                  <Th right>#</Th>
                  <Th>Stock</Th>
                  <Th right>Div Yield</Th>
                  <Th right>Payout</Th>
                  <Th right>ROE</Th>
                  <Th right>Debt/Eq</Th>
                  <Th right>Composite</Th>
                  <Th>Grade</Th>
                  <Th>Flags</Th>
                </tr>
              </thead>
              <tbody>
                {report.stocks.map((s) => (
                  <tr key={s.symbol} className={cn("group hover:bg-elevated/40", s.rank === 1 && "bg-accent/5")}>
                    <Td right className="text-faint">{s.rank}</Td>
                    <Td mono={false}>
                      <div className="flex flex-col">
                        <span className="inline-flex w-fit items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink">
                          {s.symbol}
                        </span>
                        <span className="mt-0.5 truncate text-2xs text-dim">{s.name}</span>
                      </div>
                    </Td>
                    <Td right className="font-semibold text-ink">{fmtNum(s.dividendYield, 1)}%</Td>
                    <Td right className={payoutClass(s.payoutRatio)}>
                      {s.payoutRatio > 0 ? `${fmtNum(s.payoutRatio, 0)}%` : "—"}
                    </Td>
                    <Td right className="text-muted">{fmtNum(s.roe, 0)}%</Td>
                    <Td right className={debtClass(s.debtToEquity)}>{fmtNum(s.debtToEquity, 2)}</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="w-14 shrink-0"
                          role="img"
                          aria-label={`${s.symbol} composite ${s.composite} of 100`}
                        >
                          <ProgressBar value={s.composite} color={scoreColor(s.composite)} height={4} />
                        </div>
                        <span className="w-7 text-right font-mono text-xs font-semibold tabular-nums text-ink">
                          {s.composite}
                        </span>
                      </div>
                    </Td>
                    <Td mono={false}>
                      <Chip tone={GRADE_TONE[s.grade]}>{s.grade}</Chip>
                    </Td>
                    <Td mono={false}>
                      {s.flags.length > 0 ? (
                        <span
                          className="inline-flex cursor-help items-center gap-1 rounded border border-neg/30 bg-neg/10 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-neg"
                          title={s.flags.join(" · ")}
                        >
                          ⚠ {s.flags.length}
                        </span>
                      ) : (
                        <span className="font-mono text-2xs text-faint">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Ranks dividend payers on a blend that rewards yield but penalizes unsafe yield — a high payout ratio, weak ROE or
        heavy leverage (the yield trap). Source: Finnhub basic financials.
      </div>
    </Panel>
  );
}
