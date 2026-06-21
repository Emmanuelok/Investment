import { binanceKlines } from "@/lib/markets/providers";
import { buildCryptoRegime, type CoinSeries } from "@/lib/engine/crypto-regime";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const COINS: { pair: string; id: string; label: string }[] = [
  { pair: "BTCUSDT", id: "btc", label: "Bitcoin" },
  { pair: "ETHUSDT", id: "eth", label: "Ethereum" },
  { pair: "SOLUSDT", id: "sol", label: "Solana" },
  { pair: "BNBUSDT", id: "bnb", label: "BNB" },
  { pair: "XRPUSDT", id: "xrp", label: "XRP" },
  { pair: "ADAUSDT", id: "ada", label: "Cardano" },
  { pair: "DOGEUSDT", id: "doge", label: "Dogecoin" },
  { pair: "AVAXUSDT", id: "avax", label: "Avalanche" },
  { pair: "LINKUSDT", id: "link", label: "Chainlink" },
];

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(COINS.map(async (c) => ({ ...c, closes: (await binanceKlines(c.pair, 320)).map((b) => b.c) })));
    type Resolved = { pair: string; id: string; label: string; closes: number[] };
    const series: CoinSeries[] = settled
      .filter((r): r is PromiseFulfilledResult<Resolved> => r.status === "fulfilled" && r.value.closes.length >= 60)
      .map((r) => ({ id: r.value.id, label: r.value.label, closes: r.value.closes }));
    if (series.length < 4 || !series.some((s) => s.id === "btc")) throw new Error(`insufficient crypto series (${series.length})`);

    const report = buildCryptoRegime(series);
    return Response.json({ live: true, source: "engine·Binance", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
