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
import { Sparkline, DeltaBars, ProgressBar, MiniBars } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight, Sparkle, Check, Warn } from "@/components/icons";
import {
  SIGNAL_LIBRARY,
  RESEARCH_KPI,
  IC_HORIZONS,
  IC_BY_HORIZON,
  DECILE_SPREAD_DATA,
  PIT_CHECK_ROWS,
  type CrowdingLevel,
} from "@/lib/data/argus2";
import { priceWalk } from "@/lib/rng";
import { fmtNum, fmtInt, fmtCompact, fmtSignedPct, fmtPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Signal Engineering & Alpha Validation" };

const crowdTone = (c: CrowdingLevel) =>
  c === "LOW" ? ("pos" as const) : c === "MED" ? ("warn" as const) : ("neg" as const);

const familyTone: Record<string, string> = {
  Disclosure: "chip-accent",
  NLP:        "chip-ai",
  Web:        "border-info/30 bg-info/10 text-info",
  Consumer:   "chip-warn",
};

/* IC decay series — flagship signals */
const IC_SIGNAL_KEYS = [
  "Congressional Trading Cluster",
  "Insider Net Buying (Form 4)",
  "NLP Event Intensity (z>2)",
  "Search Interest Nowcast",
];

/* Decile spread as deltas (from 0 baseline) */
const DECILE_DELTAS = DECILE_SPREAD_DATA.map((v) => v);

export default function ResearchPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Signal Engineering & Alpha Validation"
        desc="PIT-validated signal library: IC/IR metrics, decay analysis, decile-spread, look-ahead-bias guards, walk-forward OOS testing. Validated against the KEPLER/AEGIS backtester. Signals are versioned and composable."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-dim">{RESEARCH_KPI.signalsInLibrary} signals · {IC_HORIZONS.length} horizons tested</span>
            <Link href="/signals/governance" className="btn">Governance</Link>
            <Link href="/signals" className="btn">← Signals</Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Signals in Library"
          value={String(RESEARCH_KPI.signalsInLibrary)}
          sub="4 families · versioned · composable"
          icon={<Icon name="layers" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Avg Rank-IC"
          value={fmtNum(RESEARCH_KPI.avgRankIc, 3)}
          sub="equal-weighted · 60D horizon"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Avg Half-Life"
          value={`${RESEARCH_KPI.avgHalfLifeDays}d`}
          sub="IC decay to half its peak value"
          icon={<Icon name="gauge" width={15} height={15} />}
        />
        <KpiCard
          label="Crowding Index"
          value={fmtNum(RESEARCH_KPI.crowdingIndex, 2)}
          sub="0 = no crowd · 1 = fully crowded"
          icon={<Icon name="wave" width={15} height={15} />}
          tone="warn"
        />
      </div>

      {/* Signal Library table */}
      <Panel>
        <PanelHeader
          title="Signal Library — All Families"
          sub="Rank-IC · IR · decile-spread · turnover · capacity · crowding · version · PIT-validated on the archive"
          right={<Chip tone="accent">Glass-box · versioned</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr>
                <Th>Signal</Th>
                <Th>Family</Th>
                <Th right>Cov %</Th>
                <Th right>Rank-IC</Th>
                <Th right>IR</Th>
                <Th right>Decile Sprd</Th>
                <Th right>Turnover</Th>
                <Th right>Capacity</Th>
                <Th right>Half-Life</Th>
                <Th>Crowding</Th>
                <Th>Ver</Th>
                <Th right>IC Decay</Th>
              </tr>
            </thead>
            <tbody>
              {SIGNAL_LIBRARY.map((s, i) => (
                <tr key={i} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false} className="max-w-[220px]">
                    <span className="text-sm font-medium text-ink leading-snug">{s.signal}</span>
                  </Td>
                  <Td mono={false}>
                    <span className={cn("chip text-2xs", familyTone[s.family] ?? "")}>
                      {s.family}
                    </span>
                  </Td>
                  <Td right className="text-muted">{s.coverage}%</Td>
                  <Td right className={s.rankIc >= 0.06 ? "text-pos font-semibold" : s.rankIc >= 0.04 ? "text-muted" : "text-dim"}>
                    {fmtNum(s.rankIc, 3)}
                  </Td>
                  <Td right className={s.ir >= 0.7 ? "text-pos" : s.ir >= 0.5 ? "text-muted" : "text-dim"}>
                    {fmtNum(s.ir, 2)}
                  </Td>
                  <Td right className={s.decileSpread >= 7 ? "text-pos font-semibold" : "text-muted"}>
                    {fmtSignedPct(s.decileSpread, 1)}
                  </Td>
                  <Td right className="text-dim">{s.turnover}%</Td>
                  <Td right className="text-muted">${fmtCompact(s.capacityM * 1e6)}</Td>
                  <Td right className="text-dim">{s.halfLifeDays}d</Td>
                  <Td mono={false}>
                    <Chip tone={crowdTone(s.crowding)}>{s.crowding}</Chip>
                  </Td>
                  <Td className="text-dim text-2xs">{s.version}</Td>
                  <Td right>
                    <div className="flex justify-end">
                      <Sparkline data={s.icSpark} width={72} height={22} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>
              All metrics computed on PIT-validated backtest. No look-ahead. Signals versioned in the library; composable via the KEPLER/AEGIS fusion engine.
            </span>
            <Link href="/signals" className="flex items-center gap-1 text-accent hover:underline">
              signal feed <ChevronRight width={13} height={13} />
            </Link>
          </div>
        </div>
      </Panel>

      {/* Feature Engineering panel */}
      <Panel>
        <PanelHeader
          title="Feature Engineering Pipeline"
          sub="Raw signal → normalized, PIT-joined, cross-sectionally ranked feature ready for the fusion model"
          right={<Chip tone="ai"><Sparkle width={11} height={11} /> ARGUS engine</Chip>}
        />
        <div className="grid gap-0 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-0 divide-y divide-line">
            {[
              {
                step: "01",
                title: "PIT Join to Security Universe",
                body: "Signal values are joined to the point-in-time security universe (as_of ≤ test_date). Universe includes only securities that existed at the signal date — no survivorship bias.",
              },
              {
                step: "02",
                title: "Winsorization (1st / 99th percentile)",
                body: "Extreme outliers are clipped at the 1% and 99% cross-sectional quantile to prevent single observations from dominating factor returns.",
              },
              {
                step: "03",
                title: "Seasonality Adjustment",
                body: "For signals with known seasonal patterns (e.g. retail foot-traffic in Q4, EDGAR 10-Q filing cycles), a trailing-52W seasonal median is subtracted to isolate the idiosyncratic component.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">{step}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-0 divide-y divide-line">
            {[
              {
                step: "04",
                title: "Cross-Sectional Z-Score",
                body: "After winsorization, the signal is standardized cross-sectionally: z = (x − mean) / std. This ensures comparability across sectors and market caps. Mean and std are computed on the same as_of date.",
              },
              {
                step: "05",
                title: "Cross-Sectional Rank (Rank-IC)",
                body: "A rank transform is applied to produce the final factor. Rank-IC (Spearman) is more robust to outliers than Pearson IC and is the primary reported metric in the signal library.",
              },
              {
                step: "06",
                title: "Normalization & Coverage Fill",
                body: "Securities with missing signal data at as_of receive a cross-sectional median fill (or are excluded if coverage < 20%). Coverage % is reported for each signal in the library.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">{step}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* IC / Decay + Decile Spread row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* IC by horizon */}
        <Panel>
          <PanelHeader
            title="IC / Decay Analysis — Forward Horizon Profiles"
            sub="Rank-IC across 10 forward horizons (1d → 60d) · half-life = horizon where IC drops to 50% of peak"
            right={<Chip tone="accent">10 horizons</Chip>}
          />
          <div className="space-y-4 px-4 py-4">
            {IC_SIGNAL_KEYS.map((key) => {
              const icSeries = IC_BY_HORIZON[key] ?? [];
              const peakIc = Math.max(...icSeries);
              const halfLifeIdx = icSeries.findIndex((v) => v <= peakIc * 0.5);
              const halfLifeLabel = halfLifeIdx >= 0 ? IC_HORIZONS[halfLifeIdx] : ">60d";
              return (
                <div key={key} className="rounded border border-line bg-elevated/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{key}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-dim">half-life:</span>
                      <span className="font-mono text-xs text-accent">{halfLifeLabel}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-end gap-0.5">
                    {icSeries.map((ic, j) => (
                      <div key={j} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm"
                          style={{
                            height: `${Math.max(2, Math.round((ic / 0.08) * 48))}px`,
                            background: ic >= 0.06 ? "var(--pos)" : ic >= 0.04 ? "var(--accent)" : "var(--dim)",
                            opacity: 0.7 + 0.3 * (ic / 0.08),
                          }}
                        />
                        <span className="font-mono text-2xs text-faint">{IC_HORIZONS[j]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-2xs text-dim">
                    <span>Peak IC: <span className="font-mono text-pos">{fmtNum(peakIc, 3)}</span></span>
                    <span>60D IC: <span className="font-mono text-muted">{fmtNum(icSeries[icSeries.length - 1], 3)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <p className="text-xs text-dim">
              Shorter half-life signals require higher turnover; longer half-life signals support lower-frequency strategies. The fusion model weights by IC across the target holding period.
            </p>
          </div>
        </Panel>

        {/* Decile Spread */}
        <Panel>
          <PanelHeader
            title="Decile-Spread — Forward Returns by Signal Quintile"
            sub="Annualized forward return (60D) by signal decile · decile 10 = highest-ranked · monotonicity highlighted"
            right={<Chip tone="pos">Monotonic spread</Chip>}
          />
          <div className="px-4 py-4">
            <p className="mb-3 section-label">annualized forward return % — by signal decile</p>
            <div className="flex items-end gap-0.5">
              {DECILE_SPREAD_DATA.map((v, i) => {
                const h = Math.abs(v) * 4;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(3, h)}px`,
                        background: v >= 0 ? "var(--pos)" : "var(--neg)",
                        opacity: 0.65 + 0.35 * (Math.abs(v) / 9),
                      }}
                    />
                    <span className="font-mono text-2xs text-faint">D{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-2xs text-dim">
              <span className="text-neg">D1: {fmtSignedPct(DECILE_SPREAD_DATA[0], 1)}</span>
              <span className="text-pos">D10: {fmtSignedPct(DECILE_SPREAD_DATA[9], 1)}</span>
            </div>
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Decile spread (D10−D1)", value: `${fmtSignedPct(DECILE_SPREAD_DATA[9] - DECILE_SPREAD_DATA[0], 1)} ann.`, tone: "text-pos" },
                { label: "Monotonicity check", value: "9/9 adjacent pairs ordered ✓", tone: "text-pos" },
                { label: "Avg IC 60D (flagship)", value: fmtNum(0.064, 3), tone: "text-muted" },
                { label: "Multiple-testing caution", value: "Bonferroni-corrected p < 0.05", tone: "text-warn" },
              ].map(({ label, value, tone }) => (
                <div key={label} className="rounded border border-line bg-elevated/30 px-3 py-2">
                  <div className="text-2xs text-dim">{label}</div>
                  <div className={cn("mt-0.5 font-mono text-xs", tone)}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Look-Ahead Bias Guard */}
      <Panel glow>
        <PanelHeader
          title="Look-Ahead Bias Guard — Enforced as_of ≤ test_date"
          sub="Every backtest row is validated: signal data as_of must be ≤ the test date. Violations are rejected by the runner."
          right={<Chip tone="warn">Enforced · CI-scanned</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Test Date</Th>
                <Th right>Signal as_of</Th>
                <Th right>Data as_of</Th>
                <Th>Verdict</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {PIT_CHECK_ROWS.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "group transition-colors hover:bg-elevated/40",
                    row.verdict === "BLOCKED" && "bg-neg/5"
                  )}
                >
                  <Td className="text-muted">{row.testDate}</Td>
                  <Td right className="text-muted">{row.signalAsOf}</Td>
                  <Td right className={row.verdict === "BLOCKED" ? "text-neg font-semibold" : "text-muted"}>
                    {row.dataAsOf}
                  </Td>
                  <Td mono={false}>
                    {row.verdict === "PASS" ? (
                      <span className="chip chip-pos inline-flex items-center gap-1 text-xs">
                        <Check width={11} height={11} /> PASS
                      </span>
                    ) : (
                      <span className="chip chip-neg inline-flex items-center gap-1 text-xs">
                        <Warn width={11} height={11} /> BLOCKED
                      </span>
                    )}
                  </Td>
                  <Td mono={false} className="max-w-[480px] text-xs text-muted leading-snug">
                    {row.reason}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line">
          <div className="grid gap-0 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              {
                label: "Guard mechanism",
                value: "as_of ≤ test_date",
                sub: "enforced by KEPLER backtest runner on every row",
                tone: "text-pos",
              },
              {
                label: "Look-ahead leaks detected",
                value: "0 in production",
                sub: "CI pipeline scans all pipeline joins on every push",
                tone: "text-pos",
              },
              {
                label: "Multiple-testing correction",
                value: "Bonferroni / Benjamini–Hochberg",
                sub: "Applied to all IC t-tests and strategy simulations",
                tone: "text-warn",
              },
            ].map(({ label, value, sub, tone }) => (
              <div key={label} className="px-4 py-3">
                <div className="section-label">{label}</div>
                <div className={cn("mt-1 font-mono text-sm", tone)}>{value}</div>
                <div className="mt-0.5 text-xs text-dim">{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-start gap-2 text-xs text-dim">
            <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-warn" />
            <span>
              <strong className="text-muted">Walk-forward / OOS caution:</strong> In-sample IC is always higher than out-of-sample. All published metrics are from a held-out OOS period (most recent 20% of history). Walk-forward validation uses expanding windows. Multiple-testing adjustments (Bonferroni, BH) are applied to all hypothesis tests. Probability of Backtest Overfitting (PBO) is computed on every strategy via KEPLER before promotion to live.
            </span>
          </div>
        </div>
      </Panel>

      {/* Crowding indicators */}
      <Panel>
        <PanelHeader
          title="Crowding Indicators"
          sub="Signal crowding estimated from 13F overlap, short-interest benchmarks, and factor correlation"
          right={<Chip tone="warn">Crowding index: {fmtNum(RESEARCH_KPI.crowdingIndex, 2)}</Chip>}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Congressional Cluster", crowding: "LOW", overlap13f: 4.2, shortVsBaseline: -0.8, note: "Low HF overlap; institutional holding rare" },
            { label: "NLP Event Intensity", crowding: "MED", overlap13f: 18.7, shortVsBaseline: +2.1, note: "Widely replicated; many vendors offer similar" },
            { label: "Search Interest Nowcast", crowding: "HIGH", overlap13f: 34.1, shortVsBaseline: +4.8, note: "Highly crowded; Google Trends is public" },
            { label: "Insider Net Buying", crowding: "LOW", overlap13f: 6.1, shortVsBaseline: -0.3, note: "Less crowded; execution timing edge remains" },
          ].map(({ label, crowding, overlap13f, shortVsBaseline, note }) => {
            const ct = crowding === "LOW" ? ("pos" as const) : crowding === "MED" ? ("warn" as const) : ("neg" as const);
            return (
              <div key={label} className="flex flex-col gap-2 rounded border border-line bg-elevated/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{label}</span>
                  <Chip tone={ct}>{crowding}</Chip>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-dim">13F HF overlap</span>
                    <span className="font-mono text-muted">{fmtNum(overlap13f, 1)}%</span>
                  </div>
                  <ProgressBar value={overlap13f} max={40} color={overlap13f > 25 ? "var(--neg)" : overlap13f > 12 ? "var(--warn)" : "var(--pos)"} height={5} />
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-dim">Short vs baseline</span>
                    <span className={cn("font-mono", shortVsBaseline > 0 ? "text-neg" : "text-pos")}>
                      {fmtSignedPct(shortVsBaseline, 1)}
                    </span>
                  </div>
                </div>
                <p className="text-2xs text-dim">{note}</p>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <div className="flex items-start gap-2 text-xs text-dim">
            <Icon name="warn" width={13} height={13} className="mt-0.5 shrink-0 text-warn" />
            <span>
              HIGH-crowding signals are flagged but not suppressed — the analyst decides whether the edge persists. Crowding is a risk factor, not a kill switch. Signals validated on the PIT lake via KEPLER; composable with AEGIS risk overlay.
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
