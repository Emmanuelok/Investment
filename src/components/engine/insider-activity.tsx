"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtInt, fmtUsd, fmtUsdCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  summarizeInsider,
  type InsiderTx,
  type InsiderSummary,
} from "@/lib/engine/insider";

/* ── Types matching /api/engine/insider ────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

type InsiderLive = {
  live: true;
  source: string;
  asOf: string;
  symbol: string;
  name: string;
  transactions: InsiderTx[];
  summary: InsiderSummary;
};
type InsiderResponse = InsiderLive | { live: false };

type ViewModel = {
  name: string;
  transactions: InsiderTx[];
  summary: InsiderSummary;
};

/* ── Presentation ──────────────────────────────────────────────────────────── */

const MAX_ROWS = 18;

const SIGNAL_TONE: Record<InsiderSummary["signal"], "pos" | "neg" | "warn" | undefined> = {
  "Net buying": "pos",
  "Net selling": "neg",
  Mixed: "warn",
  Neutral: undefined,
};

/** Action chip tone: open-market buys are the bullish signal, sells the bearish one. */
function actionTone(tx: InsiderTx): "pos" | "neg" | "default" {
  if (tx.isBuy) return "pos";
  if (tx.isSell) return "neg";
  return "default";
}

/** Color for buy/sell value emphasis; neutral routine actions stay dim. */
function valueClass(tx: InsiderTx): string {
  if (tx.isBuy) return "text-pos";
  if (tx.isSell) return "text-neg";
  return "text-muted";
}

/** Compact name list with truncation, e.g. "Huang Jen-Hsun, Kress Colette +2". */
function namesLabel(names: string[], max = 3): string {
  if (names.length === 0) return "—";
  const head = names.slice(0, max);
  const extra = names.length - head.length;
  return extra > 0 ? `${head.join(", ")} +${extra}` : head.join(", ");
}

/* ── Demo data (realistic NVDA-style Form 4 transactions) ──────────────────── */

function demoTransactions(): InsiderTx[] {
  const mk = (
    owner: string,
    title: string,
    date: string,
    code: string,
    action: string,
    isBuy: boolean,
    isSell: boolean,
    shares: number,
    price: number,
    sharesAfter: number | null,
  ): InsiderTx => ({
    owner,
    title,
    date,
    code,
    action,
    isBuy,
    isSell,
    shares,
    price,
    value: shares * price,
    sharesAfter,
  });

  return [
    mk("Huang Jen-Hsun", "President and CEO", "2026-06-12", "S", "Sell", false, true, 120_000, 131.42, 75_320_000),
    mk("Huang Jen-Hsun", "President and CEO", "2026-06-12", "M", "Exercise", false, false, 120_000, 0, 75_440_000),
    mk("Kress Colette M", "EVP and CFO", "2026-06-10", "S", "Sell", false, true, 18_500, 129.88, 412_900),
    mk("Kress Colette M", "EVP and CFO", "2026-06-10", "F", "Tax wh.", false, false, 6_240, 129.88, 419_140),
    mk("Coxe Tench", "Director", "2026-06-09", "P", "Buy", true, false, 4_000, 128.15, 41_220),
    mk("Teter Timothy S", "EVP, General Counsel", "2026-06-05", "S", "Sell", false, true, 9_750, 127.04, 286_410),
    mk("Dabiri John O", "Director", "2026-06-03", "A", "Grant", false, false, 1_280, 0, 22_460),
    mk("Shoquist Debora", "EVP, Operations", "2026-06-02", "S", "Sell", false, true, 12_300, 126.71, 298_540),
  ];
}

function buildDemo(): ViewModel {
  const transactions = demoTransactions();
  const summary = summarizeInsider(transactions);
  return { name: "NVIDIA Corporation", transactions, summary };
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function InsiderActivity({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [model, setModel] = useState<ViewModel | null>(null);
  const [source, setSource] = useState("");
  const [asOf, setAsOf] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/edgar/insider?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await r.json()) as InsiderResponse;
      if (j.live) {
        setModel({ name: j.name, transactions: j.transactions, summary: j.summary });
        setSource(j.source);
        setAsOf(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setModel(buildDemo());
        setStatus("demo");
      }
    } catch {
      setModel(buildDemo());
      setStatus("demo");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const m = model ?? buildDemo();
  const { name, summary } = m;
  const rows = useMemo(() => m.transactions.slice(0, MAX_ROWS), [m.transactions]);
  const hidden = m.transactions.length - rows.length;

  return (
    <Panel className="animate-rise" aria-label={`Insider activity for ${name}`}>
      <PanelHeader
        title={`Insider Activity — ${name}`}
        sub="SEC Form 4 open-market buys, sells & option activity — net insider signal"
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
                ENGINE · LIVE · {source}
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
              aria-label="Refresh insider activity"
            >
              ↻
            </button>
          </div>
        }
      />

      {!model && status === "loading" ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* 1 ── Summary deck */}
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            <div className="bg-panel px-4 py-3">
              <Stat
                label="Signal"
                value={summary.signal}
                tone={SIGNAL_TONE[summary.signal]}
              />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat
                label="Net value"
                value={`${summary.netValue >= 0 ? "+" : "-"}${fmtUsdCompact(Math.abs(summary.netValue))}`}
                tone={summary.netValue > 0 ? "pos" : summary.netValue < 0 ? "neg" : undefined}
              />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Buy value" value={fmtUsdCompact(summary.buyValue)} tone={summary.buyValue > 0 ? "pos" : "muted"} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Sell value" value={fmtUsdCompact(summary.sellValue)} tone={summary.sellValue > 0 ? "neg" : "muted"} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat
                label="Transactions"
                value={
                  <span>
                    <span className="text-pos">{summary.buyCount}</span> buys{" "}
                    <span className="text-faint">·</span> <span className="text-neg">{summary.sellCount}</span> sells
                  </span>
                }
              />
            </div>
          </div>

          {/* 2 ── Distinct participants */}
          <div className="grid gap-px border-b border-line bg-line sm:grid-cols-2">
            <div className="bg-panel px-4 py-3">
              <div className="kpi-label mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-pos" /> Buyers ({summary.buyers.length})
              </div>
              {summary.buyers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {summary.buyers.slice(0, 6).map((b) => (
                    <Chip key={b} tone="pos">{b}</Chip>
                  ))}
                  {summary.buyers.length > 6 ? <span className="font-mono text-2xs text-dim">+{summary.buyers.length - 6}</span> : null}
                </div>
              ) : (
                <span className="font-mono text-2xs text-dim">No open-market buyers</span>
              )}
            </div>
            <div className="bg-panel px-4 py-3">
              <div className="kpi-label mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-neg" /> Sellers ({summary.sellers.length})
              </div>
              {summary.sellers.length > 0 ? (
                <div className="truncate font-mono text-xs text-muted" title={summary.sellers.join(", ")}>
                  {namesLabel(summary.sellers, 4)}
                </div>
              ) : (
                <span className="font-mono text-2xs text-dim">No sellers</span>
              )}
            </div>
          </div>

          {/* 3 ── Transactions table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Owner</Th>
                  <Th>Action</Th>
                  <Th right>Shares</Th>
                  <Th right>Price</Th>
                  <Th right>Value</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx, i) => (
                  <tr key={`${tx.owner}-${tx.date}-${tx.code}-${i}`} className="hover:bg-elevated/40">
                    <Td className="text-muted whitespace-nowrap">{tx.date || "—"}</Td>
                    <Td mono={false}>
                      <div className="font-medium text-ink">{tx.owner}</div>
                      {tx.title ? <div className="font-mono text-2xs text-dim">{tx.title}</div> : null}
                    </Td>
                    <Td mono={false}>
                      <Chip tone={actionTone(tx)}>
                        {tx.action}
                        <span className="ml-1 text-faint">{tx.code}</span>
                      </Chip>
                    </Td>
                    <Td right className="text-ink">{fmtInt(tx.shares)}</Td>
                    <Td right className={tx.price > 0 ? "text-muted" : "text-faint"}>
                      {tx.price > 0 ? fmtUsd(tx.price) : "—"}
                    </Td>
                    <Td right className={cn("font-medium", valueClass(tx))}>
                      {tx.value > 0 ? fmtUsdCompact(tx.value) : "—"}
                    </Td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <Td colSpan={6} className="text-center text-dim">No Form 4 transactions on record.</Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {hidden > 0 ? (
            <div className="border-t border-line px-4 py-2 font-mono text-2xs text-dim">+{hidden} more transaction{hidden === 1 ? "" : "s"} not shown</div>
          ) : null}
        </>
      )}

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Open-market buys (code P) are the highest-signal insider action; routine sells (S), option exercises (M/X) and
        tax-withholding (F) are lower signal. Source: SEC EDGAR Form 4.
      </div>
    </Panel>
  );
}
