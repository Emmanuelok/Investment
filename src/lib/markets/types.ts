import type { Candle } from "@/lib/rng";
import type { IndexQuote, SectorPerf, MoverRow, FxRow, RateRow, CryptoRow } from "@/lib/data/obsidian";

export type MarketsLive = {
  live: true;
  source: string;
  asOf: string;
  marketState: string;
  indices: IndexQuote[];
  spy: { candles: Candle[]; open: number; high: number; low: number; volume: number; price: number };
  sectors: SectorPerf[];
  gainers: MoverRow[];
  losers: MoverRow[];
  fx: FxRow[];
  rates: RateRow[];
  crypto: CryptoRow[];
  vol: { vix: number; skew: number };
  partial: string[];
};

export type MarketsResponse = MarketsLive | { live: false; error?: string };

export type Fundamentals = {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  price?: number;
  marketCap?: number;
  sharesOut?: number;
  peTrailing?: number;
  peForward?: number;
  pegRatio?: number;
  priceToBook?: number;
  eps?: number;
  beta?: number;
  dividendYield?: number; // percent
  profitMargin?: number; // percent
  grossMargin?: number; // percent
  operatingMargin?: number; // percent
  revenue?: number;
  revenueGrowth?: number; // percent
  roe?: number; // percent
  debtToEquity?: number;
  week52High?: number;
  week52Low?: number;
  targetMean?: number;
  targetHigh?: number;
  targetLow?: number;
  recommendation?: string;
};

export type FundamentalsResponse =
  | { live: true; source: string; asOf: string; fundamentals: Fundamentals }
  | { live: false; error?: string };

