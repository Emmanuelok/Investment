# PANTHEON Intelligence Engine

PANTHEON ships a stack of **real, deterministic compute engines** — not mock
data. Every figure rendered by an engine surface is *computed* from a price
series, a covariance matrix, or a closed-form model. When a live market feed is
reachable the engines run on real data; otherwise they run the identical math on
a deterministic seeded series and say so honestly (`ENGINE · DEMO DATA`).

- **Pure math, fully tested** — `src/lib/engine/*`, **251 unit tests** (`*.test.ts`).
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
| `beneish.ts` | Beneish M-Score earnings-manipulation detector (8 indices) | `beneishMScore` |
| `stress.ts` | Portfolio stress test — 8 calibrated crisis scenarios, asset-class shocks | `computeStress, applyScenario, SCENARIOS` |
| `options-strategy.ts` | Multi-leg options payoff/value curves, net Greeks, breakevens, 9 presets | `analyzeStrategy, presetLegs` |
| `factor-attribution.ts` | Multivariate OLS: alpha + market/size/value/momentum/quality/low-vol betas | `attributeReturns, multiRegress` |
| `rrg.ts` | Relative-Rotation-Graph — JdK RS-Ratio/Momentum + quadrant | `computeRRG, quadrantOf` |
| `yield-curve.ts` | Treasury curve slope (2s10s/3m10s), curvature, level, implied forwards, shape classification | `analyzeCurve, forwardRate` |
| `insider.ts` | SEC Form 4 parser — transaction classification (P/S/A/M/F/G/C) + net buy/sell summary | `parseForm4, classifyCode, summarizeInsider` |
| `merton.ts` | Merton (1974) structural credit model — distance-to-default, default prob, credit spread, grade | `mertonModel, equityFromAsset, creditGrade, annualizedVol` |
| `nowcast.ts` | Macro nowcast — z-scored FRED indicators → Growth/Inflation/Labor composites + business-cycle quadrant | `buildNowcast, zLast, meanStd` |
| `efficiency.ts` | Market efficiency — Hurst R/S, Lo-MacKinlay variance ratios, autocorrelation → trend/mean-revert vote | `analyzeEfficiency, hurstRS, varianceRatio, autocorr` |
| `dividend-safety.ts` | Dividend safety — FCF coverage, payout ratio, net-debt/EBITDA → 0-100 score + flags | `dividendSafety` |
| `volatility.ts` | Range-based vol (Parkinson/Garman-Klass/Rogers-Satchell/Yang-Zhang) + volatility cone with percentile | `analyzeVolatility, yangZhangVol, volatilityCone` |
| `liquidity.ts` | Microstructure — Amihud illiquidity, Roll implied spread, dollar volume → liquidity score | `analyzeLiquidity, amihudIlliquidity, rollSpread` |
| `performance.ts` | Full-period risk-adjusted ratios — Sharpe/Sortino/Calmar/Omega/tail-ratio + skew/kurtosis | `performanceRatios, maxDrawdownOf` |
| `tangency.ts` | Markowitz max-Sharpe & GMV portfolios, efficient frontier, long-only active-set | `analyzeTangency, tangencyPortfolio, efficientFrontier, maxSharpe` |
| `credit-conditions.ts` | Credit-spread stress — percentile/z/momentum of ICE BofA OAS basket → 0-100 stress + regime | `buildCreditConditions, percentileOf` |
| `breadth.ts` | Market internals — % above 50/200-DMA, A/D line, McClellan oscillator, Zweig thrust → breadth score & regime | `computeBreadth, memberRead` |
| `correlation-regime.ts` | Cross-asset avg pairwise correlation, rolling percentile, equity-bond corr, effective bets → regime | `analyzeCorrelationRegime, avgPairwise` |
| `vix-term.ts` | VIX term structure (contango/backwardation), percentile, variance-risk premium → fear score & regime | `analyzeVixTerm` |
| `real-rates.ts` | Nominal = real (TIPS) + breakeven decomposition, 5y5y forward → real-rate & inflation regimes | `buildRealRates` |

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
| `/api/engine/stress` | Portfolio crisis-scenario stress test | `?holdings=SPY:0.5,TLT:0.3,GLD:0.2` |
| `/api/engine/factor-attribution` | Factor decomposition of returns (OLS on ETF proxies) | `?symbol=NVDA` |
| `/api/engine/rrg` | Sector-rotation relative-rotation graph | `?symbols=XLK,XLF&benchmark=SPY` |
| `/api/engine/yield-curve` | Treasury curve slope/curvature/forwards/shape (FRED) | — |
| `/api/engine/merton` | Distance-to-default credit risk (Finnhub + SEC + FRED) | `?symbol=NVDA` |
| `/api/engine/nowcast` | Macro nowcast business-cycle quadrant (13 FRED series) | — |
| `/api/engine/efficiency` | Hurst / variance-ratio trend vs mean-reversion (Stooq) | `?symbol=SPY` |
| `/api/engine/dividend-safety` | FCF-coverage dividend-safety score (SEC XBRL) | `?symbol=AAPL` |
| `/api/engine/volatility` | Range-based vol estimators + volatility cone (Stooq OHLC) | `?symbol=SPY` |
| `/api/engine/liquidity` | Amihud / Roll spread / dollar-volume liquidity (Stooq) | `?symbol=SPY` |
| `/api/engine/performance` | Sharpe/Sortino/Calmar/Omega ratio suite (Stooq + FRED rf) | `?symbol=SPY` |
| `/api/engine/tangency` | Max-Sharpe + GMV + efficient frontier (Stooq + FRED rf) | `?symbols=SPY,QQQ,TLT,GLD` |
| `/api/engine/credit-conditions` | ICE BofA OAS credit-stress regime (FRED) | — |
| `/api/engine/breadth` | Market-breadth internals over a large-cap basket (Stooq) | `?symbols=AAPL,MSFT,…` |
| `/api/engine/correlation-regime` | Cross-asset correlation regime / diversification (Stooq) | `?window=60` |
| `/api/engine/vix-term` | VIX term-structure & fear regime (FRED + Stooq) | — |
| `/api/engine/real-rates` | Real-yield / breakeven decomposition + regimes (FRED) | — |
| `/api/edgar/financials` | Real SEC XBRL financials + Piotroski/Altman/grade | `?symbol=AAPL` |
| `/api/edgar/insider` | Real SEC Form 4 insider transactions + net signal | `?symbol=NVDA` |

> Bonds & position-sizing are pure-math (no feed) and run entirely client-side — no route needed.

---

## Where the engines surface

| Page | Engine panels |
|---|---|
| `/` (home) | **Intelligence Briefing** — cross-engine fusion (regime + macro + factor leaders + anomalies + composite risk-posture gauge) |
| `/terminal` | Market Intelligence (regime + real sector breadth + insights) |
| `/terminal/screener` | Multi-Factor Scan |
| `/terminal/security` | Tech Panel + Seasonality + **Fundamental Quality** (Piotroski/Altman/earnings/Beneish/grade) + **Insider Activity** (Form 4) + **Credit Risk** (Merton DD) + **Liquidity** (Amihud/Roll) |
| `/charts` | Tech Panel + Seasonality + **Market Efficiency** (Hurst/VR) + **Sector Rotation (RRG)** |
| `/quant` | **DCF Valuation** (intrinsic value + sensitivity) |
| `/terminal/economics` | Macro Regime nowcast + **Treasury Yield Curve** + **Macro Nowcast** (cycle quadrant) + **Credit Conditions** (OAS stress) + **Real Rates** (TIPS decomposition) |
| `/signals` | Anomaly Scanner + Trend & RS Scanner + **Market Breadth** (internals / A-D / McClellan) |
| `/quant/backtest` | Strategy Backtest Lab |
| `/quant/strategies` | Options Pricer + Pairs/Stat-Arb + **Strategy Builder** (multi-leg) |
| `/risk` | Correlation Matrix + **Correlation Regime** (cross-asset) + Monte-Carlo + **Stress Test** (crisis scenarios) + **Volatility Lab** (estimators + cone) + **VIX / Fear** (term structure) |
| `/attribution` | Risk Analytics (rolling Sharpe/vol/beta + underwater drawdown) + **Performance Ratios** (Sharpe/Sortino/Calmar/Omega) |
| `/execution` | Position Sizer (Kelly, expectancy, stop-based sizing) |
| `/portfolio` | Portfolio Analytics + **Factor Attribution** (alpha/betas) |
| `/optimizer` | Portfolio Construction (equal / inverse-vol / risk-parity / min-variance) + **Tangency / Efficient Frontier** (max-Sharpe + CML) |

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
npm test          # 251 engine + quant unit tests
npm run build     # typecheck + production build
```

Every engine has correctness tests (e.g. Black-Scholes vs textbook values &
put-call parity; risk-parity equalizes risk contributions; backtest costs drag
returns; OU half-life matches theory; Monte-Carlo percentiles are ordered &
reproducible).
