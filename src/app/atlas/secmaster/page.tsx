import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard,
  StatusDot, Th, Td, Ticker,
} from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";
import { Shield, Database, Clock, Globe, Book, Search } from "@/components/icons";
import { fmtInt, fmtCompact } from "@/lib/format";
import {
  SECMASTER_KPIS,
  NVDA_RESOLVED,
  PIT_EVENTS,
  CORP_ACTIONS,
  EXCHANGE_CALENDARS,
  ENTITY_RESOLUTION_CONSUMERS,
} from "@/lib/data/atlas-ops";

export const metadata = { title: "Security Master · ATLAS Platform & Ops" };

const PIT_TYPE_TONE: Record<string, "warn" | "neg" | "info" | "accent"> = {
  "ticker-change": "info",
  "merger":        "warn",
  "split":         "accent",
  "delisting":     "neg",
  "redomicile":    "info",
  "spin-off":      "warn",
};

const CA_TYPE_TONE: Record<string, "accent" | "pos" | "warn" | "info"> = {
  split:     "accent",
  dividend:  "pos",
  merger:    "warn",
  "spin-off":"warn",
  rights:    "info",
};

const STATUS_TONE: Record<string, "pos" | "warn" | "neg"> = {
  confirmed: "pos",
  pending:   "warn",
  cancelled: "neg",
};

const TODAY_TONE: Record<string, "pos" | "neg" | "warn" | "info"> = {
  open:       "pos",
  closed:     "neg",
  "half-day": "warn",
  "pre-open": "info",
};

export default function SecMasterPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Security Master / Reference Data"
        desc="Single source of truth for instruments, identifiers, issuers, and trading calendars across the 6-service PANTHEON suite."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="info" dot>PIT-Exact</Chip>
            <Chip tone="pos" dot>{fmtInt(SECMASTER_KPIS.instruments)} instruments</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="INSTRUMENTS"
          value={fmtCompact(SECMASTER_KPIS.instruments, 1)}
          sub="Equity, FI, Crypto, Derivatives"
          tone="info"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="ISSUERS"
          value={fmtCompact(SECMASTER_KPIS.issuers, 1)}
          sub="Entity-resolved, LEI-linked"
          icon={<Book width={15} height={15} />}
        />
        <KpiCard
          label="IDENTIFIERS MAPPED"
          value={fmtCompact(SECMASTER_KPIS.identifiersMapped, 1)}
          sub="CUSIP · ISIN · FIGI · Sedol · LEI"
          tone="accent"
          icon={<Icon name="layers" width={15} height={15} />}
        />
        <KpiCard
          label="EXCHANGES"
          value={SECMASTER_KPIS.exchanges.toString()}
          sub={`${SECMASTER_KPIS.calendars} trading calendars`}
          icon={<Globe width={15} height={15} />}
        />
        <KpiCard
          label="PIT SNAPSHOTS"
          value={fmtInt(SECMASTER_KPIS.pitSnapshotsStored)}
          sub="Daily snapshots since 2019"
          icon={<Clock width={15} height={15} />}
        />
        <KpiCard
          label="CORP ACTIONS"
          value={SECMASTER_KPIS.corpActionsThisMonth.toString()}
          sub="Processed this month"
          tone="warn"
          icon={<Icon name="bolt" width={15} height={15} />}
        />
      </div>

      {/* Instrument Resolution Panel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel glow>
          <PanelHeader
            title="Instrument Resolution — Entity API"
            sub={`Query: "NVDA" → canonical instrument`}
            right={<Chip tone="info"><Search width={10} height={10} /> Resolved</Chip>}
          />
          {/* Result card */}
          <div className="p-4 space-y-4">
            <div className="rounded border border-accent/20 bg-accent/5 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Ticker sym="NVDA" name={NVDA_RESOLVED.name} />
                    <Chip tone="pos">active</Chip>
                    <Chip tone="default">{NVDA_RESOLVED.assetClass}</Chip>
                  </div>
                  <div className="font-mono text-[10px] text-dim mt-1">{NVDA_RESOLVED.canonicalId}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-xs text-muted">{NVDA_RESOLVED.exchange}</div>
                  <div className="font-mono text-[10px] text-dim">{NVDA_RESOLVED.exchangeLocal}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { l: "Sector",     v: NVDA_RESOLVED.sector },
                  { l: "Country",    v: NVDA_RESOLVED.country },
                  { l: "Currency",   v: NVDA_RESOLVED.currency },
                  { l: "Mkt Cap",    v: `$${fmtCompact(NVDA_RESOLVED.marketCap)}` },
                  { l: "Listed",     v: NVDA_RESOLVED.listDate },
                  { l: "First Trade",v: NVDA_RESOLVED.firstTradeDate },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div className="kpi-label text-[9px]">{l}</div>
                    <div className="font-mono text-ink mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Identifiers table */}
            <div>
              <div className="section-label text-[10px] mb-2 text-dim px-0.5">All Identifiers</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[400px]">
                  <thead>
                    <tr>
                      <Th>Type</Th>
                      <Th>Value</Th>
                      <Th>Source</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {NVDA_RESOLVED.identifiers.map((id) => (
                      <tr key={id.type} className="hover:bg-elevated/40 transition-colors">
                        <Td mono={false}>
                          <span className="rounded border border-info/25 bg-info/8 px-1.5 py-0.5 font-mono text-[10px] text-info">
                            {id.type}
                          </span>
                        </Td>
                        <Td className="text-xs text-accent">{id.value}</Td>
                        <Td mono={false} className="text-xs text-dim">{id.source}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Panel>

        {/* Entity Resolution API consumers */}
        <Panel>
          <PanelHeader
            title="Entity-Resolution API — Service Consumers"
            sub="name / any identifier → canonical instrument_id"
            right={<Chip tone="info">5 consumers</Chip>}
          />
          <div className="divide-y divide-line">
            {ENTITY_RESOLUTION_CONSUMERS.map((c) => (
              <div key={c.service} className="flex items-start gap-3 px-4 py-3">
                <StatusDot tone="pos" pulse />
                <div className="min-w-0">
                  <span className="font-mono text-xs font-semibold text-ink">{c.service}</span>
                  <p className="mt-0.5 text-xs text-dim leading-relaxed">{c.usage}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-dim">
            Resolution accepts: ticker, CUSIP, ISIN, FIGI, Sedol, LEI, PermID, CIK, or free-form issuer name. Returns canonical instrument_id + full identifier map. PIT-aware — pass <span className="font-mono text-faint">as_of</span> date for historical resolution.
          </div>
        </Panel>
      </div>

      {/* PIT Universe & History */}
      <Panel>
        <PanelHeader
          title="PIT Universe & Instrument History"
          sub="Point-in-time ticker changes, re-use, M&A, delistings, splits — with effective date ranges"
          right={<Chip tone="accent">{PIT_EVENTS.length} events shown</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Canonical ID</Th>
                <Th>Current Sym</Th>
                <Th>Event</Th>
                <Th>Type</Th>
                <Th>Prev Value</Th>
                <Th>New Value</Th>
                <Th>Effective From</Th>
                <Th>Effective To</Th>
              </tr>
            </thead>
            <tbody>
              {PIT_EVENTS.map((e) => {
                const tone = PIT_TYPE_TONE[e.type] ?? "default";
                return (
                  <tr key={e.canonicalId + e.effectiveFrom} className="group hover:bg-elevated/40 transition-colors">
                    <Td className="text-[10px] text-dim">{e.canonicalId}</Td>
                    <Td mono={false}>
                      {e.sym !== "—" ? (
                        <Ticker sym={e.sym} />
                      ) : (
                        <span className="text-dim text-xs">—</span>
                      )}
                    </Td>
                    <Td mono={false} className="text-xs text-ink font-medium">{e.event}</Td>
                    <Td mono={false}>
                      <Chip tone={tone} className="text-[9px]">{e.type}</Chip>
                    </Td>
                    <Td mono={false} className="max-w-[180px] text-[11px] text-dim truncate">{e.prevValue}</Td>
                    <Td mono={false} className="max-w-[180px] text-[11px] text-muted truncate">{e.newValue}</Td>
                    <Td className="text-xs">{e.effectiveFrom}</Td>
                    <Td className="text-xs text-dim">{e.effectiveTo ?? <span className="text-pos">present</span>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          All historical queries are PIT-correct. Passing <span className="font-mono text-faint">as_of=2021-10-27</span> resolves META as FB. PANTHEON never overwrites history — new rows are appended with effective-date ranges.
        </div>
      </Panel>

      {/* Corporate Actions */}
      <Panel>
        <PanelHeader
          title="Corporate Actions Reference"
          sub="Splits · dividends · mergers · spin-offs with ex-dates and adjustment factors"
          right={<Chip tone="warn">Affects price series</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Symbol</Th>
                <Th>Issuer</Th>
                <Th>Action</Th>
                <Th>Ex-Date</Th>
                <Th>Pay Date</Th>
                <Th>Ratio</Th>
                <Th right>Adj Factor</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {CORP_ACTIONS.map((ca) => (
                <tr key={ca.id} className="group hover:bg-elevated/40 transition-colors">
                  <Td className="text-[10px] text-dim">{ca.id}</Td>
                  <Td mono={false}><Ticker sym={ca.sym} /></Td>
                  <Td mono={false} className="text-xs text-muted">{ca.name}</Td>
                  <Td mono={false}>
                    <Chip tone={CA_TYPE_TONE[ca.actionType] ?? "default"} className="text-[9px]">
                      {ca.actionType}
                    </Chip>
                  </Td>
                  <Td className="text-xs">{ca.exDate}</Td>
                  <Td className="text-xs text-dim">{ca.payDate ?? "—"}</Td>
                  <Td className="text-xs text-muted">{ca.ratio}</Td>
                  <Td right className={ca.adjFactor !== 1 ? "text-warn" : "text-dim"}>
                    {ca.adjFactor.toFixed(4)}
                  </Td>
                  <Td mono={false}>
                    <div className="flex items-center gap-1.5">
                      <StatusDot tone={STATUS_TONE[ca.status]} pulse={ca.status === "confirmed"} />
                      <span className={`text-xs font-mono ${STATUS_TONE[ca.status] === "pos" ? "text-pos" : STATUS_TONE[ca.status] === "warn" ? "text-warn" : "text-neg"}`}>
                        {ca.status}
                      </span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Adj factors applied backward in time to historical OHLCV series. Downstream services receive already-adjusted bars unless raw=true is passed. DEMO DATA.
        </div>
      </Panel>

      {/* Trading Calendars & Market Hours */}
      <Panel>
        <PanelHeader
          title="Trading Calendars & Market Hours"
          sub="Session open / close (local + UTC) · today's status · next holiday"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>
                {EXCHANGE_CALENDARS.filter((e) => e.todayStatus === "open").length} open today
              </Chip>
              <Chip tone="info">8 venues</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <Th>MIC</Th>
                <Th>Exchange</Th>
                <Th>City / TZ</Th>
                <Th>Session (local)</Th>
                <Th>Session (UTC)</Th>
                <Th>Asset Classes</Th>
                <Th>Today</Th>
                <Th>Next Holiday</Th>
              </tr>
            </thead>
            <tbody>
              {EXCHANGE_CALENDARS.map((ex) => {
                const todayTone = TODAY_TONE[ex.todayStatus];
                return (
                  <tr key={ex.mic} className="group hover:bg-elevated/40 transition-colors">
                    <Td>
                      <span className="rounded border border-line bg-elevated/60 px-1.5 py-0.5 text-[10px] font-mono text-ink">
                        {ex.mic}
                      </span>
                    </Td>
                    <Td mono={false} className="font-semibold text-xs text-ink">{ex.name}</Td>
                    <Td mono={false} className="text-xs text-dim">
                      <div>{ex.city}</div>
                      <div className="text-[10px] text-faint">{ex.tz}</div>
                    </Td>
                    <Td className="text-xs">
                      {ex.open} – {ex.close}
                    </Td>
                    <Td className="text-xs text-muted">
                      {ex.openUtc} – {ex.closeUtc}
                    </Td>
                    <Td mono={false}>
                      <div className="flex flex-wrap gap-1">
                        {ex.assetClasses.map((ac) => (
                          <span key={ac} className="chip text-[9px]">{ac}</span>
                        ))}
                      </div>
                    </Td>
                    <Td mono={false}>
                      <div className="flex items-center gap-1.5">
                        <StatusDot tone={todayTone} pulse={ex.todayStatus === "open"} />
                        <Chip tone={todayTone} className="text-[9px]">{ex.todayStatus}</Chip>
                      </div>
                    </Td>
                    <Td mono={false} className="text-xs">
                      <div className="text-muted">{ex.nextHoliday}</div>
                      {ex.nextHolidayDate !== "—" && (
                        <div className="font-mono text-[10px] text-dim">{ex.nextHolidayDate}</div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
          <Icon name="clock" width={14} height={14} className="mt-0.5 shrink-0 text-faint" />
          <span>
            Calendar data sourced from MIC Registry (ISO 10383) and exchange holiday schedules. Crypto markets run 24/7/365 with no session boundary. All downstream scheduling in KEPLER, AEGIS, and OBSIDIAN reads ATLAS calendar state before triggering time-sensitive jobs.
          </span>
        </div>
      </Panel>

      {/* Last refresh footer */}
      <div className="flex items-center justify-between rounded border border-line/40 bg-surface/40 px-4 py-2.5 text-xs text-dim">
        <span>Last full reference-data refresh: <span className="font-mono text-faint">{SECMASTER_KPIS.lastFullRefresh}</span></span>
        <Chip tone="info">DEMO DATA</Chip>
      </div>
    </div>
  );
}
