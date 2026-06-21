import { PageHeader, Panel, PanelHeader, Chip, Stat, Th, Td, KpiCard, StatusDot } from "@/components/ui/kit";
import { LiveDot } from "@/components/live/live-stat";
import { LiveMacro } from "@/components/data/live-macro";
import { MacroRegime } from "@/components/engine/macro-regime";
import { BondAnalytics } from "@/components/engine/bond-analytics";
import { YieldCurve } from "@/components/engine/yield-curve";
import { MacroNowcast } from "@/components/engine/macro-nowcast";
import { CreditConditions } from "@/components/engine/credit-conditions";
import { RealRates } from "@/components/engine/real-rates";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { signClass, fmtBps } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  MACRO_KPIS,
  YIELD_CURVE,
  YIELD_CURVE_1YR_AGO,
  ECON_CALENDAR,
  RECESSION_INDICATORS,
} from "@/lib/data/obsidian";
import { priceWalk } from "@/lib/rng";

export const metadata = { title: "Economics — OBSIDIAN Terminal" };

/* SVG yield curve chart — server-rendered, zero client JS */
function YieldCurveChart({
  current,
  prior,
  width = 580,
  height = 200,
}: {
  current: { maturity: number; yield: number; tenor: string }[];
  prior: { maturity: number; yield: number }[];
  width?: number;
  height?: number;
}) {
  const padT = 10, padB = 32, padL = 8, padR = 8;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxM = Math.max(...current.map((d) => d.maturity));
  const allYields = [...current.map((d) => d.yield), ...prior.map((d) => d.yield)];
  const minY = Math.min(...allYields) - 0.1;
  const maxY = Math.max(...allYields) + 0.1;
  const spanY = maxY - minY;

  const xOf = (m: number) => padL + (m / maxM) * plotW;
  const yOf = (y: number) => padT + plotH - ((y - minY) / spanY) * plotH;

  const curPath = current
    .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(d.maturity).toFixed(1)},${yOf(d.yield).toFixed(1)}`)
    .join(" ");

  const priorPath = prior
    .map((d, i) => `${i === 0 ? "M" : "L"}${xOf(d.maturity).toFixed(1)},${yOf(d.yield).toFixed(1)}`)
    .join(" ");

  // Grid lines for yields
  const gridYields = [4.0, 4.5, 5.0, 5.5];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block overflow-visible"
    >
      {/* Grid lines */}
      {gridYields.map((gy) => {
        const yp = yOf(gy);
        if (yp < padT || yp > padT + plotH) return null;
        return (
          <g key={gy}>
            <line x1={padL} y1={yp} x2={padL + plotW} y2={yp} stroke="var(--line)" strokeWidth={0.6} />
            <text x={padL + plotW + 4} y={yp + 3} fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">{gy.toFixed(1)}%</text>
          </g>
        );
      })}

      {/* Prior year curve (dimmer) */}
      <path d={priorPath} fill="none" stroke="var(--dim)" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.6} />

      {/* Current curve area */}
      <path
        d={`${curPath} L${xOf(maxM).toFixed(1)},${(padT + plotH).toFixed(1)} L${xOf(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z`}
        fill="var(--accent)"
        opacity={0.08}
      />
      <path d={curPath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {current.map((d) => (
        <circle
          key={d.tenor}
          cx={xOf(d.maturity)}
          cy={yOf(d.yield)}
          r={3}
          fill="var(--accent)"
          opacity={0.9}
        />
      ))}

      {/* X-axis labels */}
      {current.map((d) => (
        <text
          key={d.tenor}
          x={xOf(d.maturity)}
          y={padT + plotH + 16}
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--dim)"
          textAnchor="middle"
        >
          {d.tenor}
        </text>
      ))}

      {/* Inversion highlight between 2Y and 10Y */}
      <rect
        x={xOf(24) - 1}
        y={padT}
        width={xOf(120) - xOf(24) + 2}
        height={plotH}
        fill="var(--neg)"
        opacity={0.04}
      />
      <text
        x={(xOf(24) + xOf(120)) / 2}
        y={padT + 12}
        fontSize={8}
        fontFamily="var(--font-mono)"
        fill="var(--neg)"
        textAnchor="middle"
        opacity={0.7}
      >
        INVERTED
      </text>
    </svg>
  );
}

// Generate mini sparklines for macro series
const FED_FUNDS_SPARK = [0.25, 0.25, 0.5, 1.0, 1.75, 2.5, 3.25, 4.0, 4.5, 5.0, 5.25, 5.375, 5.375, 5.375, 5.375, 5.375];
const CPI_SPARK = [1.4, 2.6, 4.2, 5.4, 6.8, 8.3, 8.5, 8.2, 7.1, 6.0, 4.9, 4.0, 3.7, 3.5, 3.4, 3.4];
const GDP_SPARK = [-31.4, 33.8, 6.3, 6.7, 2.3, -1.6, -0.6, 3.2, 2.6, 3.4, 4.9, 3.4, 1.6, 1.3, 2.0, 1.6];
const UNEMP_SPARK = [14.7, 7.9, 6.0, 5.8, 5.4, 4.8, 4.2, 3.8, 3.5, 3.4, 3.5, 3.7, 3.8, 3.9, 3.9, 3.9];
const PMI_SPARK = [41.5, 56.1, 60.8, 63.7, 55.4, 52.8, 50.1, 47.4, 46.4, 47.8, 49.2, 49.2, 50.3, 50.1, 49.2, 49.2];
const T10Y_SPARK = priceWalk("10Y-hist", 24, 1.5, 0.04, 0.006);

export default function EconomicsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Economics — FRED Data Terminal"
        desc="Macro KPI deck, yield curve visualization, rates/inflation/growth/employment charts, recession indicators, and economic release calendar."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-muted">FRED · BLS · BEA · ISM</span>
            <Chip tone="accent">FRED</Chip>
          </div>
        }
      />

      {/* Live FRED macro data panel */}
      <LiveMacro />

      {/* Macro regime / nowcast engine */}
      <MacroRegime />

      {/* Fixed-income / bond analytics engine */}
      <BondAnalytics />

      {/* Treasury yield-curve analytics engine */}
      <YieldCurve />

      {/* Macro nowcast engine — z-scored business-cycle quadrant */}
      <MacroNowcast />

      {/* Credit-conditions engine — ICE BofA OAS spread-stress regime */}
      <CreditConditions />

      {/* Real-rates engine — 10Y decomposition into real yield + breakeven inflation */}
      <RealRates />

      {/* Macro KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {MACRO_KPIS.map((k) => (
          <Panel key={k.label} hover className={cn("scanline px-4 py-3", k.tone === "warn" && "border-warn/20 bg-warn/5")}>
            <div className="flex items-center justify-between">
              <span className="kpi-label">{k.label}</span>
              <Icon name={k.icon} width={14} height={14} className="text-dim" />
            </div>
            <div className={cn(
              "mt-2 font-mono text-2xl font-semibold leading-none",
              k.tone === "pos" ? "text-pos" : k.tone === "neg" ? "text-neg" : k.tone === "warn" ? "text-warn" : "text-accent"
            )}>
              {k.value}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-dim">{k.sub}</span>
              <span className={cn("font-mono text-xs", signClass(k.chg))}>{k.chgLabel}</span>
            </div>
          </Panel>
        ))}
      </div>

      {/* Yield curve */}
      <Panel>
        <PanelHeader
          title="US Treasury Yield Curve"
          sub="Current vs 1-year ago · 1M to 30Y tenors · Fed Funds at 5.375% upper bound"
          right={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 rounded bg-accent" />
                <span className="text-2xs text-dim">Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 rounded bg-dim opacity-60" style={{ borderTop: "1px dashed" }} />
                <span className="text-2xs text-dim">1Y ago</span>
              </div>
              <Chip tone="neg">INVERTED</Chip>
            </div>
          }
        />
        <div className="px-4 pb-2 pt-4">
          <YieldCurveChart current={YIELD_CURVE} prior={YIELD_CURVE_1YR_AGO} width={680} height={220} />
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line sm:grid-cols-6">
          {[
            { label: "2s10s SPREAD", value: "−45.8bps", tone: "neg" as const },
            { label: "5s30s SPREAD", value: "−0.3bps", tone: "warn" as const },
            { label: "FED FUNDS EFF.", value: "5.33%", tone: "accent" as const },
            { label: "INVERSION DAYS", value: "680+", tone: "neg" as const },
            { label: "REAL 10Y (TIPS)", value: "2.21%", tone: "accent" as const },
            { label: "BREAKEVEN 10Y", value: "2.16%", tone: "warn" as const },
          ].map((s) => (
            <div key={s.label} className="px-3 py-2.5">
              <div className="kpi-label">{s.label}</div>
              <div className={cn("mt-1 font-mono text-sm font-medium",
                s.tone === "neg" ? "text-neg" : s.tone === "warn" ? "text-warn" : s.tone === "accent" ? "text-accent" : "text-ink"
              )}>{s.value}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Yield curve table + mini-charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Rates — Full Term Structure" right={<Chip>As-of close</Chip>} />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Tenor</Th>
                <Th right>Yield</Th>
                <Th right>1D Δ</Th>
                <Th right>1M Δ</Th>
                <Th right>1Y Δ</Th>
              </tr>
            </thead>
            <tbody>
              {YIELD_CURVE.map((p, i) => {
                const priorYield = YIELD_CURVE_1YR_AGO[i]?.yield ?? p.yield;
                const yr1delta = p.yield - priorYield;
                return (
                  <tr key={p.tenor} className="hover:bg-elevated/40">
                    <Td mono={false} className="font-medium text-ink">{p.tenor}</Td>
                    <Td right className="text-ink">{p.yield.toFixed(3)}%</Td>
                    <Td right className={signClass(-0.03 + i * 0.004)}>{fmtBps(-3 + i * 0.4)}</Td>
                    <Td right className={signClass(-0.15 + i * 0.02)}>{fmtBps(-15 + i * 2)}</Td>
                    <Td right className={signClass(yr1delta)}>{fmtBps(yr1delta * 100)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <div className="space-y-4">
          {/* Mini macro charts */}
          <Panel>
            <PanelHeader title="Macro Historical Series" right={<Chip tone="info">FRED · monthly</Chip>} />
            <div className="grid grid-cols-2 gap-px bg-line">
              {[
                { label: "Fed Funds Rate (%)", data: FED_FUNDS_SPARK, color: "var(--warn)" },
                { label: "CPI YoY (%)", data: CPI_SPARK, color: "var(--neg)" },
                { label: "GDP QoQ SAAR (%)", data: GDP_SPARK, color: "var(--accent)" },
                { label: "Unemployment Rate (%)", data: UNEMP_SPARK, color: "var(--pos)" },
                { label: "ISM Manufacturing PMI", data: PMI_SPARK, color: "var(--info)" },
                { label: "10Y Treasury Yield (%)", data: T10Y_SPARK, color: "var(--accent)" },
              ].map((c) => (
                <div key={c.label} className="bg-panel px-3 py-3">
                  <div className="kpi-label mb-1.5">{c.label}</div>
                  <Sparkline data={c.data} width={200} height={40} color={c.color} />
                  <div className="mt-1 flex justify-between font-mono text-2xs text-dim">
                    <span>16-period history</span>
                    <span style={{ color: c.color }}>{c.data[c.data.length - 1].toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Recession indicators */}
      <Panel>
        <PanelHeader
          title="Recession Probability Indicators"
          sub="Composite dashboard — no single indicator is definitive"
          right={<Chip tone="warn">MONITOR</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <Th>Indicator</Th>
                <Th right>Current</Th>
                <Th right>Threshold</Th>
                <Th right>Status</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {RECESSION_INDICATORS.map((r, i) => {
                const isWarning = r.status === "Inverted" || r.status === "Contraction" || r.status === "Caution";
                const isAlert = r.status === "Triggered";
                return (
                  <tr key={i} className="hover:bg-elevated/40">
                    <Td mono={false} className="font-medium text-ink">{r.name}</Td>
                    <Td right className={isWarning ? "text-warn font-medium" : isAlert ? "text-neg font-medium" : "text-pos"}>
                      {r.value}
                    </Td>
                    <Td right className="text-dim">{r.threshold}</Td>
                    <Td right>
                      <Chip
                        tone={isAlert ? "neg" : isWarning ? "warn" : "pos"}
                        dot
                      >
                        {r.status}
                      </Chip>
                    </Td>
                    <Td mono={false} className="text-muted text-xs">{r.note}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line sm:grid-cols-5">
          {[
            { label: "RECESSION PROB (12M)", value: "28%", tone: "warn" as const },
            { label: "NY FED MODEL", value: "61.4%", tone: "neg" as const },
            { label: "GOLDMAN SACHS EST", value: "15%", tone: "accent" as const },
            { label: "YIELD CURVE MODEL", value: "44%", tone: "warn" as const },
            { label: "PREV RECESSION", value: "Apr 2020", tone: "accent" as const },
          ].map((s) => (
            <div key={s.label} className="px-3 py-2.5">
              <div className="kpi-label">{s.label}</div>
              <div className={cn("mt-1 font-mono text-sm font-medium",
                s.tone === "neg" ? "text-neg" : s.tone === "warn" ? "text-warn" : s.tone === "accent" ? "text-accent" : "text-ink"
              )}>{s.value}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Economic release calendar */}
      <Panel>
        <PanelHeader
          title="Economic Release Calendar — Upcoming"
          sub="Major US releases · dates and forecasts from consensus surveys"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="neg">HIGH</Chip>
              <Chip tone="warn">MEDIUM</Chip>
              <Chip>LOW</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Time (ET)</Th>
                <Th>Event</Th>
                <Th right>Actual</Th>
                <Th right>Forecast</Th>
                <Th right>Prior</Th>
                <Th right>Importance</Th>
              </tr>
            </thead>
            <tbody>
              {ECON_CALENDAR.map((e, i) => (
                <tr key={i} className={cn(
                  "hover:bg-elevated/40",
                  e.importance === "High" && "bg-warn/3"
                )}>
                  <Td mono={false} className="font-medium text-ink">{e.date}</Td>
                  <Td className="text-muted">{e.time}</Td>
                  <Td mono={false} className="text-muted">{e.event}</Td>
                  <Td right className={e.actual ? "text-ink font-medium" : "text-faint"}>
                    {e.actual ?? "—"}
                  </Td>
                  <Td right className="text-accent">{e.forecast}</Td>
                  <Td right className="text-dim">{e.prior}</Td>
                  <Td right>
                    <Chip
                      tone={e.importance === "High" ? "neg" : e.importance === "Medium" ? "warn" : "default"}
                      dot
                    >
                      {e.importance}
                    </Chip>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          <Icon name="bell" width={12} height={12} className="mr-1.5 inline text-faint" />
          Subscribe to ATHENA calendar alerts — get a briefing 15 minutes before any High-importance release.
        </div>
      </Panel>
    </div>
  );
}
