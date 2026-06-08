"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, Panel, PanelHeader, Chip, Stat, Th, Td, Ticker } from "@/components/ui/kit";
import { Sparkline, Ring, ProgressBar } from "@/components/ui/viz";
import { Candles } from "@/components/ui/candles";
import { Icon } from "@/components/icon-map";
import { signClass, fmtNum, fmtSignedPct, fmtBps } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MARKET_INDICES, SPY_CANDLES, SECTORS, TOP_GAINERS, TOP_LOSERS, FX_RATES, RATES_TABLE, CRYPTO_TABLE } from "@/lib/data/obsidian";
import type { MarketsLive, MarketsResponse } from "@/lib/markets/types";

type Status = "loading" | "live" | "demo";
const compact = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n)));

export function MarketsOverview() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<MarketsLive | null>(null);
  const [updated, setUpdated] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/markets", { cache: "no-store" });
      const j = (await r.json()) as MarketsResponse;
      if (j.live) { setData(j); setStatus("live"); setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false })); }
      else setStatus("demo");
    } catch { setStatus("demo"); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  // live data when present, else the demo arrays (clearly badged)
  const indices = data?.indices ?? MARKET_INDICES;
  const spyCandles = data?.spy.candles?.length ? data.spy.candles : SPY_CANDLES;
  const sectors = data?.sectors?.length ? data.sectors : SECTORS;
  const gainers = data?.gainers?.length ? data.gainers : TOP_GAINERS;
  const losers = data?.losers?.length ? data.losers : TOP_LOSERS;
  const fx = data?.fx?.length ? data.fx : FX_RATES;
  const rates = data?.rates?.length ? data.rates : RATES_TABLE;
  const crypto = data?.crypto?.length ? data.crypto : CRYPTO_TABLE;
  const vix = data?.vol.vix || 14.82;
  const skew = data?.vol.skew || 134.2;

  const spyOpen = data ? fmtNum(data.spy.open) : "544.82";
  const spyHL = data ? `${fmtNum(data.spy.high)} / ${fmtNum(data.spy.low)}` : "549.14 / 543.28";
  const spyVol = data ? compact(data.spy.volume) : "84.2M";

  // breadth internals are not available from free feeds → modeled, labelled honestly
  const advancers = 2847, decliners = 1634, unchanged = 319;
  const total = advancers + decliners + unchanged, newHighs = 182, newLows = 47, aboveMA200 = 68.4;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Markets Overview"
        desc="Global multi-asset snapshot — indices, sectors, movers, FX, rates, and crypto."
        right={
          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> connecting…</span>
            ) : status === "live" ? (
              <>
                <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                  <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-pos" /></span>
                  LIVE · {data?.source}
                </span>
                <Chip tone="accent">{data?.marketState}</Chip>
                <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
                <button onClick={load} className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink" aria-label="Refresh">↻</button>
              </>
            ) : (
              <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn"><Icon name="warn" width={12} height={12} /> Demo · live feed unreachable</span>
            )}
          </div>
        }
      />

      {data && data.partial.length > 0 ? (
        <div className="rounded border border-warn/30 bg-warn/5 px-3 py-1.5 font-mono text-2xs text-warn">Some panels using fallback (provider gap): {data.partial.join(", ")}</div>
      ) : null}

      {/* Index strip */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3 pb-1">
          {indices.map((idx) => (
            <Panel key={idx.sym} hover className="scanline min-w-[160px] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-ink">{idx.sym}</span>
                <span className={cn("font-mono text-xs", signClass(idx.chgPct))}>{idx.chgPct >= 0 ? "+" : ""}{idx.chgPct.toFixed(2)}%</span>
              </div>
              <div className="mt-0.5 text-2xs text-dim">{idx.name}</div>
              <div className="mt-2"><Sparkline data={idx.spark} width={120} height={28} /></div>
              <div className="mt-1 flex items-end justify-between">
                <span className="font-mono text-sm font-medium text-ink">{idx.last.toLocaleString("en-US", { maximumFractionDigits: idx.last > 1000 ? 1 : 2 })}</span>
                <span className={cn("font-mono text-2xs", signClass(idx.ytd))}>YTD {idx.ytd >= 0 ? "+" : ""}{idx.ytd.toFixed(1)}%</span>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Featured chart + breadth */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="S&P 500 — SPY · 90D Daily" sub={status === "live" ? "Live daily candles · SMA-20 overlay" : "Demo snapshot · SMA-20 overlay"} right={<div className="flex items-center gap-2"><Chip>SMA 20</Chip><Chip tone="accent">90D</Chip></div>} />
          <div className="p-3"><Candles data={spyCandles} width={720} height={260} volume sma={20} /></div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
            <div className="px-4 py-2.5"><div className="kpi-label">OPEN</div><div className="mt-1 font-mono text-sm text-ink">{spyOpen}</div></div>
            <div className="px-4 py-2.5"><div className="kpi-label">HIGH / LOW</div><div className="mt-1 font-mono text-sm text-ink">{spyHL}</div></div>
            <div className="px-4 py-2.5"><div className="kpi-label">VOLUME</div><div className="mt-1 font-mono text-sm text-ink">{spyVol}</div></div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Market Breadth — NYSE + Nasdaq" right={<Chip>modeled</Chip>} />
          <div className="space-y-5 px-4 py-4">
            <div className="flex items-center justify-center gap-6">
              <Ring value={advancers} max={total} size={88} stroke={8} color="var(--pos)" label={advancers.toLocaleString()} sub="ADV" />
              <div className="space-y-2 text-center">
                <div><div className="kpi-label">A/D RATIO</div><div className="mt-1 font-mono text-lg font-medium text-pos">{(advancers / decliners).toFixed(2)}</div></div>
                <div><div className="kpi-label">UNCHANGED</div><div className="mt-1 font-mono text-sm text-muted">{unchanged}</div></div>
              </div>
              <Ring value={decliners} max={total} size={88} stroke={8} color="var(--neg)" label={decliners.toLocaleString()} sub="DEC" />
            </div>
            <div className="space-y-3">
              <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">New Highs</span><span className="font-mono text-pos">{newHighs}</span></div><ProgressBar value={newHighs} max={newHighs + newLows} color="var(--pos)" height={6} /></div>
              <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">New Lows</span><span className="font-mono text-neg">{newLows}</span></div><ProgressBar value={newLows} max={newHighs + newLows} color="var(--neg)" height={6} /></div>
              <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">Above 200D MA</span><span className="font-mono text-accent">{aboveMA200}%</span></div><ProgressBar value={aboveMA200} color="var(--accent)" height={6} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Stat label="VIX" value={vix.toFixed(2)} tone={vix > 20 ? "neg" : "accent"} />
              <Stat label="SKEW" value={skew.toFixed(1)} />
              <Stat label="Adv/Dec" value={(advancers / decliners).toFixed(2)} tone="pos" />
              <Stat label="New H-L" value={`+${newHighs - newLows}`} tone="pos" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Sector heat grid */}
      <Panel>
        <PanelHeader title="S&P 500 Sector Performance" right={<Chip>1D change shown</Chip>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead><tr><Th>Sector</Th><Th>ETF</Th><Th right>1D</Th><Th right>MTD</Th><Th right>YTD</Th><Th right>Heat</Th></tr></thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.sym} className="group hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink">{s.name}</Td>
                  <Td><span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink">{s.sym}</span></Td>
                  <Td right className={signClass(s.chgPct)}>{fmtSignedPct(s.chgPct)}</Td>
                  <Td right className={signClass(s.mtd)}>{fmtSignedPct(s.mtd)}</Td>
                  <Td right className={signClass(s.ytd)}>{fmtSignedPct(s.ytd)}</Td>
                  <Td right><div className="flex items-center justify-end gap-2"><div className="h-4 w-20 rounded-[2px]" style={{ background: `rgba(${s.chgPct > 0 ? "31,229,192" : "255,93,99"},${Math.min(0.9, Math.abs(s.chgPct) / 3)})` }} /></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Gainers / Losers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {([["Top Gainers — Today", gainers, "pos", "+"], ["Top Losers — Today", losers, "neg", "−"]] as const).map(([title, rows, tone, sign]) => (
          <Panel key={title}>
            <PanelHeader title={title} right={<Chip tone={tone}>{sign}</Chip>} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><Th>Symbol</Th><Th right>Last</Th><Th right>Chg %</Th><Th right>Volume</Th><Th right>Mkt Cap</Th></tr></thead>
                <tbody>
                  {rows.map((g) => (
                    <tr key={g.sym} className="group hover:bg-elevated/40">
                      <Td mono={false}><Ticker sym={g.sym} name={g.name} /></Td>
                      <Td right>{fmtNum(g.last)}</Td>
                      <Td right className={cn("font-medium", tone === "pos" ? "text-pos" : "text-neg")}>{fmtSignedPct(g.chgPct)}</Td>
                      <Td right className="text-muted">{g.vol}</Td>
                      <Td right className="text-muted">{g.mktcap}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>

      {/* FX + Rates + Crypto */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="FX Rates" right={<Icon name="globe" width={14} height={14} className="text-dim" />} />
          <table className="w-full border-collapse">
            <thead><tr><Th>Pair</Th><Th right>Rate</Th><Th right>1D</Th></tr></thead>
            <tbody>{fx.map((f) => (<tr key={f.pair} className="hover:bg-elevated/40"><Td mono={false} className="font-medium">{f.pair}</Td><Td right>{f.rate.toFixed(4)}</Td><Td right className={signClass(f.chgPct)}>{fmtSignedPct(f.chgPct)}</Td></tr>))}</tbody>
          </table>
        </Panel>
        <Panel>
          <PanelHeader title="US Rates" right={<Icon name="wave" width={14} height={14} className="text-dim" />} />
          <table className="w-full border-collapse">
            <thead><tr><Th>Tenor</Th><Th right>Yield</Th><Th right>1D Δ</Th></tr></thead>
            <tbody>{rates.map((r) => (<tr key={r.tenor} className="hover:bg-elevated/40"><Td mono={false} className="text-muted">{r.tenor}</Td><Td right className="text-ink">{r.yield.toFixed(3)}%</Td><Td right className={signClass(r.chgBps)}>{fmtBps(r.chgBps)}</Td></tr>))}</tbody>
          </table>
        </Panel>
        <Panel>
          <PanelHeader title="Crypto Spot" right={<Icon name="coins" width={14} height={14} className="text-dim" />} />
          <table className="w-full border-collapse">
            <thead><tr><Th>Asset</Th><Th right>Price</Th><Th right>24H</Th></tr></thead>
            <tbody>{crypto.map((c) => (<tr key={c.sym} className="hover:bg-elevated/40"><Td mono={false}><div className="flex flex-col"><span className="font-mono text-xs font-medium text-ink">{c.sym}</span><span className="text-2xs text-dim">{c.name}</span></div></Td><Td right>${c.last.toLocaleString("en-US", { maximumFractionDigits: c.last > 1000 ? 0 : 2 })}</Td><Td right className={signClass(c.chgPct)}>{fmtSignedPct(c.chgPct)}</Td></tr>))}</tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
