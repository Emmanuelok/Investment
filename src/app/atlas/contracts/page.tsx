import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot,
} from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";
import { Check, Warn, Shield, Database } from "@/components/icons";
import {
  CANONICAL_TYPES,
  CONTRACT_CI_CHECKS,
} from "@/lib/data/atlas-spine";

export const metadata = { title: "Shared Contracts · ATLAS Platform" };

const ALL_CONSUMERS = ["OBSIDIAN", "AEGIS", "ARGUS", "KEPLER", "HELIOS"];

const CONSUMER_COLOR: Record<string, string> = {
  OBSIDIAN: "border-accent/30 bg-accent/5 text-accent",
  AEGIS:    "border-warn/30 bg-warn/5 text-warn",
  ARGUS:    "border-pos/30 bg-pos/5 text-pos",
  KEPLER:   "border-info/30 bg-info/5 text-info",
  HELIOS:   "border-ai/30 bg-ai/5 text-ai",
};

const PYDANTIC_SAMPLE = `from __future__ import annotations
from datetime import date
from pydantic import BaseModel, Field
from typing import Literal

class Security(BaseModel):
    """Canonical security master record.

    v1.4.0 — 22 fields — single source of truth.
    All five services import this; none redefine it.
    """
    security_id: str = Field(..., description="ATLAS internal UUID")
    figi: str | None = Field(None, description="OpenFIGI identifier")
    isin: str | None = None
    cusip: str | None = None
    sedol: str | None = None
    ticker: str
    exchange: str
    currency: str = Field(..., min_length=3, max_length=3)
    asset_class: Literal["equity","fixed_income","fx",
                         "crypto","commodity","derivative"]
    name: str
    sector: str | None = None
    country: str | None = None
    is_active: bool = True
    listing_date: date | None = None
    delisting_date: date | None = None
    lot_size: int = 1
    tick_size: float | None = None
    contract_size: float | None = None
    price_currency: str | None = None
    settlement_currency: str | None = None
    underlying_id: str | None = None
    atlas_version: str = "1.4.0"`;

const TYPESCRIPT_SAMPLE = `// AUTO-GENERATED — do not edit by hand.
// Source: contracts/src/security.py  (v1.4.0)
// Generator: atlas-contracts generate --lang ts

export interface Security {
  /** ATLAS internal UUID */
  security_id: string;
  figi?: string | null;
  isin?: string | null;
  cusip?: string | null;
  sedol?: string | null;
  ticker: string;
  exchange: string;
  /** ISO 4217 — exactly 3 chars */
  currency: string;
  asset_class:
    | "equity" | "fixed_income" | "fx"
    | "crypto" | "commodity" | "derivative";
  name: string;
  sector?: string | null;
  country?: string | null;
  is_active: boolean;
  listing_date?: string | null;   // ISO date
  delisting_date?: string | null;
  lot_size: number;
  tick_size?: number | null;
  contract_size?: number | null;
  price_currency?: string | null;
  settlement_currency?: string | null;
  underlying_id?: string | null;
  atlas_version: string;
}`;

const COMPAT_RULES = [
  {
    icon: "check",
    tone: "pos",
    title: "Additive-only without version bump",
    body: "Adding an optional field is backward-compatible. Any service that doesn't know the field ignores it. No version bump required.",
  },
  {
    icon: "warn",
    tone: "warn",
    title: "Rename or remove → semver MAJOR",
    body: "Removing or renaming a field breaks existing consumers. Must bump the major version AND update all consumers in the same PR.",
  },
  {
    icon: "check",
    tone: "pos",
    title: "CI contract-compat gate",
    body: "Every PR touching contracts/ runs atlas-contracts check --backwards-compat. Any breaking change without a version bump fails the gate.",
  },
  {
    icon: "check",
    tone: "pos",
    title: "One source, two languages",
    body: "Pydantic is the source of truth. TypeScript types are generated artifacts. Services never hand-write interfaces for canonical types.",
  },
];

export default function ContractsPage() {
  const totalFields = CANONICAL_TYPES.reduce((s, t) => s + t.fields, 0);
  const breakingCount = CANONICAL_TYPES.filter((t) => t.breaking).length;
  const passCount = CONTRACT_CI_CHECKS.filter((c) => c.status === "pass").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Shared Contracts & Data Models"
        desc="Single source of truth for every canonical type across the PANTHEON suite. One Pydantic definition → generated TypeScript. The five services import — they never redefine."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="accent">{CANONICAL_TYPES.length} types</Chip>
            <Chip tone="pos" dot>CI gate active</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="CANONICAL TYPES"
          value={CANONICAL_TYPES.length.toString()}
          sub="All versioned · semver — never breaking without bump"
          tone="accent"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="TOTAL FIELDS"
          value={totalFields.toString()}
          sub="Across all models · generated to TypeScript"
          icon={<Icon name="doc" width={15} height={15} />}
        />
        <KpiCard
          label="RECENT BREAKING Δ"
          value={breakingCount.toString()}
          sub="Required version bump · gate enforced"
          tone={breakingCount > 0 ? "warn" : "pos"}
          icon={<Icon name="warn" width={15} height={15} />}
        />
        <KpiCard
          label="CI GATE PASS RATE"
          value={`${passCount} / ${CONTRACT_CI_CHECKS.length}`}
          sub="Last 5 contract-compat checks"
          tone="pos"
          icon={<Shield width={15} height={15} />}
        />
      </div>

      {/* Canonical types table */}
      <Panel>
        <PanelHeader
          title="Canonical Type Catalog"
          sub="Imported by all five services — version-controlled, never forked"
          right={<Chip tone="accent">{CANONICAL_TYPES.length} types · one source</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Version</Th>
                <Th right>Fields</Th>
                <Th>Consumers (imports)</Th>
                <Th>Last Change</Th>
                <Th>Breaking?</Th>
              </tr>
            </thead>
            <tbody>
              {CANONICAL_TYPES.map((t) => (
                <tr key={t.name} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false}>
                    <span className="font-mono text-xs font-semibold text-ink">{t.name}</span>
                  </Td>
                  <Td mono className="text-accent text-xs">v{t.version}</Td>
                  <Td right className="text-muted">{t.fields}</Td>
                  <Td mono={false}>
                    <div className="flex flex-wrap gap-1">
                      {ALL_CONSUMERS.map((c) => (
                        <span
                          key={c}
                          className={`chip text-[9px] ${t.consumers.includes(c) ? CONSUMER_COLOR[c] : "opacity-15"}`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td mono className="text-dim text-xs">{t.lastChange}</Td>
                  <Td mono={false}>
                    {t.breaking ? (
                      <Chip tone="warn" className="text-[9px]">BREAKING</Chip>
                    ) : (
                      <Check width={13} height={13} className="text-pos" />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-dim">
          <Icon name="lock" width={13} height={13} className="shrink-0 text-faint" />
          Faded consumer badges = type not consumed by that service. Versions follow semver; a breaking rename requires MAJOR bump.
        </div>
      </Panel>

      {/* Pydantic ↔ TypeScript side-by-side */}
      <Panel>
        <PanelHeader
          title="Pydantic → TypeScript Generation"
          sub="Security type · v1.4.0 · 22 fields — representative sample"
          right={<Chip tone="accent">atlas-contracts generate --lang ts</Chip>}
        />
        <div className="grid gap-px bg-line md:grid-cols-2">
          {/* Pydantic */}
          <div className="bg-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pos" />
                <span className="font-mono text-[10px] text-muted">contracts/src/security.py</span>
              </div>
              <Chip tone="pos" className="text-[9px]">SOURCE</Chip>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-muted">
              <code>{PYDANTIC_SAMPLE}</code>
            </pre>
          </div>
          {/* TypeScript */}
          <div className="bg-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="font-mono text-[10px] text-muted">contracts/dist/security.ts</span>
              </div>
              <Chip tone="accent" className="text-[9px]">GENERATED</Chip>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-muted">
              <code>{TYPESCRIPT_SAMPLE}</code>
            </pre>
          </div>
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          <span className="text-accent font-mono">atlas-contracts generate</span> runs in CI on every contracts/ change.
          Generated files are committed to the repo — services get type safety without an extra build step.
          Consumers pin to a contracts package version in pyproject.toml / package.json.
        </div>
      </Panel>

      {/* Semver + compat rules */}
      <Panel>
        <PanelHeader
          title="Versioning & Backward-Compatibility Rules"
          right={<Chip tone="info">Enforced in CI</Chip>}
        />
        <div className="grid gap-px bg-line md:grid-cols-2">
          {COMPAT_RULES.map((r) => (
            <div key={r.title} className="bg-panel p-4">
              <div className="flex items-start gap-2.5">
                {r.tone === "pos"
                  ? <Check width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
                  : <Warn  width={13} height={13} className="mt-0.5 shrink-0 text-warn" />}
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">{r.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{r.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {[
              { label: "PATCH (x.y.Z)", desc: "Bug fix, docs, no field changes", tone: "text-pos" },
              { label: "MINOR (x.Y.z)", desc: "Add optional field, add new type", tone: "text-pos" },
              { label: "MAJOR (X.y.z)", desc: "Remove, rename, or change type of any field", tone: "text-warn" },
            ].map((v) => (
              <div key={v.label}>
                <div className={`font-mono text-[10px] font-semibold ${v.tone}`}>{v.label}</div>
                <div className="mt-0.5 text-[11px] text-dim">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* CI Contract-Compat Gate */}
      <Panel>
        <PanelHeader
          title="CI Contract-Compat Gate — Recent Checks"
          sub="atlas-contracts check --backwards-compat — runs on every PR touching contracts/"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>{passCount} passed</Chip>
              <Chip tone={CONTRACT_CI_CHECKS.filter(c => c.status === "fail").length > 0 ? "neg" : "pos"}>
                {CONTRACT_CI_CHECKS.filter(c => c.status === "fail").length} failed
              </Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] border-collapse">
            <thead>
              <tr>
                <Th>Check ID</Th>
                <Th>Branch / Ref</Th>
                <Th>Type</Th>
                <Th>Change Description</Th>
                <Th>Timestamp (UTC)</Th>
                <Th>Actor</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {CONTRACT_CI_CHECKS.map((c) => (
                <tr
                  key={c.id}
                  className={`group transition-colors hover:bg-elevated/40 ${c.status === "fail" ? "bg-neg/5" : ""}`}
                >
                  <Td mono className="text-accent text-xs">{c.id}</Td>
                  <Td mono className="text-xs text-dim">{c.ref}</Td>
                  <Td mono={false}>
                    <span className="chip text-[9px]">{c.type}</span>
                  </Td>
                  <Td mono={false} className="max-w-[280px] text-xs text-muted">{c.change}</Td>
                  <Td mono className="text-xs text-dim whitespace-nowrap">{c.ts}</Td>
                  <Td mono className="text-xs text-dim">{c.actor}</Td>
                  <Td mono={false}>
                    {c.status === "pass" ? (
                      <Chip tone="pos" className="text-[9px]">PASS</Chip>
                    ) : (
                      <Chip tone="neg" className="text-[9px]">FAIL</Chip>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          A FAIL blocks the PR merge. The fix is to either make the change backward-compatible (add as optional field)
          or bump the semver MAJOR version and update all consumers in the same PR. No exceptions.
        </div>
      </Panel>
    </div>
  );
}
