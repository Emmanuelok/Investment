import Link from "next/link";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Chip,
  KpiCard,
  Th,
  Td,
  Ticker,
  StatusDot,
} from "@/components/ui/kit";
import { Sparkline, MiniBars, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight } from "@/components/icons";
import { WEB_SIGNALS, DEMAND_NOWCAST } from "@/lib/data/argus";
import { fmtSignedPct, fmtCompact, fmtNum, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Web Signals" };

const FLAG_TONE: Record<string, "pos" | "warn" | "neg" | "default"> = {
  ACCEL: "pos",
  FLAT: "default",
  DECEL: "warn",
  ROLLOVER: "neg",
};

const accelerators = WEB_SIGNALS.filter((s) => s.demandFlag === "ACCEL").length;
const decelerators = WEB_SIGNALS.filter((s) => s.demandFlag === "DECEL" || s.demandFlag === "ROLLOVER").length;
const hiringAccel = WEB_SIGNALS.filter((s) => s.hiringFlag === "ACCEL").length;
const avgSearchIdx = Math.round(WEB_SIGNALS.reduce((s, r) => s + r.searchInterest, 0) / WEB_SIGNALS.length);

export default function WebSignalsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Web Signals — Thinknum Family"
        desc="Job-postings, web traffic, app-store rankings, and search interest — per-company demand nowcasting from public web data."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-dim">Thinknum · 1 seat licensed</span>
            <Link href="/signals" className="btn">
              ← All Signals
            </Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Accelerating Entities"
          value={String(accelerators)}
          sub="demand flag = ACCEL"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Decelerating / Rollover"
          value={String(decelerators)}
          sub="DECEL or ROLLOVER flag"
          icon={<Icon name="gauge" width={15} height={15} />}
          tone="neg"
        />
        <KpiCard
          label="Hiring Accelerators"
          value={String(hiringAccel)}
          sub="job postings growing MoM"
          icon={<Icon name="target" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Avg Search Index"
          value={String(avgSearchIdx)}
          sub="Google Trends normalized 0–100"
          icon={<Icon name="search" width={15} height={15} />}
        />
      </div>

      {/* Main web signals table */}
      <Panel>
        <PanelHeader
          title="Web Signal Dashboard — All Tracked Entities"
          sub="Thinknum / public web scrape · as_of 2025-06-06 09:30 ET · point-in-time · no revisions back-applied"
          right={<Chip tone="accent">Thinknum sourced</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th right>Hiring MoM</Th>
                <Th right>Open Roles</Th>
                <Th right>Hiring 12W</Th>
                <Th right>Web Traffic YoY</Th>
                <Th right>Traffic 12W</Th>
                <Th right>App Rank Δ</Th>
                <Th right>App Rank 12W</Th>
                <Th right>Search Idx</Th>
                <Th right>Search 4W</Th>
                <Th right>Search Trend</Th>
                <Th>Demand</Th>
              </tr>
            </thead>
            <tbody>
              {WEB_SIGNALS.map((row) => (
                <tr key={row.sym} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false}>
                    <Ticker sym={row.sym} name={row.name} />
                  </Td>
                  <Td right className={signClass(row.hiringTrend)}>
                    {fmtSignedPct(row.hiringTrend, 1)}
                  </Td>
                  <Td right className="text-muted">
                    {fmtCompact(row.hiringAbs, 0)}
                  </Td>
                  <Td right>
                    <Sparkline data={row.hiringSpark} width={70} height={22} />
                  </Td>
                  <Td right className={signClass(row.webTrafficTrend)}>
                    {fmtSignedPct(row.webTrafficTrend, 1)}
                  </Td>
                  <Td right>
                    <Sparkline data={row.trafficSpark} width={70} height={22} />
                  </Td>
                  <Td
                    right
                    className={row.appRankDelta > 0 ? "text-pos" : row.appRankDelta < 0 ? "text-neg" : "text-muted"}
                  >
                    {row.appRankDelta > 0 ? `+${row.appRankDelta}` : String(row.appRankDelta)}
                  </Td>
                  <Td right>
                    <Sparkline data={row.appSpark} width={70} height={22} />
                  </Td>
                  <Td right className="text-muted">
                    {row.searchInterest}
                  </Td>
                  <Td right className={signClass(row.searchTrend)}>
                    {fmtSignedPct(row.searchTrend, 1)}
                  </Td>
                  <Td right>
                    <Sparkline data={row.searchSpark} width={70} height={22} />
                  </Td>
                  <Td>
                    <Chip tone={FLAG_TONE[row.demandFlag]}>{row.demandFlag}</Chip>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          App Rank Δ: positive = rank number decreased (improved). Traffic and hiring sourced from
          Thinknum web scrapes. Search from Google Trends (normalized 0–100). All series point-in-time
          — no revision applied after as_of timestamp.
        </div>
      </Panel>

      {/* Spotlight cards: top acceleration / deceleration stories */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel glow>
          <PanelHeader title="NVDA — Hiring Acceleration" right={<Chip tone="pos">ACCEL</Chip>} />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <Ticker sym="NVDA" name="NVIDIA Corp" />
              <span className="font-mono text-sm font-semibold text-pos">+28.4% MoM</span>
            </div>
            <Sparkline data={WEB_SIGNALS.find((s) => s.sym === "NVDA")!.hiringSpark} width={260} height={40} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="section-label">Open Roles</div>
                <div className="font-mono text-ink">3,412</div>
              </div>
              <div>
                <div className="section-label">Web Traffic YoY</div>
                <div className="font-mono text-pos">+41.2%</div>
              </div>
              <div>
                <div className="section-label">Search Index</div>
                <div className="font-mono text-ink">88 / 100</div>
              </div>
              <div>
                <div className="section-label">Search 4W Trend</div>
                <div className="font-mono text-pos">+14.2%</div>
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Job postings skewed toward CUDA runtime, inference-infra, and datacenter-deployment
              roles. Coincides with server-OEM shipping data uptick. Cross-referenced with patent
              filings (NLP family).
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="ELF — App + Search Decelerating" right={<Chip tone="warn">DECEL</Chip>} />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <Ticker sym="ELF" name="e.l.f. Beauty" />
              <span className="font-mono text-sm font-semibold text-neg">–11.4% 4W search</span>
            </div>
            <Sparkline data={WEB_SIGNALS.find((s) => s.sym === "ELF")!.searchSpark} width={260} height={40} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="section-label">App Rank Δ</div>
                <div className="font-mono text-neg">–7 positions</div>
              </div>
              <div>
                <div className="section-label">Web Traffic YoY</div>
                <div className="font-mono text-neg">–8.3%</div>
              </div>
              <div>
                <div className="section-label">Hiring MoM</div>
                <div className="font-mono text-neg">–4.1%</div>
              </div>
              <div>
                <div className="section-label">Demand Flag</div>
                <div className="font-mono text-warn">DECEL</div>
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              App-store rank slippage across iOS and Android consistent for 7 consecutive days.
              Search interest deceleration aligns with web-traffic decline. Consistent with
              composite thesis (z = –1.82).
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="CVNA — Traffic Rollover" right={<Chip tone="neg">ROLLOVER</Chip>} />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <Ticker sym="CVNA" name="Carvana Co" />
              <span className="font-mono text-sm font-semibold text-neg">–12.7% traffic</span>
            </div>
            <Sparkline data={WEB_SIGNALS.find((s) => s.sym === "CVNA")!.trafficSpark} width={260} height={40} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="section-label">Hiring MoM</div>
                <div className="font-mono text-neg">–6.8%</div>
              </div>
              <div>
                <div className="section-label">Search 4W</div>
                <div className="font-mono text-neg">–7.8%</div>
              </div>
              <div>
                <div className="section-label">App Rank Δ</div>
                <div className="font-mono text-neg">–4 positions</div>
              </div>
              <div>
                <div className="section-label">Demand Flag</div>
                <div className="font-mono text-neg">ROLLOVER</div>
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              All three web proxies rolling over simultaneously. Aligns with insider Form 4 selling
              (CEO –120,000 sh) from the Disclosure family. Cross-family fusion z = –2.13.
            </p>
          </div>
        </Panel>
      </div>

      {/* Demand nowcast panel */}
      <Panel>
        <PanelHeader
          title="Demand Nowcast — Web-Derived Revenue / Unit Estimates"
          sub="Regression from web signals onto consensus · not an official forecast · demo estimates"
          right={<Chip tone="ai">Nowcast model</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th>Metric</Th>
                <Th right>Web Estimate ($B / units)</Th>
                <Th right>Street Consensus</Th>
                <Th right>Implied Surprise</Th>
                <Th right>Coverage bar</Th>
              </tr>
            </thead>
            <tbody>
              {DEMAND_NOWCAST.map((n) => (
                <tr key={n.sym} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false}>
                    <Ticker sym={n.sym} />
                  </Td>
                  <Td mono={false} className="text-xs text-muted">
                    {n.label}
                  </Td>
                  <Td right className="font-semibold text-ink">
                    {Math.abs(n.estimate) > 10 ? fmtCompact(n.estimate, 0) : fmtNum(n.estimate, 2)}
                  </Td>
                  <Td right className="text-muted">
                    {Math.abs(n.consensus) > 10 ? fmtCompact(n.consensus, 0) : fmtNum(n.consensus, 2)}
                  </Td>
                  <Td right className={signClass(n.surprise)}>
                    {fmtSignedPct(n.surprise, 1)}
                  </Td>
                  <Td right>
                    <ProgressBar
                      value={Math.abs(n.surprise)}
                      max={15}
                      color={n.surprise >= 0 ? "var(--pos)" : "var(--neg)"}
                      height={6}
                      className="w-24"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
          <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-warn" />
          <span>
            Nowcast estimates are web-signal regressions against trailing earnings — not licensed
            sell-side models. For guidance, not investment decisions. Surprise % = (est − consensus)
            / |consensus| × 100. Negative TGT comparable is a percent-point figure.
          </span>
        </div>
      </Panel>

      {/* Hiring acceleration breakdown */}
      <Panel>
        <PanelHeader
          title="Hiring Trend — Open Roles MoM Change"
          sub="Based on LinkedIn, Indeed, Glassdoor aggregates via Thinknum · 30-day as_of window"
          right={<Chip tone="info">Thinknum sourced</Chip>}
        />
        <div className="space-y-3 px-4 py-4">
          {WEB_SIGNALS.slice().sort((a, b) => b.hiringTrend - a.hiringTrend).map((row) => (
            <div key={row.sym} className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <Ticker sym={row.sym} name={row.name} />
              </div>
              <div className="flex-1">
                <ProgressBar
                  value={Math.abs(row.hiringTrend)}
                  max={35}
                  color={row.hiringTrend >= 0 ? "var(--pos)" : "var(--neg)"}
                  height={7}
                />
              </div>
              <span
                className={cn(
                  "w-20 shrink-0 text-right font-mono text-xs",
                  signClass(row.hiringTrend)
                )}
              >
                {fmtSignedPct(row.hiringTrend, 1)}
              </span>
              <Chip tone={FLAG_TONE[row.hiringFlag]}>{row.hiringFlag}</Chip>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
