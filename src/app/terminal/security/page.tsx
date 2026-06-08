import { PageHeader, Panel, PanelHeader, Chip, Stat, Th, Td, Ticker, KpiCard } from "@/components/ui/kit";
import { LiveCandleChart } from "@/components/markets/live-candle-chart";
import { LiveStat } from "@/components/live/live-stat";
import { Sparkline, ProgressBar, Ring } from "@/components/ui/viz";
import { Candles } from "@/components/ui/candles";
import { Icon } from "@/components/icon-map";
import { signClass, fmtSignedPct, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  NVDA_CANDLES,
  ANALYST_ESTIMATES,
  NVDA_NEWS,
  NVDA_PEERS,
} from "@/lib/data/obsidian";
import { priceWalk } from "@/lib/rng";
import { SecurityChart } from "@/components/charts/security-chart";

export const metadata = { title: "NVDA Security DES — OBSIDIAN Terminal" };

const NVDA_SPARK = priceWalk("NVDA-spark-des", 60, 82, 0.028, 0.0018);

export default function SecurityDesPage() {
  const lastPrice = 128.47;
  const chgPct = 4.72;
  const analystBull = 38;
  const analystHold = 8;
  const analystBear = 2;
  const totalAnalysts = analystBull + analystHold + analystBear;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Security Description — DES"
        desc="Bloomberg DES replica. Full fundamental, ownership, estimate, and news deep-dive for a single name."
        right={
          <div className="flex items-center gap-2">
            <Ticker sym="NVDA" name="NVIDIA Corporation" />
            <Chip tone="pos">{fmtSignedPct(chgPct)}</Chip>
          </div>
        }
      />

      <LiveCandleChart symbol="NVDA" title="NVDA — Live" />

      <SecurityChart seed="NVDA-des" base={128} vol={0.028} label="NVDA" />

      {/* Header price block */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="LAST PRICE" value={`$${fmtNum(lastPrice)}`} tone="pos" sub={`+$${(lastPrice * chgPct / 100).toFixed(2)} today`} icon={<Icon name="candle" width={14} height={14} />} className="xl:col-span-2" />
        <KpiCard label="MKT CAP" value={<LiveStat value={3.15} prefix="$" suffix="T" decimals={2} vol={0.004} />} sub="Fully diluted" icon={<Icon name="database" width={14} height={14} />} />
        <KpiCard label="P/E (TTM)" value={<LiveStat value={43.2} suffix="x" decimals={1} vol={0.006} />} sub="Fwd P/E 37.4x" icon={<Icon name="scale" width={14} height={14} />} />
        <KpiCard label="EPS (TTM)" value={<LiveStat value={29.76} prefix="$" decimals={2} vol={0.004} />} sub="FY2025E $41.8" tone="pos" icon={<Icon name="bolt" width={14} height={14} />} />
        <KpiCard label="DIV YIELD" value={<LiveStat value={0.03} suffix="%" decimals={2} vol={0.02} />} sub="$0.04/qtr" icon={<Icon name="coins" width={14} height={14} />} />
        <KpiCard label="BETA (1Y)" value={<LiveStat value={1.84} decimals={2} vol={0.004} />} sub="vs S&P 500" tone="warn" icon={<Icon name="activity" width={14} height={14} />} />
        <KpiCard label="SHORT INT" value={<LiveStat value={1.2} suffix="%" decimals={1} vol={0.006} />} sub="2.4D to cover" icon={<Icon name="target" width={14} height={14} />} />
      </div>

      {/* Price chart + company description */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="NVDA — Price History · 180D Daily"
            sub="Demo snapshot · SMA-20 overlay · live candles via HELIOS when enabled"
            right={
              <div className="flex gap-2">
                <Chip>SMA 20</Chip>
                <Chip tone="accent">180D</Chip>
              </div>
            }
          />
          <div className="p-3">
            <Candles data={NVDA_CANDLES} width={720} height={280} volume sma={20} />
          </div>
          <div className="grid grid-cols-4 divide-x divide-line border-t border-line">
            {[
              { label: "52W HIGH", value: "$140.76" },
              { label: "52W LOW", value: "$47.32" },
              { label: "ADV (30D)", value: "218.4M" },
              { label: "SHARES OUT", value: "24.53B" },
            ].map((s) => (
              <div key={s.label} className="px-3 py-2.5">
                <div className="kpi-label">{s.label}</div>
                <div className="mt-1 font-mono text-sm text-ink">{s.value}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Company Description" right={<Chip>DES</Chip>} />
          <div className="space-y-3 px-4 py-4 text-sm text-muted leading-relaxed">
            <p>
              <span className="font-semibold text-ink">NVIDIA Corporation (NVDA)</span> designs and sells graphics processing units (GPUs), system-on-chip (SoC) units, and related software. Founded 1993, headquartered in Santa Clara, CA.
            </p>
            <p>
              NVIDIA operates through two reportable segments: <span className="text-ink">Compute & Networking</span> (data center AI, HPC, automotive) and <span className="text-ink">Graphics</span> (gaming, professional visualization). The data center segment, powered by H100/H200 and upcoming Blackwell GPUs, has become the primary growth driver — representing ~87% of FY2024 revenue.
            </p>
            <p>
              The company&apos;s CUDA software ecosystem, built over 16 years, creates significant switching costs for AI/ML workloads and is widely considered the primary competitive moat.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-line px-4 py-3">
            <Stat label="SECTOR" value="Semiconductors" mono={false} />
            <Stat label="INDUSTRY" value="GPU / AI Silicon" mono={false} />
            <Stat label="EXCHANGE" value="Nasdaq" mono={false} />
            <Stat label="CIK" value="1045810" />
            <Stat label="FOUNDED" value="1993" />
            <Stat label="EMPLOYEES" value="29,600" />
          </div>
          {/* Analyst consensus ring */}
          <div className="border-t border-line px-4 py-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-widest text-dim">Analyst Consensus</div>
            <div className="flex items-center gap-5">
              <Ring
                value={analystBull}
                max={totalAnalysts}
                size={72}
                stroke={7}
                color="var(--pos)"
                label="BUY"
                sub={`${analystBull}/${totalAnalysts}`}
              />
              <div className="flex-1 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-pos">Buy / Outperform</span>
                    <span className="font-mono text-pos">{analystBull}</span>
                  </div>
                  <ProgressBar value={analystBull} max={totalAnalysts} color="var(--pos)" height={5} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted">Hold / Neutral</span>
                    <span className="font-mono text-muted">{analystHold}</span>
                  </div>
                  <ProgressBar value={analystHold} max={totalAnalysts} color="var(--warn)" height={5} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-neg">Sell / Underperform</span>
                    <span className="font-mono text-neg">{analystBear}</span>
                  </div>
                  <ProgressBar value={analystBear} max={totalAnalysts} color="var(--neg)" height={5} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <Stat label="MEAN PT" value={<LiveStat value={148.20} prefix="$" decimals={2} vol={0.002} />} tone="accent" />
              <Stat label="HIGH PT" value={<LiveStat value={220.00} prefix="$" decimals={2} vol={0.002} />} tone="pos" />
              <Stat label="LOW PT" value={<LiveStat value={80.00} prefix="$" decimals={2} vol={0.002} />} tone="neg" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Valuation + Ownership */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Valuation Snapshot" right={<Chip>TTM / NTM</Chip>} />
          <div className="grid grid-cols-2 gap-px bg-line">
            {[
              { label: "P/E (TTM)", value: "43.2x", vs: "Sector 38.1x" },
              { label: "Fwd P/E (NTM)", value: "37.4x", vs: "Sector 32.4x" },
              { label: "EV/EBITDA", value: "38.8x", vs: "Sector 28.4x" },
              { label: "EV/Revenue", value: "23.8x", vs: "Sector 11.2x" },
              { label: "P/FCF", value: "52.1x", vs: "FCF yield 1.92%" },
              { label: "P/Book", value: "37.6x", vs: "ROE 87.1%" },
              { label: "PEG Ratio", value: "0.42", vs: "PEG < 1 = value" },
              { label: "Mkt Cap/FCF", value: "51.3x", vs: "FCF $61.4B TTM" },
            ].map((v) => (
              <div key={v.label} className="bg-panel px-3 py-2.5">
                <div className="kpi-label">{v.label}</div>
                <div className="mt-1 font-mono text-base text-ink">{v.value}</div>
                <div className="mt-0.5 text-2xs text-dim">{v.vs}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Ownership & Short Interest" />
          <div className="space-y-3 px-4 py-4">
            {[
              { label: "Institutional Ownership", pct: 66.4, color: "var(--accent)" },
              { label: "Insider Ownership", pct: 3.8, color: "var(--pos)" },
              { label: "Retail / Other", pct: 29.8, color: "var(--dim)" },
              { label: "Short Interest / Float", pct: 1.2, color: "var(--neg)" },
            ].map((o) => (
              <div key={o.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">{o.label}</span>
                  <span className="font-mono" style={{ color: o.color }}>{fmtPct(o.pct)}</span>
                </div>
                <ProgressBar value={o.pct} max={100} color={o.color} height={6} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
            <div className="px-3 py-2.5">
              <div className="kpi-label">INST OWNERS</div>
              <div className="mt-1 font-mono text-sm text-ink">4,182</div>
            </div>
            <div className="px-3 py-2.5">
              <div className="kpi-label">DAYS TO COVER</div>
              <div className="mt-1 font-mono text-sm text-ink">2.4d</div>
            </div>
            <div className="px-3 py-2.5">
              <div className="kpi-label">BORROW RATE</div>
              <div className="mt-1 font-mono text-sm text-ink">0.38%</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Analyst estimates */}
      <Panel>
        <PanelHeader
          title="Analyst Estimates — Revenue & EPS by Quarter"
          right={<Chip tone="info">Consensus · FactSet</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <Th>Period</Th>
                <Th right>Rev Est ($B)</Th>
                <Th right>Rev Actual ($B)</Th>
                <Th right>Rev Surprise</Th>
                <Th right>EPS Est</Th>
                <Th right>EPS Actual</Th>
                <Th right>EPS Surprise</Th>
                <Th right>Result</Th>
              </tr>
            </thead>
            <tbody>
              {ANALYST_ESTIMATES.map((e) => {
                const revSurprise = e.revAct !== null ? ((e.revAct - e.revEst) / e.revEst * 100) : null;
                const epsSurprise = e.epsAct !== null ? ((e.epsAct - e.epsEst) / Math.abs(e.epsEst) * 100) : null;
                return (
                  <tr key={e.period} className="hover:bg-elevated/40">
                    <Td mono={false} className="font-medium text-ink">{e.period}</Td>
                    <Td right>{e.revEst.toFixed(1)}</Td>
                    <Td right className={e.revAct ? "text-ink" : "text-dim"}>
                      {e.revAct ? e.revAct.toFixed(2) : "—"}
                    </Td>
                    <Td right className={revSurprise !== null ? signClass(revSurprise) : "text-dim"}>
                      {revSurprise !== null ? fmtSignedPct(revSurprise) : "—"}
                    </Td>
                    <Td right>{e.epsEst.toFixed(2)}</Td>
                    <Td right className={e.epsAct ? "text-ink" : "text-dim"}>
                      {e.epsAct !== null ? e.epsAct.toFixed(2) : "—"}
                    </Td>
                    <Td right className={epsSurprise !== null ? signClass(epsSurprise) : "text-dim"}>
                      {epsSurprise !== null ? fmtSignedPct(epsSurprise) : "—"}
                    </Td>
                    <Td right>
                      {e.beat === null ? (
                        <Chip>Est</Chip>
                      ) : e.beat ? (
                        <Chip tone="pos">BEAT</Chip>
                      ) : (
                        <Chip tone="neg">MISS</Chip>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Peer comps + News */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Peer Comparison" right={<Chip>Semis peer group</Chip>} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Ticker</Th>
                  <Th right>P/E</Th>
                  <Th right>EV/EBITDA</Th>
                  <Th right>Fwd P/E</Th>
                </tr>
              </thead>
              <tbody>
                {NVDA_PEERS.map((p) => (
                  <tr key={p.sym} className={cn("hover:bg-elevated/40", p.sym === "NVDA" && "bg-accent/5")}>
                    <Td mono={false}>
                      <Ticker sym={p.sym} name={p.name} />
                    </Td>
                    <Td right className={p.sym === "NVDA" ? "text-accent font-medium" : ""}>{p.pe.toFixed(1)}x</Td>
                    <Td right className={p.sym === "NVDA" ? "text-accent font-medium" : ""}>{p.evEbitda.toFixed(1)}x</Td>
                    <Td right className={p.sym === "NVDA" ? "text-accent font-medium" : ""}>{p.fwdPe.toFixed(1)}x</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent News"
            right={<Chip tone="ai">Sentiment scored</Chip>}
          />
          <ul className="divide-y divide-line">
            {NVDA_NEWS.map((n, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-elevated/40">
                <span className={cn(
                  "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                  n.sentiment > 0.5 ? "bg-pos" : n.sentiment > 0 ? "bg-accent" : n.sentiment > -0.3 ? "bg-warn" : "bg-neg"
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted leading-snug">{n.headline}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-mono text-2xs text-dim">{n.source}</span>
                    <span className="text-2xs text-faint">·</span>
                    <span className="font-mono text-2xs text-dim">{n.time}</span>
                    <Chip tone={n.sentiment > 0.5 ? "pos" : n.sentiment < -0.3 ? "neg" : "default"} className="text-2xs">
                      {n.category}
                    </Chip>
                  </div>
                </div>
                <span className={cn("shrink-0 font-mono text-xs tabular-nums", signClass(n.sentiment))}>
                  {n.sentiment >= 0 ? "+" : ""}{n.sentiment.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
