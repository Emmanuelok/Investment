import { PageHeader } from "@/components/ui/kit";
import { LiveMacro } from "@/components/data/live-macro";

export const metadata = { title: "Economics — OBSIDIAN Terminal" };

export default function EconomicsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Economics — FRED Data Terminal"
        desc="Macro KPI deck, yield curve visualization, rates/inflation/growth/employment charts, recession indicators, and economic release calendar."
      />

      <LiveMacro />
    </div>
  );
}
