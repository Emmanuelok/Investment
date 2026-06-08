<div align="center">

# 👁 PANTHEON

### The Sovereign Finance OS — one terminal, every market, total intelligence.

An open, **AI-native** finance platform that fuses a multi-asset terminal, an
order-flow cockpit, an alt-data signal engine, a quant research lab, and an
institutional risk & execution OS into **one** point-in-time, self-hostable
product — with a glass-box AI copilot woven through every module.

*Capability that incumbents charge five-to-seven figures a year for — self-hosted, transparent, and fast.*

</div>

---

## Why PANTHEON

The market is fragmented and expensive. A 10-person desk can pay **$320k/yr** for
Bloomberg alone (~$31,980/seat); BlackRock Aladdin runs **$500k–$10M+/yr**;
AlphaSense is **$10–40k/seat**; risk models are black boxes; backtests are
silently overfit; order flow is faked; and your data is locked in someone
else's cloud. PANTHEON answers each of these head-on — see the **Why** page in
the app.

| Pain | PANTHEON |
|---|---|
| ~$32k/seat terminals, ~5% used | Modular workspaces, self-hosted, a fraction of the cost |
| Black-box risk (Barra/Aladdin) | **Glass-box** factor risk — every figure traceable & reproducible |
| Look-ahead bias in backtests | **Point-in-time** enforced (`as_of ≤ t`) by default |
| Overstated Sharpe ratios | **Deflated Sharpe + PBO** computed on every strategy |
| 8 vendor portals, no single book | **One book**: equities · rates · FX · crypto · alts · alt-data |
| AI that invents citations | **ATHENA** grounds every claim in sources — or says it doesn't know |
| Synthetic crypto order flow | **Real full-depth L2/L3** via free exchange websockets |
| Data can't leave the vendor | **Self-hostable / sovereign** — runs in your VPC |

## The five workspaces

- **ARGUS** — Alt-Data & Signals. Cross-signal alpha fused across disclosure,
  NLP/event, web, and consumer families; novelty, crowding, decay; MNPI
  quarantine; point-in-time lineage.
- **OBSIDIAN** — Terminal. Markets, security (DES), fundamentals & filings,
  screener, news & sentiment, economics — Bloomberg-class, on free data.
- **HELIOS** — Charts & Order Flow. GPU-grade charting plus footprint, liquidity
  heatmap, DOM, tape, and an AI scanner. *Never fakes order flow.*
- **KEPLER** — Quant Lab. Research → backtest → alpha factory → live, with
  **overfitting controls** as a first-class, loud feature.
- **AEGIS** — Risk & Execution. IBOR, transparent factor risk + VaR/ES + stress,
  pre/post-trade compliance, OMS/EMS with real algos + SOR + TCA, attribution,
  private markets, optimization.

…all bound to **ATHENA**, the cited, sovereign AI copilot, and an immutable
audit trail + PIT data lake.

## Tech & performance

- **Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind.**
- **Engineered light:** zero charting/UI dependencies — every visualization is
  hand-built SVG; server components by default; statically prerendered. First
  Load JS ≈ **100 kB**. It loads fast.
- Self-hosted fonts (`next/font`), `⌘K` command bar, live tape, and a
  streaming copilot dock.

> **Demo data.** The deployed UI runs on a deterministic, point-in-time demo
> fabric (clearly badged **DEMO DATA**), architected to plug into the real
> backends the master specs describe (FastAPI · Postgres/Timescale · DuckDB ·
> Redis · pgvector · QuantLib · cvxpy · CCXT · FIX · Anthropic Claude). Set keys
> in `.env` to light up live sources.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — UI runs with zero keys
npm run dev                  # http://localhost:3000
```

```bash
npm run build && npm run start   # production
```

## Deploy

Zero-config on **Vercel** — import the repo (Framework: Next.js) and deploy, or:

```bash
npx vercel --prod
```

## Repository map

```
src/
  app/                 # routes — one per workspace view (server components)
  components/
    shell/             # sidebar · topbar · command palette · live widgets · ticker
    ui/                # kit (panels, cards, tables) · viz (SVG charts) · candles
    copilot/           # ATHENA dock
    <module>/          # module-scoped components
  lib/
    data*.ts           # deterministic demo fabric
    rng.ts             # seeded PRNG + price/candle generators
    format.ts          # terminal-grade formatters
    nav.ts             # the unified suite navigation model
```

Codenames (ARGUS/OBSIDIAN/HELIOS/KEPLER/AEGIS/PANTHEON/ATHENA) are placeholders —
rename freely.

<div align="center"><sub>Glass-box numbers · point-in-time · cited AI · sovereign. No black boxes.</sub></div>
