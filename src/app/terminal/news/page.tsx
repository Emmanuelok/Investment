import { PageHeader } from "@/components/ui/kit";
import { LiveNews } from "@/components/markets/live-news";

export const metadata = { title: "News & Sentiment — OBSIDIAN Terminal" };

export default function NewsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="News & Sentiment"
        desc="RavenPack-lite real-time news stream with LLM sentiment scoring, event classification, novelty detection, and per-security sentiment leaders."
      />

      <LiveNews />
    </div>
  );
}
