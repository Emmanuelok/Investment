import Anthropic from "@anthropic-ai/sdk";
import { CANDIDATES, SOURCES, watchlist } from "@/lib/data";
import { finnhubQuote, binance24h, stooqCandles, hasFinnhub } from "@/lib/markets/providers";
import { composeRead } from "@/lib/engine/insights";
import type { Candle } from "@/lib/rng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMsg = { role: "user" | "athena"; text: string };

/**
 * Live market grounding — real quotes + an engine-computed SPY regime read.
 * Every figure is fetched or computed; on any failure the section says so
 * plainly instead of inventing numbers.
 */
async function liveContext(): Promise<string> {
  const lines: string[] = [];
  const [eq, btc, spyBars] = await Promise.allSettled([
    hasFinnhub()
      ? Promise.allSettled(["SPY", "QQQ", "NVDA"].map(async (s) => ({ s, q: await finnhubQuote(s) })))
      : Promise.reject(new Error("no FINNHUB_API_KEY")),
    binance24h("BTCUSDT"),
    stooqCandles("SPY"),
  ]);
  if (eq.status === "fulfilled") {
    const ok = eq.value.filter((r): r is PromiseFulfilledResult<{ s: string; q: Awaited<ReturnType<typeof finnhubQuote>> }> => r.status === "fulfilled").map((r) => r.value);
    if (ok.length) lines.push(`Real-time quotes (Finnhub): ${ok.map(({ s, q }) => `${s} ${q.price.toFixed(2)} (${q.chgPct >= 0 ? "+" : ""}${q.chgPct.toFixed(2)}%)`).join(", ")}.`);
  }
  if (btc.status === "fulfilled") lines.push(`BTC spot (Binance): $${btc.value.price.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${btc.value.chgPct >= 0 ? "+" : ""}${btc.value.chgPct.toFixed(2)}% 24h).`);
  if (spyBars.status === "fulfilled") {
    const candles: Candle[] = spyBars.value.slice(-260).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
    lines.push(`Engine read (computed from daily closes, Stooq): ${composeRead("SPY", candles)}`);
  }
  return lines.length
    ? `LIVE MARKET CONTEXT (fetched now — cite as live):\n${lines.join("\n")}`
    : "LIVE MARKET CONTEXT: live feeds unreachable from this deployment right now — treat all market figures as demo and say so if asked.";
}

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
- Market figures: anything in LIVE MARKET CONTEXT is real and current — cite it as live. Everything else is DEMO; never present demo figures as live.
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

  // Ground ATHENA in live market state when feeds are reachable (≤8s, fail-soft).
  const live = await liveContext().catch(() => "LIVE MARKET CONTEXT: unavailable.");

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(`data: ${s}\n\n`));
      try {
        const llm = client.messages.stream({
          model,
          max_tokens: 1024,
          system: `${SYSTEM}\n\nPLATFORM CONTEXT:\n${platformContext()}\n\n${live}`,
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
