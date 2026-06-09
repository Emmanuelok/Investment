"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, PanelHeader, Chip, KpiCard, Stat } from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import type { Fundamentals, FundamentalsResponse } from "@/lib/markets/types";

type Status = "loading" | "live" | "demo";

const money = (n?: number) => (n == null ? "—" : n >= 1e12 ? "$" + (n / 1e12).toFixed(2) + "T" : n >= 1e9 ? "$" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "$" + (n / 1e6).toFixed(0) + "M" : "$" + n.toFixed(0));
const mult = (n?: number) => (n == null ? "—" : n.toFixed(1) + "x");
const perc = (n?: number, d = 2) => (n == null ? "—" : n.toFixed(d) + "%");
const px = (n?: number) => (n == null ? "—" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const cnt = (n?: number) => (n == null ? "—" : n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : String(Math.round(n)));

const NVDA_DEMO: Fundamentals = { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors", exchange: "NasdaqGS", price: 128.47, marketCap: 3.15e12, sharesOut: 24.53e9, peTrailing: 43.2, peForward: 37.4, pegRatio: 0.42, priceToBook: 37.6, eps: 29.76, beta: 1.84, dividendYield: 0.03, profitMargin: 55.0, grossMargin: 75.0, operatingMargin: 62.1, revenue: 96.3e9, revenueGrowth: 122.0, roe: 87.1, debtToEquity: 17.2, week52High: 140.76, week52Low: 47.32, targetMean: 148.2, targetHigh: 220, targetLow: 80, recommendation: "buy" };

function demoFor(sym: string): Fundamentals {
  if (sym === "NVDA") return NVDA_DEMO;
  const r = new Rng(sym + "-fund");
  const price = r.float(24, 420);
  return { symbol: sym, name: sym + " Inc.", sector: "—", industry: "—", exchange: "—", price, marketCap: price * r.float(1e8, 4e9), sharesOut: r.float(2e8, 6e9), peTrailing: r.float(12, 55), peForward: r.float(10, 45), priceToBook: r.float(2, 30), eps: r.float(1, 30), beta: r.float(0.7, 2.1), dividendYield: r.float(0, 2.5), profitMargin: r.float(5, 45), grossMargin: r.float(30, 78), revenue: r.float(2e9, 9e10), revenueGrowth: r.float(-5, 60), roe: r.float(8, 90), week52High: price * r.float(1.05, 1.6), week52Low: price * r.float(0.5, 0.95), targetMean: price * r.float(1.0, 1.25) };
}

const recTone = (r?: string): "pos" | "warn" | "neg" | "default" => {
  if (!r) return "default";
  if (/strong_buy|buy|outperform/.test(r)) return "pos";
  if (/sell|underperform/.test(r)) return "neg";
  return "warn";
};

export function LiveFundamentals({ symbol = "NVDA" }: { symbol?: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<Fundamentals | null>(null);
  const [source, setSource] = useState("");
  const [updated, setUpdated] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await r.json()) as FundamentalsResponse;
      if (j.live) { setData(j.fundamentals); setSource(j.source); setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false })); setStatus("live"); }
      else setStatus("demo");
    } catch { setStatus("demo"); }
  }, [symbol]);

  useEffect(() => { load(); const id = setInterval(load, 300000); return () => clearInterval(id); }, [load]);

  const f = data ?? demoFor(symbol);

  return (
    <Panel>
      <PanelHeader
        title={`Key Statistics — ${f.name}`}
        sub={[f.sector, f.industry, f.exchange].filter((x) => x && x !== "—").join(" · ") || "Fundamental snapshot"}
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> connecting…</span>
          ) : status === "live" ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-pos" /></span>LIVE · {source}</span>
              <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
            </div>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn"><Icon name="warn" width={12} height={12} /> Demo · feed unreachable</span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="MKT CAP" value={money(f.marketCap)} sub="market value" icon={<Icon name="database" width={14} height={14} />} />
        <KpiCard label="P/E (TTM)" value={mult(f.peTrailing)} sub={f.peForward ? `Fwd ${mult(f.peForward)}` : "trailing"} icon={<Icon name="scale" width={14} height={14} />} />
        <KpiCard label="EPS (TTM)" value={px(f.eps)} sub="per share" tone="pos" icon={<Icon name="bolt" width={14} height={14} />} />
        <KpiCard label="DIV YIELD" value={perc(f.dividendYield)} sub="annual" icon={<Icon name="coins" width={14} height={14} />} />
        <KpiCard label="BETA" value={f.beta == null ? "—" : f.beta.toFixed(2)} sub="vs market" tone={f.beta && f.beta > 1.3 ? "warn" : undefined} icon={<Icon name="activity" width={14} height={14} />} />
        <KpiCard label="P/B" value={mult(f.priceToBook)} sub={f.pegRatio ? `PEG ${f.pegRatio.toFixed(2)}` : "price/book"} icon={<Icon name="layers" width={14} height={14} />} />
        <KpiCard label="PROFIT MGN" value={perc(f.profitMargin, 1)} sub={f.grossMargin ? `Gross ${perc(f.grossMargin, 0)}` : "net TTM"} tone="pos" icon={<Icon name="gauge" width={14} height={14} />} />
        <KpiCard label="52W RANGE" value={f.week52Low != null && f.week52High != null ? `${f.week52Low.toFixed(0)}–${f.week52High.toFixed(0)}` : "—"} sub="low – high" icon={<Icon name="wave" width={14} height={14} />} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-line px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="REVENUE TTM" value={money(f.revenue)} />
        <Stat label="REV GROWTH" value={perc(f.revenueGrowth, 1)} tone={f.revenueGrowth && f.revenueGrowth >= 0 ? "pos" : "neg"} />
        <Stat label="ROE" value={perc(f.roe, 1)} tone="accent" />
        <Stat label="OP MARGIN" value={perc(f.operatingMargin, 1)} />
        <Stat label="SHARES OUT" value={cnt(f.sharesOut)} />
        <Stat label="DEBT/EQUITY" value={f.debtToEquity == null ? "—" : f.debtToEquity.toFixed(1)} />
      </div>

      {(f.targetMean || f.recommendation) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="flex items-center gap-4">
            <Stat label="MEAN PT" value={px(f.targetMean)} tone="accent" />
            {f.targetHigh ? <Stat label="HIGH PT" value={px(f.targetHigh)} tone="pos" /> : null}
            {f.targetLow ? <Stat label="LOW PT" value={px(f.targetLow)} tone="neg" /> : null}
          </div>
          {f.recommendation ? <Chip tone={recTone(f.recommendation)}>{f.recommendation.replace(/_/g, " ").toUpperCase()}</Chip> : null}
        </div>
      )}
      <div className="border-t border-line px-4 py-2 text-2xs text-dim">
        Fundamentals via {status === "live" ? source : "Finnhub / FMP (keyed) or Yahoo (no key) on deploy"} · key stats only; deeper panels below are illustrative.
      </div>
    </Panel>
  );
}
