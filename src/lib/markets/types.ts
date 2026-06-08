import type { Candle } from "@/lib/rng";
import type { IndexQuote, SectorPerf, MoverRow, FxRow, RateRow, CryptoRow } from "@/lib/data/obsidian";

export type MarketsLive = {
  live: true;
  source: "yahoo" | "twelvedata";
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
