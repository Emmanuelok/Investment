import { PageHeader } from "@/components/ui/kit";
import { LiveCandleChart } from "@/components/markets/live-candle-chart";
import { LiveChartPanel } from "@/components/live/live-chart-panel";

export const metadata = { title: "HELIOS — Charting Engine" };

export default function ChartsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "HELIOS · Charts & Order Flow", tone: "info" }}
        title="Charting Engine — interactive"
        desc="Multi-timeframe candlestick engine with indicators, overlays, and drawing tools. 60fps GPU rendering when live feed is enabled."
      />

      <LiveCandleChart title="Live Equity Chart" presets={["SPY", "NVDA", "AAPL", "MSFT", "TSLA", "AMD"]} />

      <LiveChartPanel />
    </div>
  );
}
