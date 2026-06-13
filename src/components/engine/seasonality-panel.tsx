"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Panel, PanelHeader, Stat } from "@/components/ui/kit";
import { computeSeasonality, monthName, type DatedBar, type Seasonality } from "@/lib/engine/seasonality";
import { candleSeries } from "@/lib/rng";
import { fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

interface SeasonalityApiResponse extends Partial<Seasonality> {
  live: boolean;
  source?: string;
  asOf?: string;
  symbol?: string;
}

const SYM_RE = /^[A-Z0-9.^-]{1,10}$/;
const DOW_LABEL: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };

/* ── Demo data ─────────────────────────────────────────────────────────────── */

/**
 * Build ~6y of dated weekday bars from a deterministic candle series, then run
 * the real seasonality engine over them. Computed, not curve-fit — identical to
 * the live path's math, only the price source differs.
 */
function demoSeasonality(symbol: string): Seasonality {
  const series = candleSeries(`${symbol}-seas`, 2200, 100, 0.012, 0.0003);
  const start = Date.UTC(2019, 0, 2) / 1000;
  const DAY = 86_400;
  const bars: DatedBar[] = [];
  let idx = 0;
  for (let i = 0; i < 2190 && idx < series.length; i++) {
    const t = start + i * DAY;
    const dow = new Date(t * 1000).getUTCDay();
    if (dow === 0 || dow === 6) continue; // skip Sat/Sun
    bars.push({ t, c: series[idx].c });
    idx++;
  }
  return computeSeasonality(bars);
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function SeasonalityPanel({ symbol = "SPY" }: { symbol?: string }) {
  const [sym, setSym] = useState(symbol.toUpperCase());
  const [draft, setDraft] = useState(symbol.toUpperCase());
  const [status, setStatus] = useState<Status>("loading");
  const [live, setLive] = useState<Seasonality | null>(null);
  const [source, setSource] = useState("");
  const [updated, setUpdated] = useState("");

  // Keep internal symbol in sync if the prop changes.
  useEffect(() => {
    setSym(symbol.toUpperCase());
    setDraft(symbol.toUpperCase());
  }, [symbol]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/engine/seasonality?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" });
      const j = (await r.json()) as SeasonalityApiResponse;
      if (j.live && j.monthly && j.dayOfWeek && j.bestMonth && j.worstMonth && j.currentMonth) {
        setLive({
          monthly: j.monthly,
          dayOfWeek: j.dayOfWeek,
          bestMonth: j.bestMonth,
          worstMonth: j.worstMonth,
          positiveMonthRate: j.positiveMonthRate ?? 0,
          years: j.years ?? 0,
          currentMonth: j.currentMonth,
        });
        setSource(j.source ?? "live");
        setUpdated(new Date(j.asOf ?? Date.now()).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setStatus("demo");
      }
    } catch {
      setStatus("demo");
    }
  }, [sym]);

  useEffect(() => {
    load();
  }, [load]);

  // Deterministic demo fallback — the analytics are real math over the series.
  const demo = useMemo(() => demoSeasonality(sym), [sym]);
  const data = status === "live" && live ? live : demo;

  const currentMonthIdx = data.currentMonth.month;
  const maxAbs = useMemo(() => Math.max(1e-6, ...data.monthly.map((m) => Math.abs(m.avgRet))), [data.monthly]);
  const maxDowAbs = useMemo(() => Math.max(1e-6, ...data.dayOfWeek.map((d) => Math.abs(d.avgRet))), [data.dayOfWeek]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim().toUpperCase();
    if (SYM_RE.test(next) && next !== sym) setSym(next);
  };

  const draftValid = SYM_RE.test(draft.trim().toUpperCase());

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title={`Seasonality Engine — ${sym}`}
        sub={`Average monthly & day-of-week returns from ${data.years.toFixed(0)}y of history — computed, not curve-fit`}
        right={
          <div className="flex items-center gap-2">
            <form onSubmit={onSubmit} className="hidden items-center gap-1 sm:flex">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                aria-label="Symbol"
                spellCheck={false}
                maxLength={10}
                className={cn(
                  "h-6 w-20 rounded border bg-elevated/40 px-2 font-mono text-2xs uppercase tracking-wider text-ink outline-none transition-colors placeholder:text-faint focus:border-accent/60",
                  draftValid ? "border-line" : "border-neg/50",
                )}
                placeholder="SYMBOL"
              />
            </form>
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

      {/* 1 ── Monthly average-return bars */}
      <div className="border-b border-line px-4 py-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="kpi-label">AVG MONTHLY RETURN · JAN–DEC</span>
          <span className="font-mono text-2xs text-dim">scale ±{maxAbs.toFixed(2)}%</span>
        </div>
        <div className="flex items-stretch gap-1.5 sm:gap-2.5">
          {data.monthly.map((m) => {
            const up = m.avgRet >= 0;
            const mag = Math.min(1, Math.abs(m.avgRet) / maxAbs);
            const isCurrent = m.month === currentMonthIdx;
            return (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center">
                {/* bar column with a centered zero baseline */}
                <div
                  className={cn(
                    "relative flex h-24 w-full flex-col rounded-sm",
                    isCurrent && "ring-1 ring-accent ring-offset-1 ring-offset-panel",
                  )}
                  title={`${monthName(m.month)} — avg ${fmtSignedPct(m.avgRet)} · ${m.posRate.toFixed(0)}% up · n=${m.count}`}
                >
                  {/* top half (positive) */}
                  <div className="flex flex-1 items-end justify-center">
                    {up ? (
                      <div
                        className="w-full rounded-t-sm bg-pos/80 transition-all"
                        style={{ height: `${mag * 100}%` }}
                      />
                    ) : null}
                  </div>
                  {/* zero baseline */}
                  <div className="h-px w-full bg-line-strong" />
                  {/* bottom half (negative) */}
                  <div className="flex flex-1 items-start justify-center">
                    {!up ? (
                      <div
                        className="w-full rounded-b-sm bg-neg/80 transition-all"
                        style={{ height: `${mag * 100}%` }}
                      />
                    ) : null}
                  </div>
                </div>
                <span className={cn("mt-1.5 font-mono text-[9px] sm:text-[10px]", isCurrent ? "text-accent" : "text-dim")}>
                  {monthName(m.month)}
                </span>
                <span className={cn("font-mono text-[9px] tabular-nums sm:text-2xs", up ? "text-pos" : "text-neg")}>
                  {fmtSignedPct(m.avgRet)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2 ── Summary stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line px-4 py-4 sm:grid-cols-3 xl:grid-cols-5">
        <Stat
          label="BEST MONTH"
          tone="pos"
          value={
            <span className="flex items-baseline gap-1.5">
              <span className="text-ink">{monthName(data.bestMonth.month)}</span>
              <span className="text-xs text-pos">{fmtSignedPct(data.bestMonth.avgRet)}</span>
            </span>
          }
        />
        <Stat
          label="WORST MONTH"
          tone="neg"
          value={
            <span className="flex items-baseline gap-1.5">
              <span className="text-ink">{monthName(data.worstMonth.month)}</span>
              <span className="text-xs text-neg">{fmtSignedPct(data.worstMonth.avgRet)}</span>
            </span>
          }
        />
        <Stat label="POSITIVE-MONTH RATE" tone="accent" value={`${data.positiveMonthRate.toFixed(0)}%`} />
        <Stat
          label={`THIS MONTH · ${monthName(currentMonthIdx).toUpperCase()}`}
          tone={data.currentMonth.avgRet >= 0 ? "pos" : "neg"}
          value={
            <span className="flex flex-col">
              <span>{fmtSignedPct(data.currentMonth.avgRet)}</span>
              <span className="font-mono text-2xs text-dim">{data.currentMonth.posRate.toFixed(0)}% up historically · n={data.currentMonth.count}</span>
            </span>
          }
        />
        <Stat label="YEARS OF DATA" value={`${data.years.toFixed(1)}y`} />
      </div>

      {/* 3 ── Day-of-week strip */}
      <div className="px-4 py-4">
        <div className="mb-3 kpi-label">AVG RETURN BY WEEKDAY</div>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {data.dayOfWeek.map((d) => {
            const up = d.avgRet >= 0;
            const mag = Math.min(1, Math.abs(d.avgRet) / maxDowAbs);
            return (
              <div
                key={d.dow}
                className="flex flex-col items-center rounded border border-line bg-elevated/30 px-2 py-2.5"
                title={`${DOW_LABEL[d.dow]} — avg ${fmtSignedPct(d.avgRet)} · ${d.posRate.toFixed(0)}% up · n=${d.count}`}
              >
                <span className="font-mono text-2xs uppercase tracking-wider text-dim">{DOW_LABEL[d.dow]}</span>
                <span className={cn("mt-1 font-mono text-sm tabular-nums", up ? "text-pos" : "text-neg")}>
                  {fmtSignedPct(d.avgRet)}
                </span>
                {/* thin bar */}
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line/60">
                  <div
                    className={cn("h-full rounded-full", up ? "bg-pos" : "bg-neg")}
                    style={{ width: `${Math.max(4, mag * 100)}%` }}
                  />
                </div>
                <span className="mt-1 font-mono text-[10px] text-dim">{d.posRate.toFixed(0)}% up</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 ── Footer */}
      <div className="border-t border-line px-4 py-2 font-mono text-2xs text-dim">
        Seasonal averages describe the past and are not forecasts; sample counts shown where relevant.
      </div>
    </Panel>
  );
}
