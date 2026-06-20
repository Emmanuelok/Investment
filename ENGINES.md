# PANTHEON Intelligence Engine

PANTHEON ships a stack of **real, deterministic compute engines** — not mock
data. Every figure rendered by an engine surface is *computed* from a price
series, a covariance matrix, or a closed-form model. When a live market feed is
reachable the engines run on real data; otherwise they run the identical math on
a deterministic seeded series and say so honestly (`ENGINE · DEMO DATA`).

- **Pure math, fully tested** — `src/lib/engine/*`, **115 unit tests** (`*.test.ts`).
- **Server routes** — `src/app/api/engine/*` fetch real candles/series and run the engines.
- **Interactive UIs** — `src/components/engine/*`, each with an honest `LIVE / DEMO` badge.

```
price/series feed ──▶ /api/engine/* (Node route) ──▶ engine lib (pure) ──▶ JSON
                                                          ▲
        client component (demo fallback runs the SAME lib) ┘
```

---

## Engine library (`src/lib/engine/`)

| Module | Computes | Key exports |
|---|---|---|
| `indicators.ts` | SMA, EMA, Wilder RSI, MACD, Bollinger, ATR, realized vol, max drawdown, swing levels, streaks, percentile rank | `sma, ema, rsi, macd, bollinger, atr, realizedVol, maxDrawdown, swingLevels, streak, percentileRank` |
| `regime.ts` | Trend / strength / vol-regime / momentum / confidence classifier | `classifyRegime` |
| `insights.ts` | Ranked, evidence-backed findings (every number computed) + one-line read | `deriveInsights, composeRead` |
| `patterns.ts` | Candlestick & price-action detection (engulfing, hammer, doji, gaps, inside bars…) | `detectPatterns` |
| `score.ts` | Momentum / trend / low-vol / mean-reversion factor scores + composite (0–100) | `factorScores` |
| `alerts.ts` | User-rule evaluation engine (price/%/RSI/SMA-cross) | `evaluateRules, defaultRules` |
| `backtest.ts` | Vectorized strategy backtester — 6 strategies, turnover-costed; Sharpe/Sortino/Calmar/DD/win-rate | `runBacktest, signal` |
| `options.ts` | Black-Scholes-Merton price + full Greeks + implied-vol solver + prob-ITM | `blackScholes, impliedVol, probITM` |
| `correlation.ts` | Pearson matrix over log returns, beta, historical VaR / ES | `correlationMatrix, beta, historicalVar` |
| `portfolio.ts` | Portfolio risk/return, VaR, per-asset risk contribution, diversification ratio | `analyzePortfolio` |
| `optimizer.ts` | Covariance estimation; equal / inverse-vol / risk-parity (ERC) / min-variance weights | `covarianceMatrix, buildWeights, riskContributions` |
| `pairs.ts` | OLS hedge ratio, spread z-score, Ornstein-Uhlenbeck half-life, trade signal | `analyzePair, halfLife, ols` |
| `anomaly.ts` | Volume spikes, return shocks, gaps, vol-regime expansion, range blow-outs | `detectAnomalies` |
| `macro.ts` | Growth×inflation quadrant + recession-risk nowcast | `classifyMacroRegime, seriesTrend` |
| `seasonality.ts` | Monthly & day-of-week return patterns from a dated series | `computeSeasonality` |
| `montecarlo.ts` | Seeded GBM simulation — terminal distribution, percentiles, path VaR | `simulateGBM` |
| `riskmetrics.ts` | Rolling Sharpe/vol/beta + drawdown profile (underwater, Ulcer index, episodes) | `rollingMetrics, drawdownAnalytics` |
| `bonds.ts` | Bond price, YTM, Macaulay/modified duration, convexity, DV01 (no feed) | `analyzeBond, yieldToMaturity, priceChangeForBpShift` |
| `sizing.ts` | Kelly, expectancy, risk-of-ruin, stop-based share sizing (no feed) | `kellyFraction, expectancy, riskOfRuin, positionSize` |
| `fundamental-score.ts` | Piotroski F-Score, Altman Z-Score, composite quality grade | `piotroskiFScore, altmanZScore, qualityGrade` |
| `dcf.ts` | Two-stage DCF intrinsic value + sensitivity grid (no feed) | `dcf, dcfSensitivity` |
| `relative-strength.ts` | Weighted momentum, RS line, RS new-high, RS rating (1–99) | `weightedMomentum, rsLine, rsRating, relativeReturn` |
| `trend-template.ts` | Minervini 8-point Stage-2 uptrend template | `trendTemplate` |
| `earnings-quality.ts` | Sloan accruals, cash conversion, earnings-quality grade | `earningsQuality` |

All engines are deterministic: same input → same output. The Monte-Carlo engine
is seeded, so even the stochastic simulation is reproducible.

---

## Server routes (`/api/engine/*`)

Each route validates symbols (`/^[A-Z0-9.^=-]{1,12}$/`), fetches real data
(Stooq candles → Yahoo fallback; FRED for macro), runs the engine, and returns
`{ live: true, source, asOf, … }`. On **any** failure it returns
`{ live: false }` so the client falls back to a clearly-labelled demo. Append
`?debug=1` to surface the underlying error.

| Route | Purpose | Example |
|---|---|---|
| `/api/engine/scan` | Multi-factor scan ranked by composite | `?symbols=SPY,NVDA,AAPL` |
| `/api/engine/backtest` | Strategy backtest on real candles | `?symbol=SPY&strategy=smaCross&fast=20&slow=50` |
| `/api/engine/correlation` | Correlation matrix + diversification | `?symbols=SPY,QQQ,TLT,GLD&window=90` |
| `/api/engine/portfolio` | Portfolio analytics | `?holdings=SPY:0.4,QQQ:0.3,TLT:0.3` |
| `/api/engine/seasonality` | Monthly / day-of-week patterns | `?symbol=SPY` |
| `/api/engine/pairs` | Pairs / stat-arb spread analysis | `?a=KO&b=PEP&window=90` |
| `/api/engine/anomaly` | Market-wide anomaly scan | `?symbols=SPY,QQQ,NVDA` |
| `/api/engine/macro` | Macro regime + recession nowcast (FRED) | — |
| `/api/engine/optimizer` | All 4 construction schemes over real covariance | `?symbols=SPY,QQQ,TLT,GLD` |
| `/api/engine/riskmetrics` | Rolling Sharpe/vol/beta + drawdown profile | `?symbol=SPY&window=63` |
| `/api/engine/trend` | Trend-template + RS-rating momentum scan | `?symbols=NVDA,AAPL&benchmark=SPY` |
| `/api/edgar/financials` | Real SEC XBRL financials + Piotroski/Altman/grade | `?symbol=AAPL` |

> Bonds & position-sizing are pure-math (no feed) and run entirely client-side — no route needed.

---

## Where the engines surface

| Page | Engine panels |
|---|---|
| `/` (home) | **Intelligence Briefing** — cross-engine fusion (regime + macro + factor leaders + anomalies + composite risk-posture gauge) |
| `/terminal` | Market Intelligence (regime + real sector breadth + insights) |
| `/terminal/screener` | Multi-Factor Scan |
| `/terminal/security` | Tech Panel + Seasonality + **Fundamental Quality** (Piotroski/Altman/earnings/grade) |
| `/charts` | Tech Panel + Seasonality |
| `/quant` | **DCF Valuation** (intrinsic value + sensitivity) |
| `/terminal/economics` | Macro Regime nowcast |
| `/signals` | Anomaly Scanner + Trend & RS Scanner |
| `/quant/backtest` | Strategy Backtest Lab |
| `/quant/strategies` | Options Pricer + Pairs / Stat-Arb |
| `/risk` | Correlation Matrix + Monte-Carlo Simulator |
| `/attribution` | Risk Analytics (rolling Sharpe/vol/beta + underwater drawdown) |
| `/execution` | Position Sizer (Kelly, expectancy, stop-based sizing) |
| `/portfolio` | Portfolio Analytics (risk contribution, VaR) |
| `/optimizer` | Portfolio Construction (equal / inverse-vol / risk-parity / min-variance) |

The alert bell in the shell is a live **rule engine**, and **ATHENA** (the AI
copilot) is grounded with live quotes + an engine-computed market regime read.

---

## Going live (env vars)

Engines run on demo math until a data feed is reachable from the server.

| Env var | Unlocks | Needed? |
|---|---|---|
| `FINNHUB_API_KEY` | Real-time quotes, news, fundamentals (server-grade) | **Recommended** |
| `SEC_EDGAR_USER_AGENT` | SEC filings (`"Name email"`) | Recommended |
| `FMP_API_KEY` / `TWELVEDATA_API_KEY` | Alternative fundamentals / quotes | Optional |

Candles (Stooq), FX (Frankfurter), crypto (Binance) and macro (FRED) need **no
key**. If a panel shows `DEMO` on deploy, hit its route with `?debug=1` to see
exactly which feed was unreachable.

---

## Testing

```bash
npm test          # 115 engine + quant unit tests
npm run build     # typecheck + production build
```

Every engine has correctness tests (e.g. Black-Scholes vs textbook values &
put-call parity; risk-parity equalizes risk contributions; backtest costs drag
returns; OU half-life matches theory; Monte-Carlo percentiles are ordered &
reproducible).
