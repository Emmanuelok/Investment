import { PageHeader } from "@/components/ui/kit";
import { LiveFilings } from "@/components/data/live-filings";

export const metadata = { title: "Filings & 13F — OBSIDIAN Terminal" };

export default function FilingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Filings & 13F Browser"
        desc="EDGAR filings browser, 13F institutional holdings tracker, and Form 4 insider transactions. Source: SEC EDGAR public feeds."
      />

      <LiveFilings />
    </div>
  );
}
