import { describe, it, expect } from "vitest";
import { coinRead, buildCryptoRegime, type CoinSeries } from "./crypto-regime";

const geo = (daily: number, n = 260, start = 100): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + daily, i));

describe("crypto-regime — coin read", () => {
  it("an uptrending coin sits above its averages with no drawdown", () => {
    const r = coinRead("btc", "Bitcoin", geo(0.004));
    expect(r).not.toBeNull();
    expect(r!.aboveSMA50).toBe(true);
    expect(r!.aboveSMA200).toBe(true);
    expect(r!.trend).toBe("Up");
    expect(r!.ret30d).toBeGreaterThan(0);
    expect(r!.drawdownFromHigh).toBeCloseTo(0, 6); // at the high
  });

  it("a downtrending coin sits below its averages in a drawdown", () => {
    const r = coinRead("btc", "Bitcoin", geo(-0.003));
    expect(r!.aboveSMA200).toBe(false);
    expect(r!.trend).toBe("Down");
    expect(r!.drawdownFromHigh).toBeLessThan(0);
  });

  it("returns null when history is too short", () => {
    expect(coinRead("x", "X", geo(0.001, 40))).toBeNull();
  });
});

describe("crypto-regime — regime & risk appetite", () => {
  it("BTC above its 200-DMA with positive momentum + alts leading reads Bull / Risk-on", () => {
    const series: CoinSeries[] = [
      { id: "btc", label: "Bitcoin", closes: geo(0.002) },
      { id: "eth", label: "Ethereum", closes: geo(0.004) }, // ETH outpaces BTC
      { id: "sol", label: "Solana", closes: geo(0.005) },
    ];
    const r = buildCryptoRegime(series);
    expect(r.btcRegime).toBe("Bull");
    expect(r.ethBtcChange30d).toBeGreaterThan(0);
    expect(r.riskAppetite).toBe("Risk-on");
    expect(r.breadthPct).toBe(100);
    expect(r.ethBtcRatio).not.toBeNull();
  });

  it("BTC below its 200-DMA reads Bear / Risk-off", () => {
    const series: CoinSeries[] = [
      { id: "btc", label: "Bitcoin", closes: geo(-0.003) },
      { id: "eth", label: "Ethereum", closes: geo(-0.004) },
    ];
    const r = buildCryptoRegime(series);
    expect(r.btcRegime).toBe("Bear");
    expect(r.riskAppetite).toBe("Risk-off");
  });

  it("breadth reflects the share of coins above their 200-DMA", () => {
    const series: CoinSeries[] = [
      { id: "btc", label: "Bitcoin", closes: geo(0.003) },
      { id: "eth", label: "Ethereum", closes: geo(0.002) },
      { id: "sol", label: "Solana", closes: geo(0.002) },
      { id: "ada", label: "Cardano", closes: geo(-0.003) }, // below
    ];
    expect(buildCryptoRegime(series).breadthPct).toBe(75);
  });
});
