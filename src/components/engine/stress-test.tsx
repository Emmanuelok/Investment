"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Stat, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { computeStress, classifyAsset, type StressHolding, type AssetClass } from "@/lib/engine/stress";
import { beta as betaOf } from "@/lib/engine/correlation";
import { candleSeries } from "@/lib/rng";
import { fmtSignedPct, fmtNum, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ── shapes mirrored from /api/engine/stress + lib/engine/stress ───────────── */

type Contribution = { sym: string; weight: number; assetClass: AssetClass; ret: number; contribution: number };
type ScenarioResult = { id: string; name: string; description: string; portfolioReturn: number; contributions: Contribution[] };
type DisplayHolding = { sym: string; weight: number; assetClass: AssetClass; beta: number | null };

type StressLive = {
  live: true;
  source: string;
  asOf: string;
  benchmark: string;
  holdings: DisplayHolding[];
  scenarios: ScenarioResult[];
};
type StressResponse = StressLive | { live: false };

type Status = "loading" | "live" | "demo";

/* ── editor model ──────────────────────────────────────────────────────────── */

type Row = { sym: string; weight: number };

const DEFAULT_ROWS: Row[] = [
  { sym: "SPY", weight: 40 },
  { sym: "QQQ", weight: 15 },
  { sym: "TLT", weight: 20 },
  { sym: "GLD", weight: 10 },
  { sym: "XLE", weight: 10 },
  { sym: "BTC-USD", weight: 5 },
];

const SYM_RE = /^[A-Z0-9.^-]{1,10}$/;
const MAX_HOLDINGS = 10;
const BENCHMARK = "SPY";

const ASSET_TONE: Record<AssetClass, "accent" | "info" | "warn" | "ai" | "pos" | "default"> = {
  equity: "accent",
  bond: "info",
  gold: "warn",
  oil: "warn",
  crypto: "ai",
  reit: "pos",
  cash: "default",
};

/* ── local (DEMO) computation — deterministic, byte-stable ─────────────────── */

function computeDemo(rows: Row[]): { holdings: DisplayHolding[]; scenarios: ScenarioResult[] } {
  const valid = rows.filter((r) => SYM_RE.test(r.sym) && r.weight > 0);
  const benchCloses = candleSeries("SPY-stress", 260, 100, 0.014, 0.0003).map((c) => c.c);

  const holdings: StressHolding[] = valid.map((r) => {
    const closes = candleSeries(r.sym + "-stress", 260, 100, 0.02, 0.0004).map((c) => c.c);
    const assetClass = classifyAsset(r.sym);
    const beta = assetClass === "equity" ? betaOf(closes, benchCloses, 252) : undefined;
    return { sym: r.sym, weight: r.weight, beta, assetClass };
  });

  const wsum = holdings.reduce((a, h) => a + h.weight, 0) || 1;
  const display: DisplayHolding[] = holdings.map((h) => ({
    sym: h.sym,
    weight: h.weight / wsum,
    assetClass: h.assetClass ?? classifyAsset(h.sym),
    beta: h.beta ?? null,
  }));

  return { holdings: display, scenarios: computeStress(holdings) };
}

/* ── scenario impact bar (horizontal, click-to-select) ─────────────────────── */

function ScenarioBar({
  scenario,
  maxAbs,
  selected,
  onSelect,
}: {
  scenario: ScenarioResult;
  maxAbs: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const pr = scenario.portfolioReturn;
  const neg = pr < 0;
  const pct = maxAbs > 0 ? (Math.abs(pr) / maxAbs) * 100 : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex w-full items-center gap-3 rounded border px-2.5 py-1.5 text-left transition-colors",
        selected ? "border-line-strong bg-elevated/50" : "border-transparent hover:bg-elevated/30",
      )}
    >
      <span className={cn("w-40 shrink-0 truncate text-xs", selected ? "text-ink" : "text-muted")}>{scenario.name}</span>
      <span className="relative h-3.5 flex-1 overflow-hidden rounded-[2px] bg-line/40">
        <span
          className="absolute inset-y-0 left-0 rounded-[2px] transition-all"
          style={{ width: `${pct}%`, background: neg ? "var(--neg)" : "var(--pos)", opacity: selected ? 0.95 : 0.65 }}
        />
      </span>
      <span className={cn("w-16 shrink-0 text-right font-mono text-xs tabular-nums", signClass(pr))}>{fmtSignedPct(pr)}</span>
    </button>
  );
}

/* ── main component ────────────────────────────────────────────────────────── */

export function StressTest() {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<StressLive | null>(null);
  const [updated, setUpdated] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const weightSum = useMemo(() => rows.reduce((a, r) => a + (Number.isFinite(r.weight) ? r.weight : 0), 0), [rows]);

  const applyResult = useCallback((holdings: DisplayHolding[], scenarios: ScenarioResult[]) => {
    setSelectedId((prev) => {
      if (prev && scenarios.some((s) => s.id === prev)) return prev;
      return scenarios[0]?.id ?? null;
    });
  }, []);

  const runDemo = useCallback(
    (src: Row[]) => {
      const { holdings, scenarios } = computeDemo(src);
      setData({ live: true, source: "demo", asOf: "", benchmark: BENCHMARK, holdings, scenarios });
      setStatus("demo");
      applyResult(holdings, scenarios);
    },
    [applyResult],
  );

  const run = useCallback(async () => {
    const valid = rows.filter((r) => SYM_RE.test(r.sym) && r.weight > 0);
    const snapshot = valid.length ? valid : DEFAULT_ROWS;
    setStatus("loading");
    try {
      const wsum = snapshot.reduce((a, r) => a + r.weight, 0) || 1;
      const query = snapshot.map((r) => `${r.sym}:${(r.weight / wsum).toFixed(6)}`).join(",");
      const r = await fetch(`/api/engine/stress?holdings=${encodeURIComponent(query)}&benchmark=${BENCHMARK}`, { cache: "no-store" });
      const j = (await r.json()) as StressResponse;
      if (j.live && j.scenarios.length) {
        setData(j);
        setStatus("live");
        setUpdated(j.asOf ? new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }) : "");
        applyResult(j.holdings, j.scenarios);
      } else {
        runDemo(snapshot);
      }
    } catch {
      runDemo(snapshot);
    }
  }, [rows, applyResult, runDemo]);

  // Fetch on mount.
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── editor mutations ─────────────────────────────────────────────────────── */

  const updateRow = useCallback((i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }, []);
  const removeRow = useCallback((i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }, []);
  const addRow = useCallback(() => {
    setRows((prev) => (prev.length >= MAX_HOLDINGS ? prev : [...prev, { sym: "", weight: 5 }]));
  }, []);

  /* ── derived ──────────────────────────────────────────────────────────────── */

  const scenarios = data?.scenarios ?? [];
  const holdings = data?.holdings ?? [];
  const maxAbs = useMemo(() => scenarios.reduce((m, s) => Math.max(m, Math.abs(s.portfolioReturn)), 0), [scenarios]);
  const worst = scenarios[0] ?? null; // sorted worst-first
  const best = scenarios.length ? scenarios[scenarios.length - 1] : null;
  const avg = scenarios.length ? scenarios.reduce((a, s) => a + s.portfolioReturn, 0) / scenarios.length : 0;
  const selected = useMemo(() => scenarios.find((s) => s.id === selectedId) ?? worst, [scenarios, selectedId, worst]);

  const selectedContribs = useMemo(
    () => (selected ? [...selected.contributions].sort((a, b) => a.contribution - b.contribution) : []),
    [selected],
  );
  const contribMaxAbs = useMemo(
    () => selectedContribs.reduce((m, c) => Math.max(m, Math.abs(c.contribution)), 0),
    [selectedContribs],
  );

  /* ── badge ────────────────────────────────────────────────────────────────── */

  const badge =
    status === "loading" ? (
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> stress-testing…
      </span>
    ) : status === "live" ? (
      <>
        <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
          </span>
          ENGINE · LIVE · {data?.source}
        </span>
        {updated ? <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span> : null}
      </>
    ) : (
      <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
        <Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA
      </span>
    );

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Portfolio Stress Test"
        sub="Calibrated historical crisis scenarios applied to your book — P&L by asset class"
        right={<div className="flex items-center gap-2">{badge}</div>}
      />

      {/* ── Holdings editor ──────────────────────────────────────────────────── */}
      <div className="border-b border-line px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="section-label text-[11px] text-muted">Holdings — symbol &amp; weight (%)</div>
          <span className="font-mono text-2xs text-dim">
            sum{" "}
            <span className={cn("tabular-nums", Math.abs(weightSum - 100) < 0.5 ? "text-pos" : "text-warn")}>{fmtNum(weightSum, 1)}%</span>
          </span>
        </div>
        <div className="space-y-1.5">
          {rows.map((row, i) => {
            const valid = SYM_RE.test(row.sym);
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row.sym}
                  onChange={(e) => updateRow(i, { sym: e.target.value.toUpperCase() })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") run();
                  }}
                  spellCheck={false}
                  placeholder="SYM"
                  aria-label={`Holding ${i + 1} symbol`}
                  aria-invalid={row.sym.length > 0 && !valid}
                  className={cn(
                    "w-28 rounded border bg-base px-2 py-1 font-mono text-xs uppercase text-ink outline-none placeholder:text-dim focus:border-line-strong",
                    row.sym.length > 0 && !valid ? "border-neg/60" : "border-line",
                  )}
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={row.weight}
                    min={0}
                    step={1}
                    onChange={(e) => updateRow(i, { weight: Number(e.target.value) })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") run();
                    }}
                    aria-label={`Holding ${i + 1} weight percent`}
                    className="w-20 rounded border border-line bg-base px-2 py-1 font-mono text-xs tabular-nums text-ink outline-none focus:border-line-strong"
                  />
                  <span className="font-mono text-2xs text-dim">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={`Remove holding ${i + 1}`}
                  className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim transition-colors hover:border-neg/50 hover:text-neg"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= MAX_HOLDINGS}
            className="btn px-2.5 py-1 font-mono text-2xs uppercase tracking-wider disabled:opacity-50"
          >
            <Icon name="plug" width={12} height={12} />
            Add holding
          </button>
          <span className="font-mono text-2xs text-dim">
            {rows.length}/{MAX_HOLDINGS}
          </span>
          <button
            type="button"
            onClick={run}
            disabled={status === "loading"}
            className="btn btn-accent ml-auto px-3 py-1 font-mono text-2xs uppercase tracking-wider disabled:opacity-50"
          >
            <Icon name="bolt" width={12} height={12} />
            {status === "loading" ? "Running…" : "Run Stress Test"}
          </button>
        </div>
      </div>

      {status === "loading" && !scenarios.length ? (
        <div className="px-4 py-10 text-center font-mono text-xs text-dim">stress-testing…</div>
      ) : (
        <>
          {/* ── 1) Scenario impact chart ───────────────────────────────────────── */}
          <div className="border-b border-line px-4 py-4">
            <div className="section-label mb-2 text-[11px] text-muted">Scenario impact — portfolio P&amp;L (worst first)</div>
            <div className="space-y-0.5">
              {scenarios.map((s) => (
                <ScenarioBar
                  key={s.id}
                  scenario={s}
                  maxAbs={maxAbs}
                  selected={selected?.id === s.id}
                  onSelect={() => setSelectedId(s.id)}
                />
              ))}
            </div>
          </div>

          {/* ── 2) Headline ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-3">
            <div className="bg-base px-4 py-3.5">
              <div className="kpi-label">Max drawdown scenario</div>
              <div className="mt-1.5 truncate text-xs text-muted">{worst?.name ?? "—"}</div>
              <div className={cn("mt-1 font-mono text-[1.7rem] leading-none tracking-tight tabular-nums", signClass(worst?.portfolioReturn ?? 0))}>
                {worst ? fmtSignedPct(worst.portfolioReturn) : "—"}
              </div>
            </div>
            <div className="bg-base px-4 py-3.5">
              <div className="kpi-label">Average across scenarios</div>
              <div className="mt-1.5 truncate text-xs text-muted">{scenarios.length} episodes</div>
              <div className={cn("mt-1 font-mono text-[1.7rem] leading-none tracking-tight tabular-nums", signClass(avg))}>{fmtSignedPct(avg)}</div>
            </div>
            <div className="bg-base px-4 py-3.5">
              <div className="kpi-label">Best scenario</div>
              <div className="mt-1.5 truncate text-xs text-muted">{best?.name ?? "—"}</div>
              <div className={cn("mt-1 font-mono text-[1.7rem] leading-none tracking-tight tabular-nums", signClass(best?.portfolioReturn ?? 0))}>
                {best ? fmtSignedPct(best.portfolioReturn) : "—"}
              </div>
            </div>
          </div>

          {/* ── 3) Selected scenario detail + contribution table ───────────────── */}
          {selected ? (
            <div className="border-t border-line">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{selected.name}</div>
                  <div className="mt-0.5 truncate text-xs text-dim">{selected.description}</div>
                </div>
                <Chip tone={selected.portfolioReturn < 0 ? "neg" : "pos"}>{fmtSignedPct(selected.portfolioReturn)}</Chip>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr>
                      <Th>Symbol</Th>
                      <Th>Asset Class</Th>
                      <Th right>Weight</Th>
                      <Th right>Scenario Return</Th>
                      <Th right>Contribution to P&amp;L</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedContribs.map((c) => {
                      const w = contribMaxAbs > 0 ? Math.min(80, (Math.abs(c.contribution) / contribMaxAbs) * 80) : 0;
                      return (
                        <tr key={c.sym} className="hover:bg-elevated/40">
                          <Td className="font-medium text-ink">{c.sym}</Td>
                          <Td mono={false}>
                            <Chip tone={ASSET_TONE[c.assetClass]}>{c.assetClass}</Chip>
                          </Td>
                          <Td right className="text-muted">{fmtNum(c.weight * 100, 1)}%</Td>
                          <Td right className={signClass(c.ret)}>{fmtSignedPct(c.ret)}</Td>
                          <Td right>
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={cn("inline-block h-2 rounded-sm", c.contribution < 0 ? "bg-neg/70" : "bg-pos/70")}
                                style={{ width: `${w}px` }}
                              />
                              <span className={cn("w-16 text-right font-mono text-xs tabular-nums", signClass(c.contribution))}>
                                {fmtSignedPct(c.contribution)}
                              </span>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* ── 4) Holdings summary strip ──────────────────────────────────────── */}
          <div className="border-t border-line px-4 py-3">
            <div className="section-label mb-2 text-[11px] text-muted">Holdings — asset class &amp; market beta</div>
            <div className="flex flex-wrap gap-2">
              {holdings.map((h) => (
                <div key={h.sym} className="flex items-center gap-2 rounded border border-line bg-elevated/30 px-2.5 py-1.5">
                  <span className="font-mono text-xs font-medium text-ink">{h.sym}</span>
                  <Chip tone={ASSET_TONE[h.assetClass]}>{h.assetClass}</Chip>
                  {h.assetClass === "equity" && h.beta != null ? (
                    <span className="font-mono text-2xs text-dim">
                      β <span className="tabular-nums text-muted">{fmtNum(h.beta, 2)}</span>
                    </span>
                  ) : null}
                  <span className="font-mono text-2xs tabular-nums text-dim">{fmtNum(h.weight * 100, 1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Scenarios apply each episode&apos;s realized asset-class shock; equity holdings are scaled by their estimated market beta.
        Calibrated approximations, not forecasts.
      </div>
    </Panel>
  );
}
