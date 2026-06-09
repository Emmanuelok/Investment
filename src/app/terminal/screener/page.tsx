import { PageHeader } from "@/components/ui/kit";
import { LiveScreener } from "@/components/markets/live-screener";

export const metadata = { title: "Screener / Scanner — OBSIDIAN Terminal" };

export default function ScreenerPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Screener & Scanner — interactive"
        desc="Multi-factor equity screen across 5,000+ securities. Filter by sector, fundamentals, technicals, and alt-data signals."
      />

      <LiveScreener />
    </div>
  );
}
