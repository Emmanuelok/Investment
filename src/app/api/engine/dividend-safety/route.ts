import type { NextRequest } from "next/server";
import { cikFor, companyFacts, latestAnnual, type CompanyFacts } from "@/lib/markets/edgar";
import { dividendSafety, type DivInput } from "@/lib/engine/dividend-safety";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
type Alias = [string, string][];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "AAPL").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const co = await cikFor(symbol);
    if (!co) throw new Error(`no CIK for ${symbol}`);
    const facts = await companyFacts(co.cik);

    const val = (aliases: Alias): number => latestAnnual(facts as CompanyFacts, aliases)?.val ?? 0;
    const fyOf = (aliases: Alias): number | undefined => latestAnnual(facts as CompanyFacts, aliases)?.fy;

    const dividends = val([["us-gaap", "PaymentsOfDividendsCommonStock"], ["us-gaap", "PaymentsOfDividends"]]);
    const buybacks = val([["us-gaap", "PaymentsForRepurchaseOfCommonStock"]]);
    const netIncome = val([["us-gaap", "NetIncomeLoss"]]);
    const operatingCashFlow = val([
      ["us-gaap", "NetCashProvidedByUsedInOperatingActivities"],
      ["us-gaap", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
    ]);
    const capex = val([
      ["us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment"],
      ["us-gaap", "PaymentsToAcquireProductiveAssets"],
    ]);
    const ltdNon = val([["us-gaap", "LongTermDebtNoncurrent"]]);
    const ltdCur = val([["us-gaap", "LongTermDebtCurrent"]]);
    const ltdAll = val([["us-gaap", "LongTermDebt"]]);
    const totalDebt = ltdNon + ltdCur > 0 ? ltdNon + ltdCur : ltdAll;
    const cash = val([
      ["us-gaap", "CashAndCashEquivalentsAtCarryingValue"],
      ["us-gaap", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
    ]);
    const ebit = val([["us-gaap", "OperatingIncomeLoss"]]);
    const da = val([
      ["us-gaap", "DepreciationDepletionAndAmortization"],
      ["us-gaap", "DepreciationAmortizationAndAccretionNet"],
      ["us-gaap", "DepreciationAndAmortization"],
    ]);
    const ebitda = ebit + da;

    if (operatingCashFlow === 0 && netIncome === 0) throw new Error("no cash-flow facts");

    const input: DivInput = { dividends, buybacks, netIncome, operatingCashFlow, capex, totalDebt, cash, ebitda };
    const result = dividendSafety(input);
    const fiscalYear = fyOf([["us-gaap", "NetCashProvidedByUsedInOperatingActivities"]]) ?? fyOf([["us-gaap", "NetIncomeLoss"]]);

    return Response.json({
      live: true,
      source: "engine·SEC",
      asOf: new Date().toISOString(),
      symbol,
      name: facts.entityName ?? co.title,
      fiscalYear,
      inputs: input,
      ...result,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
