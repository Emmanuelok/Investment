"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { attributeReturns, type FactorLoad, type FactorModel } from "@/lib/engine/factor-attribution";
import { logReturns } from "@/lib/engine/correlation";
import { candleSeries } from "@/lib/rng";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

type Status = "loading" | "live" | "demo";

/** Engine report enriched with the request context the route echoes back. */
type AttributionView = {
  source: string;
  asOf: string;
  symbol: string;
  observations: number;
} & FactorModel;

type EngineResponse =
  | ({ live: true; source: string; asOf: string; symbol: string; observations: number } & FactorModel)
  | { live: false; error?: string };

const SYMBOL_RE = /^[A-Z0-9.^-]{1,10}$/;

/** Deterministic factor-return proxy from a seeded candle walk (sandbox fallback). */
const demoFactor = (seed: string, vol: number, drift: number): number[] =>
  logReturns(candleSeries(seed, 400, 100, vol, drift).map((c) => c.c));

/**
 * Compute the report locally with the identical engine code (sandbox fallback).
 * Builds six long-short factor-return proxies plus a synthetic asset whose true
 * loadings are known (1.25·Market, 0.45·Momentum, -0.20·Value, 0.15·Size + alpha).
 */
function demoView(symbol: string): AttributionView {
  const market = demoFactor(`${symbol}-mkt`, 0.012, 0.0003);
  const size = demoFactor(`${symbol}-sz`, 0.016, 0);
  const value = demoFactor(`${symbol}-val`, 0.014, 0);
  const momentum = demoFactor(`${symbol}-mom`, 0.015, 0.0002);
  const quality = demoFactor(`${symbol}-qual`, 0.011, 0.0001);
  const lowvol = demoFactor(`${symbol}-lv`, 0.009, 0);

  const n = Math.min(market.length, size.length, value.length, momentum.length, quality.length, lowvol.length);
  const assetRet: number[] = [];
  for (let i = 0; i < n; i++) {
    assetRet.push(
      0.0002 + 1.25 * market[i] + 0.45 * momentum[i] - 0.2 * value[i] + 0.15 * size[i] + 0.001 * Math.sin(i),
    );
  }

  const factorRets: Record<string, number[]> = {
    Market: market.slice(0, n),
    Size: size.slice(0, n),
    Value: value.slice(0, n),
    Momentum: momentum.slice(0, n),
    Quality: quality.slice(0, n),
    "Low Vol": lowvol.slice(0, n),
  };

  const model = attributeReturns(assetRet, factorRets);
  return { source: "demo", asOf: new Date().toISOString(), symbol, observations: n, ...model };
}

/** Centered diverging bar for a factor beta: negative grows left/red, positive right/green. */
function BetaBar({ beta }: { beta: number }) {
  // |beta| ≈ 2 fills the half-width.
  const frac = Math.min(1, Math.abs(beta) / 2);
  const pos = beta >= 0;
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-elevated">
      <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
      <div
        className={cn("absolute inset-y-0 rounded-full", pos ? "bg-pos" : "bg-neg")}
        style={
          pos
            ? { left: "50%", width: `${frac * 50}%` }
            : { right: "50%", width: `${frac * 50}%` }
        }
      />
    </div>
  );
}

export function FactorAttribution({ symbol: initialSymbol = "NVDA" }: { symbol?: string }) {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [input, setInput] = useState<string>(initialSymbol);

  const [status, setStatus] = useState<Status>("loading");
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");
  const [data, setData] = useState<AttributionView | null>(null);

  const inputValid = SYMBOL_RE.test(input);

  const load = useCallback(async (sym: string) => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/engine/factor-attribution?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" });
      const j = (await res.json()) as EngineResponse;
      if (j.live) {
        setData(j);
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
        return;
      }
      throw new Error(j.error ?? "engine offline");
    } catch {
      // DEMO: regress a synthetic asset on deterministic candle-derived factor proxies.
      const view = demoView(sym);
      setData(view);
      setSource(view.source);
      setStatus("demo");
    }
  }, []);

  // (re)load on mount and whenever the active symbol changes
  useEffect(() => {
    void load(symbol);
  }, [symbol, load]);

  const submit = () => {
    if (!inputValid) return;
    const next = input.toUpperCase();
    if (next === symbol) void load(next);
    else setSymbol(next);
  };

  // factors sorted by |contribution| desc (the return-attribution headline)
  const ranked = useMemo<FactorLoad[]>(
    () => (data ? [...data.factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)) : []),
    [data],
  );
  const contribSum = useMemo(
    () => ranked.reduce((s, f) => s + f.contribution, 0),
    [ranked],
  );

  const r2Pct = data ? Math.round(data.r2 * 100) : 0;
  const alphaPos = (data?.alphaAnnualPct ?? 0) >= 0;

  const badge =
    status === "live" ? (
      <>
        <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
          </span>
          ENGINE · LIVE · {source}
        </span>
        {updated ? <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span> : null}
      </>
    ) : status === "demo" ? (
      <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
        <Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA
      </span>
    ) : (
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> regressing…
      </span>
    );

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title={`Factor Attribution — ${symbol}`}
        sub="Returns decomposed into market, size, value, momentum, quality & low-vol factors (OLS)"
        right={
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              spellCheck={false}
              aria-label="Symbol"
              placeholder="SYM"
              className={cn(
                "w-24 rounded border bg-base/60 px-2 py-1 font-mono text-sm uppercase tracking-wide text-ink outline-none focus:border-accent/50",
                inputValid ? "border-line" : "border-neg/60",
              )}
            />
            <button
              onClick={submit}
              disabled={!inputValid || status === "loading"}
              className="rounded border border-line px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "loading" ? "…" : "Run"}
            </button>
            {badge}
          </div>
        }
      />

      <div className="space-y-4 p-4">
        {/* 1) Headline — alpha, R² gauge, residual vol, observations */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-md border border-line bg-panel/60 px-4 py-3">
            <div className="kpi-label">Annualized Alpha</div>
            <div className={cn("mt-1.5 font-mono text-3xl leading-none tracking-tight", alphaPos ? "text-pos" : "text-neg")}>
              {data ? fmtSignedPct(data.alphaAnnualPct, 1) : "—"}
            </div>
            <div className="mt-1.5 text-2xs text-dim">{alphaPos ? "skill — unexplained excess" : "drag — below factor mix"}</div>
          </div>

          <div className="flex items-center justify-center rounded-md border border-line bg-panel/60 px-4 py-3">
            <Ring
              value={r2Pct}
              max={100}
              size={92}
              stroke={9}
              color="var(--accent)"
              label={data ? `${r2Pct}%` : "—"}
              sub="explained"
            />
          </div>

          <div className="rounded-md border border-line bg-panel/60 px-4 py-3">
            <div className="kpi-label">Residual Vol</div>
            <div className="mt-1.5 font-mono text-3xl leading-none tracking-tight text-ink">
              {data ? `${fmtNum(data.residualVolPct, 1)}%` : "—"}
            </div>
            <div className="mt-1.5 text-2xs text-dim">idiosyncratic (annualized)</div>
          </div>

          <div className="rounded-md border border-line bg-panel/60 px-4 py-3">
            <div className="kpi-label">Observations</div>
            <div className="mt-1.5 font-mono text-3xl leading-none tracking-tight text-ink">
              {data ? data.observations : "—"}
            </div>
            <div className="mt-1.5 text-2xs text-dim">daily returns regressed</div>
          </div>
        </div>

        {/* 2) Factor loadings — centered diverging beta bars */}
        <div className="rounded-md border border-line bg-panel/60 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Factor loadings — beta (systematic exposure)</span>
            <span className="flex items-center gap-3 font-mono text-2xs text-dim">
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-neg" /> short</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-pos" /> long</span>
            </span>
          </div>
          {data ? (
            <div className="space-y-2">
              {data.factors.map((f) => (
                <div key={f.name} className="grid grid-cols-[88px_1fr_56px] items-center gap-3">
                  <span className={cn("truncate text-xs", f.name === "Market" ? "font-medium text-ink" : "text-muted")}>
                    {f.name}
                  </span>
                  <BetaBar beta={f.beta} />
                  <span className={cn("text-right font-mono text-sm tabular-nums", signClass(f.beta))}>
                    {fmtNum(f.beta, 2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="skeleton h-[180px] w-full" />
          )}
        </div>

        {/* 3) Return contribution — sorted by |contribution|, with alpha & sum */}
        <div className="overflow-x-auto rounded-md border border-line bg-panel/60">
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr>
                <Th>Factor</Th>
                <Th right>Beta</Th>
                <Th right>Contribution %</Th>
              </tr>
            </thead>
            <tbody>
              {ranked.length ? (
                <>
                  {ranked.map((f) => (
                    <tr key={f.name} className="hover:bg-elevated/40">
                      <Td mono={false}>
                        <span className={cn("text-sm", f.name === "Market" ? "font-medium text-ink" : "text-muted")}>
                          {f.name}
                        </span>
                      </Td>
                      <Td right className="text-muted">{fmtNum(f.beta, 2)}</Td>
                      <Td right className={signClass(f.contribution)}>{fmtSignedPct(f.contribution, 2)}</Td>
                    </tr>
                  ))}
                  <tr className="hover:bg-elevated/40">
                    <Td mono={false}>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        Alpha (unexplained)
                        <Chip tone={alphaPos ? "pos" : "neg"}>α</Chip>
                      </span>
                    </Td>
                    <Td right className="text-dim">—</Td>
                    <Td right className={signClass(data?.alphaAnnualPct ?? 0)}>
                      {data ? fmtSignedPct(data.alphaAnnualPct, 2) : "—"}
                    </Td>
                  </tr>
                </>
              ) : (
                <tr>
                  <Td colSpan={3} className="py-6 text-center text-dim">
                    {status === "loading" ? "regressing…" : "no factors"}
                  </Td>
                </tr>
              )}
            </tbody>
            {ranked.length ? (
              <tfoot>
                <tr className="bg-elevated/30">
                  <Td mono={false} className="font-semibold text-muted">Σ Factor contribution</Td>
                  <Td right />
                  <Td right className={cn("font-semibold", signClass(contribSum))}>{fmtSignedPct(contribSum, 2)}</Td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Betas from a multivariate OLS of daily returns on long-short factor proxies (SPY, IWM−SPY, IWD−IWF, MTUM−SPY,
        QUAL−SPY, USMV−SPY). Alpha is the annualized unexplained return; high R² = mostly factor-driven.
      </div>
    </Panel>
  );
}
