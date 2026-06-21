import { stooqCandles } from "@/lib/markets/providers";
import { buildSeasonalityCalendar, type DatedBar } from "@/lib/engine/seasonality-calendar";

export const runtime = "nodejs";
export const revalidate = 43200; // 12h (seasonality changes slowly)

const ASSETS: { sym: string; label: string }[] = [
  { sym: "SPY", label: "S&P 500" },
  { sym: "QQQ", label: "Nasdaq 100" },
  { sym: "IWM", label: "Small Caps" },
  { sym: "EFA", label: "Developed ex-US" },
  { sym: "EEM", label: "Emerging Markets" },
  { sym: "TLT", label: "Long Treasuries" },
  { sym: "GLD", label: "Gold" },
  { sym: "SLV", label: "Silver" },
  { sym: "USO", label: "Crude Oil" },
  { sym: "DBC", label: "Commodities" },
  { sym: "UUP", label: "US Dollar" },
  { sym: "VNQ", label: "Real Estate" },
];

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  const currentMonth = new Date().getUTCMonth() + 1;
  try {
    const settled = await Promise.allSettled(
      ASSETS.map(async (a) => ({ id: a.sym, label: a.label, bars: (await stooqCandles(a.sym)).map((b): DatedBar => ({ t: b.t, c: b.c })) })),
    );
    type Resolved = { id: string; label: string; bars: DatedBar[] };
    const inputs = settled
      .filter((r): r is PromiseFulfilledResult<Resolved> => r.status === "fulfilled" && r.value.bars.length > 200)
      .map((r) => r.value);
    if (inputs.length < 4) throw new Error(`too few assets resolved (${inputs.length})`);

    const report = buildSeasonalityCalendar(inputs, currentMonth);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
