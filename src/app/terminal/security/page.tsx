import { PageHeader, Ticker } from "@/components/ui/kit";
import { LiveCandleChart } from "@/components/markets/live-candle-chart";
import { LiveFundamentals } from "@/components/markets/live-fundamentals";

export const metadata = { title: "NVDA Security DES — OBSIDIAN Terminal" };

export default function SecurityDesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Security Description — DES"
        desc="Bloomberg DES replica. Full fundamental, ownership, estimate, and news deep-dive for a single name."
        right={<Ticker sym="NVDA" name="NVIDIA Corporation" />}
      />

      <LiveCandleChart symbol="NVDA" title="NVDA — Live" />

      <LiveFundamentals symbol="NVDA" />
    </div>
  );
}
