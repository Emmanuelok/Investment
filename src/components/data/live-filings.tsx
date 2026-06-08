"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td } from "@/components/ui/kit";
import { cn } from "@/lib/cn";
import type { EdgarResponse, EdgarError, FilingEntry } from "@/app/api/edgar/route";

// ─── Demo snapshot (shown when live fetch fails) ───────────────────────────

const DEMO_FILINGS: FilingEntry[] = [
  { form: "10-K", company: "Apple Inc.", title: "10-K - Apple Inc.", date: "2024-11-01", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AAPL&type=10-K" },
  { form: "10-Q", company: "Microsoft Corp.", title: "10-Q - Microsoft Corp.", date: "2024-10-30", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=MSFT&type=10-Q" },
  { form: "8-K", company: "Nvidia Corp.", title: "8-K - Nvidia Corp.", date: "2024-10-29", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=NVDA&type=8-K" },
  { form: "S-1", company: "Acme Biotech Inc.", title: "S-1 - Acme Biotech Inc.", date: "2024-10-28", href: "https://www.sec.gov/" },
  { form: "DEF 14A", company: "Alphabet Inc.", title: "DEF 14A - Alphabet Inc.", date: "2024-10-25", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=GOOGL&type=DEF+14A" },
  { form: "Form 4", company: "Jensen Huang / Nvidia", title: "Form 4 - Jensen Huang (Nvidia)", date: "2024-10-24", href: "https://www.sec.gov/" },
  { form: "10-Q", company: "Amazon.com Inc.", title: "10-Q - Amazon.com Inc.", date: "2024-10-24", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AMZN&type=10-Q" },
  { form: "8-K", company: "Tesla Inc.", title: "8-K - Tesla Inc.", date: "2024-10-23", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TSLA&type=8-K" },
  { form: "10-K", company: "Meta Platforms Inc.", title: "10-K - Meta Platforms Inc.", date: "2024-10-22", href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=META&type=10-K" },
  { form: "S-1", company: "Horizon Ventures LLC", title: "S-1 - Horizon Ventures LLC", date: "2024-10-21", href: "https://www.sec.gov/" },
];

// ─── Form-type chip colours (matching filings page conventions) ────────────

const FORM_CHIP_CLASS: Record<string, string> = {
  "10-K":    "chip-accent",
  "10-Q":    "border-info/30 bg-info/10 text-info",
  "8-K":     "chip-warn",
  "S-1":     "border-ai/30 bg-ai/10 text-ai",
  "DEF 14A": "chip-pos",
  "Form 4":  "border-neg/30 bg-neg/10 text-neg",
};

function FormChip({ form }: { form: string }) {
  const cls = FORM_CHIP_CLASS[form] ?? "";
  return <span className={cn("chip", cls)}>{form}</span>;
}

// ─── Feed status badge ─────────────────────────────────────────────────────

type FeedState = "live" | "connecting" | "demo";

function FeedBadge({ status, source }: { status: FeedState; source: string }) {
  const map = {
    live:       { dot: "bg-pos", text: "text-pos",  label: `LIVE · ${source}` },
    connecting: { dot: "bg-warn animate-pulse-soft", text: "text-warn", label: "CONNECTING…" },
    demo:       { dot: "bg-warn", text: "text-warn", label: "DEMO · source unreachable" },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-line px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider",
        map.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", map.dot, status === "live" && "animate-pulse-soft")} />
      {map.label}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

type ApiResult = EdgarResponse | EdgarError;

export function LiveFilings() {
  const [state, setState] = useState<FeedState>("connecting");
  const [filings, setFilings] = useState<FilingEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/edgar")
      .then((r) => r.json() as Promise<ApiResult>)
      .then((json) => {
        if (cancelled) return;
        if (json.live) {
          setFilings((json as EdgarResponse).filings);
          setState("live");
        } else {
          setFilings(DEMO_FILINGS);
          setState("demo");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilings(DEMO_FILINGS);
          setState("demo");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = filings.length > 0 ? filings : state === "connecting" ? [] : DEMO_FILINGS;

  return (
    <Panel glow={state === "live"}>
      <PanelHeader
        title="Live Filings Feed — SEC EDGAR"
        sub="Latest submissions · SEC EDGAR current feed · revalidates hourly"
        right={
          <div className="flex items-center gap-2">
            {state === "connecting" ? (
              <span className="font-mono text-2xs text-dim animate-pulse-soft">fetching…</span>
            ) : (
              <FeedBadge status={state} source="SEC EDGAR" />
            )}
          </div>
        }
      />

      {/* Loading skeleton */}
      {state === "connecting" && (
        <div className="flex items-center justify-center py-8">
          <span className="font-mono text-xs text-dim animate-pulse-soft">
            Loading EDGAR filings feed…
          </span>
        </div>
      )}

      {/* Filings table */}
      {state !== "connecting" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                <Th>Form</Th>
                <Th>Company</Th>
                <Th right>Date</Th>
                <Th right>Link</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={i} className="group hover:bg-elevated/40">
                  <Td mono={false}>
                    <FormChip form={f.form} />
                  </Td>
                  <Td mono={false} className="max-w-[360px] truncate text-ink">
                    {f.company}
                  </Td>
                  <Td right className="text-muted whitespace-nowrap">
                    {f.date}
                  </Td>
                  <Td right>
                    {f.href ? (
                      <a
                        href={f.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        EDGAR ↗
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-faint">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <span className="font-mono text-xs text-dim">
              {state === "live"
                ? `${rows.length} filings · live from SEC EDGAR`
                : `${rows.length} filings · demo snapshot`}
            </span>
            {state === "demo" && (
              <Chip tone="warn">DEMO DATA</Chip>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
