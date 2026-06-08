import Anthropic from "@anthropic-ai/sdk";
import { CANDIDATES, SOURCES, watchlist } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMsg = { role: "user" | "athena"; text: string };

/** Compact, grounded context so ATHENA cites real platform state, never invents it. */
function platformContext(): string {
  const cands = CANDIDATES.slice(0, 6).map((c) => `${c.sym} z${c.z >= 0 ? "+" : ""}${c.z} IC${c.ic} crowd:${c.crowding} (${c.thesis})`).join("; ");
  const healthy = SOURCES.filter((s) => s.status === "healthy").length;
  const blocked = SOURCES.filter((s) => s.status === "blocked").map((s) => s.name).join(", ");
  const wl = watchlist().slice(0, 6).map((q) => `${q.sym} ${q.last} (${q.chg >= 0 ? "+" : ""}${q.chg.toFixed(1)}%)`).join(", ");
  return [
    `ARGUS top cross-signal candidates (point-in-time): ${cands}.`,
    `Sources: ${healthy}/${SOURCES.length} healthy; blocked/unlicensed: ${blocked || "none"}. Effective data spend ~$4,200/mo.`,
    `Watchlist tape (demo): ${wl}.`,
    `AEGIS demo risk: 1d 99% VaR ≈ $2.41M, factor model v3 (EWMA λ=0.94), Semiconductors the largest factor exposure.`,
    `HELIOS streams real full-depth crypto order flow (Binance WS, free); equities order flow needs a licensed feed.`,
    `KEPLER enforces point-in-time data and surfaces Deflated Sharpe + PBO on every backtest.`,
  ].join("\n");
}

const SYSTEM = `You are ATHENA, the AI copilot inside PANTHEON — a sovereign, AI-native multi-asset finance OS. Its workspaces: ARGUS (alt-data & signals), OBSIDIAN (terminal), HELIOS (charts & order flow), KEPLER (quant research), AEGIS (risk & execution), ATLAS (platform & ops).

You serve analysts, retail & institutional traders, economists, and portfolio managers. Rules:
- Be concise and precise — a few tight, high-signal sentences.
- Ground every factual claim in the PLATFORM CONTEXT below or in well-established finance knowledge; name the module or source you draw on (e.g. "AEGIS factor model", "ARGUS / EDGAR").
- If the data isn't available, say so plainly — never fabricate figures.
- This is a demo environment; market data is DEMO unless a live feed is noted (crypto order flow is live).
- Respond with the final answer only — do not narrate your reasoning steps.`;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ configured: false });
  }

  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const history = (body.messages ?? []).filter((m) => m.text?.trim()).slice(-12);
  const messages = history.map((m) => ({ role: (m.role === "athena" ? "assistant" : "user") as "user" | "assistant", content: m.text }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "expected a trailing user message" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: key });
  const model = process.env.ATHENA_MODEL || "claude-opus-4-8";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(`data: ${s}\n\n`));
      try {
        const llm = client.messages.stream({
          model,
          max_tokens: 1024,
          system: `${SYSTEM}\n\nPLATFORM CONTEXT:\n${platformContext()}`,
          messages,
          // Opus 4.8: adaptive thinking only; effort low for snappy chat.
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
        } as unknown as Parameters<typeof client.messages.stream>[0]);

        for await (const event of llm) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(JSON.stringify({ t: event.delta.text }));
          }
        }
        send("[DONE]");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "ATHENA error";
        send(JSON.stringify({ error: msg }));
        send("[DONE]");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
