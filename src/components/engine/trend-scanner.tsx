"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td, Ticker } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { weightedMomentum, rsRating, relativeReturn, rsLine, rsNewHigh } from "@/lib/engine/relative-strength";
import { trendTemplate } from "@/lib/engine/trend-template";
import { candleSeries, type Candle } from "@/lib/rng";

type Status = "loading" | "live" | "demo";

type TTCriterion = { name: string; pass: boolean | null; detail: string };

/** One scanned name — mirrors the /api/engine/trend row shape exactly. */
type TrendRow = {
  sym: string;
  price: number;
  chgPct: number;
  momentum: number;
  rsRating: number;
  relRet63: number | null;
  rsNewHigh: boolean | null;
  trendPass: number;
  trendMax: number;
  trendPassed: boolean;
  criteria: TTCriterion[];
};

type TrendPayload = {
  live: true;
  source: string;
  asOf: string;
  benchmark: string;
  scanned: number;
  rows: TrendRow[];
};
type TrendResponse = TrendPayload | { live: false };

const UNIVERSE = [
  "NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "TSLA", "AMD",
  "AVGO", "LLY", "JPM", "XOM", "COST", "NFLX", "CRM", "UNH",
] as const;

const BENCHMARK = "SPY";

/** RS-rating bar colour — leaders read pos, mid accent, laggards neg. */
const rsColor = (v: number): string => (v >= 80 ? "var(--pos)" : v >= 50 ? "var(--accent)" : "var(--neg)");

/**
 * Demo fallback — the SAME engine math (relative-strength + trend-template),
 * run client-side on seeded 280-bar series. Sandbox always returns
 * { live:false }, so this is what renders day-to-day.
 */
function buildDemoRows(): TrendRow[] {
  const benchCandles = candleSeries("SPY-trend", 280, 100, 0.014, 0.0003);
  const benchCloses = benchCandles.map((c) => c.c);

  const built = UNIVERSE.map((sym, i) => {
    const candles: Candle[] = candleSeries(sym + "-trend", 280, 100, 0.02, ((i % 5) - 2) * 0.0006 + 0.0003);
    const closes = candles.map((c) => c.c);
    return { sym, candles, closes, momentum: weightedMomentum(closes) };
  });
  const allScores = built.map((b) => b.momentum);

  const rows: TrendRow[] = built.map((b) => {
    const rs = rsRating(b.momentum, allScores);
    const tt = trendTemplate(b.candles, rs);
    const last = b.closes[b.closes.length - 1];
    const prev = b.closes[b.closes.length - 2] ?? last;
    return {
      sym: b.sym,
      price: last,
      chgPct: prev ? (last / prev - 1) * 100 : 0,
      momentum: b.momentum,
      rsRating: rs,
      relRet63: relativeReturn(b.closes, benchCloses, 63),
      rsNewHigh: rsNewHigh(rsLine(b.closes, benchCloses)),
      trendPass: tt.pass,
      trendMax: tt.max,
      trendPassed: tt.passed,
      criteria: tt.criteria,
    };
  });
  rows.sort((a, b) => b.rsRating - a.rsRating);
  return rows;
}

const DEMO_ROWS = buildDemoRows();

/** A single trend-template criterion line in the expanded row. */
function CriterionLine({ c }: { c: TTCriterion }) {
  const mark = c.pass === true ? "✓" : c.pass === false ? "✗" : "—";
  const markClass = c.pass === true ? "text-pos" : c.pass === false ? "text-neg" : "text-faint";
  return (
    <div className="flex items-baseline gap-2.5 py-1">
      <span className={cn("w-3 shrink-0 text-center font-mono text-xs", markClass)}>{mark}</span>
      <span className="text-xs text-muted">{c.name}</span>
      <span className="ml-auto truncate pl-3 font-mono text-2xs text-dim">{c.detail}</span>
    </div>
  );
}

export function TrendScanner() {
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<TrendRow[]>(DEMO_ROWS);
  const [scanned, setScanned] = useState<number>(UNIVERSE.length);
  const [benchmark, setBenchmark] = useState<string>(BENCHMARK);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");
  const [passOnly, setPassOnly] = useState(false);
  const [rsHigh, setRsHigh] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/engine/trend?symbols=${UNIVERSE.join(",")}&benchmark=${BENCHMARK}`, { cache: "no-store" });
      const j = (await r.json()) as TrendResponse;
      if (j.live && j.rows.length) {
        setRows(j.rows);
        setScanned(j.scanned);
        setBenchmark(j.benchmark);
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
        return;
      }
    } catch {
      /* fall through to demo */
    }
    setRows(DEMO_ROWS);
    setScanned(UNIVERSE.length);
    setBenchmark(BENCHMARK);
    setStatus("demo");
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 300_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => (!passOnly || r.trendPassed) && (!rsHigh || r.rsRating >= 70)),
    [rows, passOnly, rsHigh],
  );

  const toggleRow = (sym: string) => setExpanded((cur) => (cur === sym ? null : sym));

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Trend & Relative-Strength Scanner"
        sub="Minervini Stage-2 template + IBD-style RS rating — momentum leadership across the universe"
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> scanning…
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
              <Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA
            </span>
          )
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="section-label mr-1">Filter:</span>
        <button
          onClick={() => setPassOnly((v) => !v)}
          className={cn("chip cursor-pointer", passOnly && "chip-pos")}
          aria-pressed={passOnly}
        >
          Trend-template pass only
        </button>
        <button
          onClick={() => setRsHigh((v) => !v)}
          className={cn("chip cursor-pointer", rsHigh && "chip-accent")}
          aria-pressed={rsHigh}
        >
          RS ≥ 70
        </button>
        <span className="ml-auto font-mono text-xs text-dim">
          <span className="text-ink">{filtered.length}</span> of {scanned} · benchmark{" "}
          <span className="text-muted">{benchmark}</span>
        </span>
      </div>

      {/* Leaderboard */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr>
              <Th>Symbol</Th>
              <Th right>Last</Th>
              <Th right>1D%</Th>
              <Th right>RS Rating</Th>
              <Th right>Momentum %</Th>
              <Th right>Rel 63d</Th>
              <Th>Trend</Th>
              <Th right>RS-NH</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isOpen = expanded === row.sym;
              return (
                <Fragment key={row.sym}>
                  <tr
                    onClick={() => toggleRow(row.sym)}
                    className={cn(
                      "group cursor-pointer hover:bg-elevated/40",
                      i === 0 && "bg-accent/5",
                      isOpen && "bg-elevated/40",
                    )}
                    aria-expanded={isOpen}
                  >
                    <Td mono={false}>
                      <Ticker sym={row.sym} name={row.sym} />
                    </Td>
                    <Td right>{fmtNum(row.price)}</Td>
                    <Td right className={signClass(row.chgPct)}>{fmtSignedPct(row.chgPct)}</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 shrink-0">
                          <ProgressBar value={row.rsRating} color={rsColor(row.rsRating)} height={5} />
                        </div>
                        <span className="w-6 text-right font-mono text-sm font-bold tabular-nums text-ink">{row.rsRating}</span>
                      </div>
                    </Td>
                    <Td right className={signClass(row.momentum)}>{fmtSignedPct(row.momentum)}</Td>
                    <Td right className={row.relRet63 == null ? "text-dim" : signClass(row.relRet63)}>
                      {row.relRet63 == null ? "—" : fmtSignedPct(row.relRet63)}
                    </Td>
                    <Td mono={false}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-muted">{row.trendPass}/{row.trendMax}</span>
                        {row.trendPassed ? <Chip tone="pos" className="text-2xs">✓ STAGE-2</Chip> : null}
                      </div>
                    </Td>
                    <Td right>
                      {row.rsNewHigh ? (
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-pos" title="RS line at new high" />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Td>
                  </tr>
                  {isOpen ? (
                    <tr className="bg-elevated/20">
                      <Td colSpan={8} mono={false} className="px-4 py-3">
                        <div className="mb-2 font-mono text-2xs uppercase tracking-widest text-dim">
                          Trend-template checklist · {row.sym}
                        </div>
                        <div className="grid gap-x-8 gap-y-0.5 divide-line sm:grid-cols-2">
                          {row.criteria.map((c) => (
                            <CriterionLine key={c.name} c={c} />
                          ))}
                        </div>
                      </Td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
        RS rating is a 1–99 cross-sectional percentile of weighted 3/6/9/12-month momentum. Stage-2 = all 8 trend-template criteria pass (Minervini).
      </div>
    </Panel>
  );
}
