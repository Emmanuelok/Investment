"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { candleSeries } from "@/lib/rng";
import { factorScores, type FactorScores } from "@/lib/engine/score";
import { classifyRegime } from "@/lib/engine/regime";

const UNIVERSE = ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "TSLA", "AMD", "AVGO", "NFLX", "JPM", "XOM", "LLY", "CAT"] as const;

type Status = "loading" | "live" | "demo";
type ScanRow = FactorScores & { sym: string; price: number; chgPct: number; regime: string; volRegime: string };
type ScanResponse = { live: true; source: string; asOf: string; rows: ScanRow[] } | { live: false; error?: string };

/** Demo fallback — the SAME engine math, run client-side on seeded 1y series. */
function buildDemoRows(): ScanRow[] {
  const rows = UNIVERSE.map((sym): ScanRow => {
    const candles = candleSeries(sym + "-scan", 260, 120, 0.02, 0.0005);
    const fs = factorScores(candles);
    const rg = classifyRegime(candles);
    const last = candles[candles.length - 1].c;
    const prev = candles[candles.length - 2]?.c ?? last;
    return { sym, price: last, chgPct: prev ? (last / prev - 1) * 100 : 0, regime: rg.trend, volRegime: rg.volRegime, ...fs };
  });
  rows.sort((a, b) => b.composite - a.composite);
  return rows;
}

const DEMO_ROWS = buildDemoRows();

const scoreColor = (v: number) => (v >= 70 ? "var(--pos)" : v >= 45 ? "var(--accent)" : "var(--neg)");

function ScoreCell({ value, bold }: { value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-12 shrink-0"><ProgressBar value={value} color={scoreColor(value)} height={4} /></div>
      <span className={cn("w-7 text-right font-mono text-xs tabular-nums", bold ? "font-semibold text-accent" : "text-ink")}>{value}</span>
    </div>
  );
}

export function FactorScan() {
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<ScanRow[]>(DEMO_ROWS);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/engine/scan?symbols=${UNIVERSE.join(",")}`, { cache: "no-store" });
      const j = (await r.json()) as ScanResponse;
      if (j.live && j.rows.length) {
        setRows(j.rows);
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else { setRows(DEMO_ROWS); setStatus("demo"); }
    } catch { setRows(DEMO_ROWS); setStatus("demo"); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 300_000); return () => clearInterval(id); }, [load]);

  return (
    <Panel>
      <PanelHeader
        title="Multi-Factor Scan Engine"
        sub="Momentum · trend · low-vol · mean-reversion scores (0–100) computed from 1y of daily candles"
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> scanning…</span>
          ) : status === "live" ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-pos" /></span>
                SCAN · LIVE · {source}
              </span>
              <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn"><Icon name="warn" width={12} height={12} /> SCAN · DEMO DATA</span>
          )
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr>
              <Th>Symbol</Th>
              <Th right>Last</Th>
              <Th right>1D</Th>
              <Th>Regime</Th>
              <Th right>RSI</Th>
              <Th right>σ20</Th>
              <Th right>Mom</Th>
              <Th right>Trend</Th>
              <Th right>LowVol</Th>
              <Th right>MeanRev</Th>
              <Th right>Composite</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.sym} className={cn("group hover:bg-elevated/40", i === 0 && "bg-accent/5")}>
                <Td mono={false}><span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink">{row.sym}</span></Td>
                <Td right>{fmtNum(row.price)}</Td>
                <Td right className={signClass(row.chgPct)}>{fmtSignedPct(row.chgPct)}</Td>
                <Td mono={false}><Chip tone={row.regime === "UPTREND" ? "pos" : row.regime === "DOWNTREND" ? "neg" : "default"}>{row.regime}</Chip></Td>
                <Td right className={row.rsi14 >= 70 ? "text-warn" : row.rsi14 <= 30 ? "text-neg" : "text-muted"}>{row.rsi14.toFixed(1)}</Td>
                <Td right className="text-muted">{row.vol20.toFixed(1)}%</Td>
                <Td right><ScoreCell value={row.momentum} /></Td>
                <Td right><ScoreCell value={row.trend} /></Td>
                <Td right><ScoreCell value={row.lowVol} /></Td>
                <Td right><ScoreCell value={row.meanRev} /></Td>
                <Td right><ScoreCell value={row.composite} bold /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-2xs text-faint">
        <span>{UNIVERSE.length}-symbol universe · sorted by composite · rescans every 5m</span>
        <span>{status === "live" ? `source: ${source}` : status === "demo" ? "real engine math on seeded demo candles" : "…"}</span>
      </div>
    </Panel>
  );
}
