"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Th, Td, Ticker } from "@/components/ui/kit";
import { signClass, fmtNum, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";

/* ── Universe ──────────────────────────────────────────────────────────────── */

const UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AVGO",
  "AMD",  "NFLX", "CRM",  "ORCL", "ADBE", "QCOM",  "MU",   "INTC",
  "PLTR", "SMCI", "MSTR", "COIN", "UBER", "DELL",  "ARM",  "MRVL",
  "JPM",  "BAC",  "GS",   "V",    "MA",   "UNH",   "LLY",  "XOM",
  "CVX",  "LMT",  "RTX",  "CAT",
] as const;

/* ── Names (matches route.ts NAMES table) ──────────────────────────────────── */

const NAMES: Record<string, string> = {
  AAPL: "Apple",               MSFT: "Microsoft",          NVDA: "NVIDIA",
  AMZN: "Amazon",              META: "Meta Platforms",     GOOGL: "Alphabet",
  TSLA: "Tesla",               AVGO: "Broadcom",           AMD: "Advanced Micro Devices",
  NFLX: "Netflix",             CRM:  "Salesforce",         ORCL: "Oracle",
  ADBE: "Adobe",               QCOM: "Qualcomm",           MU:   "Micron",
  INTC: "Intel",               PLTR: "Palantir",           SMCI: "Super Micro",
  MSTR: "MicroStrategy",       COIN: "Coinbase",           UBER: "Uber",
  DELL: "Dell",                ARM:  "Arm Holdings",       MRVL: "Marvell",
  JPM:  "JPMorgan",            BAC:  "Bank of America",    GS:   "Goldman Sachs",
  V:    "Visa",                MA:   "Mastercard",         UNH:  "UnitedHealth",
  LLY:  "Eli Lilly",           XOM:  "Exxon Mobil",        CVX:  "Chevron",
  LMT:  "Lockheed Martin",     RTX:  "RTX Corp",           CAT:  "Caterpillar",
};

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Status = "loading" | "live" | "demo";
type SortDir = "gainers" | "losers";
type Filter = "all" | "adv" | "dec";

interface QuoteRow {
  sym: string;
  name: string;
  price: number;
  chg: number;
  chgPct: number;
  vol: string;
  mktcap: string;
}

interface QuoteResponse {
  live: true;
  source: string;
  asOf: string;
  quotes: QuoteRow[];
}

interface QuoteFailed {
  live: false;
}

type QuoteAPIResponse = QuoteResponse | QuoteFailed;

/* ── Demo data synthesis ───────────────────────────────────────────────────── */

// Realistic-ish seed prices for the demo (avoids wildly implausible numbers)
const SEED_PRICES: Record<string, number> = {
  AAPL: 211, MSFT: 415, NVDA: 875, AMZN: 196, META: 530, GOOGL: 178,
  TSLA: 175, AVGO: 168, AMD: 155,  NFLX: 660, CRM:  292, ORCL: 130,
  ADBE: 468, QCOM: 175, MU:  105,  INTC:  31, PLTR:  24, SMCI:  47,
  MSTR: 165, COIN: 225, UBER:  72, DELL:  88, ARM:  125, MRVL:  73,
  JPM:  220, BAC:   41, GS:  492,  V:    278, MA:   473, UNH:  580,
  LLY:  883, XOM:  117, CVX:  152, LMT:  582, RTX:  123, CAT:  354,
};

function buildDemoRows(): QuoteRow[] {
  return UNIVERSE.map((sym) => {
    const rng = new Rng(sym + "-screener-demo");
    const base = SEED_PRICES[sym] ?? 100;
    const chgPct = rng.float(-6, 6);
    const price = parseFloat((base * (1 + chgPct / 100)).toFixed(2));
    const chg = parseFloat((price - base).toFixed(2));

    // Synthesise plausible volume string
    const volRaw = rng.float(1e6, 120e6);
    const vol =
      volRaw >= 1e9
        ? (volRaw / 1e9).toFixed(1) + "B"
        : volRaw >= 1e6
          ? (volRaw / 1e6).toFixed(1) + "M"
          : (volRaw / 1e3).toFixed(0) + "K";

    // Synthesise market cap (very rough, just for display)
    const mcRaw = rng.float(20e9, 3500e9);
    const mktcap =
      mcRaw >= 1e12
        ? (mcRaw / 1e12).toFixed(2) + "T"
        : mcRaw >= 1e9
          ? (mcRaw / 1e9).toFixed(1) + "B"
          : (mcRaw / 1e6).toFixed(0) + "M";

    return { sym, name: NAMES[sym] ?? sym, price, chg, chgPct, vol, mktcap };
  });
}

const DEMO_ROWS = buildDemoRows();

/* ── Component ─────────────────────────────────────────────────────────────── */

export function LiveScreener() {
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<QuoteRow[]>(DEMO_ROWS);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");

  // Controls
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("gainers");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/quote?symbols=${UNIVERSE.join(",")}`, {
        cache: "no-store",
      });
      const j = (await r.json()) as QuoteAPIResponse;
      if (j.live) {
        setRows(j.quotes);
        setSource(j.source);
        setUpdated(
          new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }),
        );
        setStatus("live");
      } else {
        setRows(DEMO_ROWS);
        setStatus("demo");
      }
    } catch {
      setRows(DEMO_ROWS);
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  /* ── Filtered + sorted view ─────────────────────────────────────────────── */

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((row) => {
      if (q && !row.sym.toLowerCase().includes(q) && !row.name.toLowerCase().includes(q))
        return false;
      if (filter === "adv" && row.chgPct <= 0) return false;
      if (filter === "dec" && row.chgPct >= 0) return false;
      return true;
    });
    out = [...out].sort((a, b) =>
      sortDir === "gainers" ? b.chgPct - a.chgPct : a.chgPct - b.chgPct,
    );
    return out;
  }, [rows, search, sortDir, filter]);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  const statusBadge = (
    <>
      {status === "loading" ? (
        <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" />
          connecting…
        </span>
      ) : status === "live" ? (
        <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
          </span>
          LIVE · {source}
          <span className="ml-1 text-dim">as of {updated}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          DEMO · live feed unreachable
        </span>
      )}
    </>
  );

  return (
    <Panel>
      <PanelHeader
        title="Live Stock Screener"
        sub={`${UNIVERSE.length}-symbol liquid universe · mega-cap &amp; popular`}
        right={statusBadge}
      />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol or name…"
          className="h-7 w-48 rounded border border-line bg-elevated px-2.5 font-mono text-xs text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none"
        />

        {/* Sort toggle */}
        <div className="flex rounded border border-line overflow-hidden">
          <button
            onClick={() => setSortDir("gainers")}
            className={cn(
              "px-3 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
              sortDir === "gainers"
                ? "bg-pos/15 text-pos"
                : "text-dim hover:text-ink",
            )}
          >
            Top Gainers ▲
          </button>
          <button
            onClick={() => setSortDir("losers")}
            className={cn(
              "px-3 py-1 font-mono text-2xs uppercase tracking-wider border-l border-line transition-colors",
              sortDir === "losers"
                ? "bg-neg/15 text-neg"
                : "text-dim hover:text-ink",
            )}
          >
            Top Losers ▼
          </button>
        </div>

        {/* Advancers / decliners / all */}
        <div className="flex rounded border border-line overflow-hidden">
          {(
            [
              ["all", "All"],
              ["adv", "Advancers"],
              ["dec", "Decliners"],
            ] as [Filter, string][]
          ).map(([val, label], i) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={cn(
                "px-3 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
                i > 0 && "border-l border-line",
                filter === val
                  ? val === "adv"
                    ? "bg-pos/15 text-pos"
                    : val === "dec"
                      ? "bg-neg/15 text-neg"
                      : "bg-accent/15 text-accent"
                  : "text-dim hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Live count */}
        <span className="ml-auto font-mono text-2xs text-dim tabular-nums">
          {visible.length} of {UNIVERSE.length} shown
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <Th>Symbol</Th>
              <Th right>Last</Th>
              <Th right>Chg %</Th>
              <Th right>Volume</Th>
              <Th right>Mkt Cap</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.sym} className="group hover:bg-elevated/40">
                <Td mono={false}>
                  <Ticker sym={row.sym} name={row.name} />
                </Td>
                <Td right className="text-ink">
                  {fmtNum(row.price)}
                </Td>
                <Td right className={cn("font-medium", signClass(row.chgPct))}>
                  {fmtSignedPct(row.chgPct)}
                </Td>
                <Td right className="text-muted">
                  {row.vol}
                </Td>
                <Td right className="text-muted">
                  {row.mktcap}
                </Td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="border-b border-line/60 px-3 py-6 text-center font-mono text-xs text-dim"
                >
                  No symbols match current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-2xs text-faint">
        <span>
          {UNIVERSE.length}-symbol universe · refreshes every 30s
        </span>
        <span>
          {status === "live"
            ? `source: ${source}`
            : status === "demo"
              ? "demo data · deterministic seed"
              : "…"}
        </span>
      </div>
    </Panel>
  );
}
