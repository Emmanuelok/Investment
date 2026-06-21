/**
 * FX / dollar-regime engine. The US dollar is the world's risk thermostat: a
 * strong, rising dollar tightens global financial conditions (a headwind for
 * emerging markets, commodities and US exporters), while a weak dollar eases
 * them. From a dollar-index proxy and a basket of currency series it sets the
 * Strong/Neutral/Weak dollar regime (trend vs the 50/200-DMA + momentum +
 * historical percentile), ranks currencies by their strength versus the dollar,
 * and states the risk implication. Pure & deterministic.
 */

export type FxSeries = {
  id: string;
  label: string;
  closes: number[]; // currency vs USD (rising = currency strengthening vs the dollar)
};

export type FxRead = {
  id: string;
  label: string;
  ret1m: number;
  ret3m: number;
  ret6m: number;
  aboveSMA200: boolean;
  trend: "Up" | "Flat" | "Down";
};

export type DollarRegime = "Strong" | "Neutral" | "Weak";

export type DollarReport = {
  dollarRegime: DollarRegime;
  dollarRet1m: number;
  dollarRet3m: number;
  dollarAboveSMA200: boolean;
  dollarPercentile: number; // dollar-index level within its own history
  currencies: FxRead[]; // sorted strongest-vs-USD first
  strongest: string | null;
  weakest: string | null;
  riskImplication: string;
};

const H = { m1: 21, m3: 63, m6: 126 };
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function trailingReturn(closes: number[], days: number): number {
  const n = closes.length;
  if (n <= days) return 0;
  const a = closes[n - 1 - days];
  const b = closes[n - 1];
  return a > 0 && b > 0 ? (b / a - 1) * 100 : 0;
}

export function percentileOf(series: number[], value: number): number {
  if (!series.length) return 50;
  let below = 0;
  for (const x of series) if (x <= value) below++;
  return (below / series.length) * 100;
}

function sma200Above(closes: number[]): boolean {
  if (closes.length < 200) return closes[closes.length - 1] > mean(closes);
  return closes[closes.length - 1] > mean(closes.slice(-200));
}

export function buildDollarRegime(dollarCloses: number[], currencies: FxSeries[]): DollarReport {
  const dollarRet1m = trailingReturn(dollarCloses, H.m1);
  const dollarRet3m = trailingReturn(dollarCloses, H.m3);
  const dollarAboveSMA200 = sma200Above(dollarCloses);
  const dollarPercentile = dollarCloses.length ? percentileOf(dollarCloses.slice(-504), dollarCloses[dollarCloses.length - 1]) : 50;

  const dollarRegime: DollarRegime = dollarAboveSMA200 && dollarRet3m > 0 ? "Strong" : !dollarAboveSMA200 && dollarRet3m < 0 ? "Weak" : "Neutral";

  const reads: FxRead[] = currencies
    .filter((c) => c.closes.length > H.m1 + 1)
    .map((c) => {
      const ret1m = trailingReturn(c.closes, H.m1);
      const ret3m = trailingReturn(c.closes, H.m3);
      const ret6m = trailingReturn(c.closes, H.m6);
      const trend: FxRead["trend"] = ret3m > 1 ? "Up" : ret3m < -1 ? "Down" : "Flat";
      return { id: c.id, label: c.label, ret1m, ret3m, ret6m, aboveSMA200: sma200Above(c.closes), trend };
    })
    .sort((a, b) => b.ret3m - a.ret3m);

  const riskImplication =
    dollarRegime === "Strong"
      ? "Tightening global conditions — a headwind for EM, commodities and US exporters (risk-off bias)."
      : dollarRegime === "Weak"
        ? "Easing global conditions — a tailwind for EM, commodities and reflation (risk-on bias)."
        : "Neutral dollar — mixed cross-asset impulse.";

  return {
    dollarRegime,
    dollarRet1m,
    dollarRet3m,
    dollarAboveSMA200,
    dollarPercentile,
    currencies: reads,
    strongest: reads.length ? reads[0].label : null,
    weakest: reads.length ? reads[reads.length - 1].label : null,
    riskImplication,
  };
}
