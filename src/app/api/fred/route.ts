export const runtime = "nodejs";

/** FRED series to fetch. */
const CORE_SERIES = ["FEDFUNDS", "DGS3MO", "DGS2", "DGS10", "DGS30", "CPIAUCSL", "UNRATE", "GDPC1", "T10Y2Y"] as const;
const CURVE_SERIES = ["DGS1MO", "DGS6MO", "DGS1", "DGS5"] as const;
const ALL_SERIES = [...CORE_SERIES, ...CURVE_SERIES] as const;
type SeriesId = (typeof ALL_SERIES)[number];

export interface SeriesData {
  latest: number;
  prev: number;
  points: { date: string; value: number }[];
}

export interface FredResponse {
  live: true;
  series: Partial<Record<SeriesId, SeriesData>>;
  cpiYoY: number | null;
}

export interface FredError {
  live: false;
}

function parseCsv(csv: string): { date: string; value: number }[] {
  const lines = csv.trim().split("\n");
  // Skip header row (DATE,<ID>)
  const result: { date: string; value: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const comma = line.indexOf(",");
    if (comma < 0) continue;
    const date = line.slice(0, comma).trim();
    const raw = line.slice(comma + 1).trim();
    // "." means missing data in FRED CSVs
    if (raw === ".") continue;
    const value = parseFloat(raw);
    if (!isFinite(value)) continue;
    result.push({ date, value });
  }
  return result;
}

async function fetchSeries(id: string): Promise<SeriesData | null> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Pantheon/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const csv = await res.text();
    const all = parseCsv(csv);
    if (all.length < 2) return null;
    // Last ~60 valid points
    const points = all.slice(-60);
    const latest = points[points.length - 1].value;
    const prev = points[points.length - 2].value;
    return { latest, prev, points };
  } catch {
    return null;
  }
}

export async function GET(): Promise<Response> {
  try {
    // Fetch all series in parallel
    const results = await Promise.all(ALL_SERIES.map((id) => fetchSeries(id)));

    const series: Partial<Record<SeriesId, SeriesData>> = {};
    ALL_SERIES.forEach((id, i) => {
      const data = results[i];
      if (data) series[id] = data;
    });

    // Require at least the core rate series to consider it "live"
    const coreOk = (["FEDFUNDS", "DGS10"] as SeriesId[]).some((id) => series[id] != null);
    if (!coreOk) {
      return Response.json({ live: false } satisfies FredError);
    }

    // CPI YoY: latest vs value ~12 months prior (12 points back in monthly series)
    let cpiYoY: number | null = null;
    const cpiData = series["CPIAUCSL"];
    if (cpiData && cpiData.points.length >= 13) {
      const pts = cpiData.points;
      const latestVal = pts[pts.length - 1].value;
      const priorVal = pts[pts.length - 13].value;
      if (priorVal !== 0) {
        cpiYoY = ((latestVal - priorVal) / priorVal) * 100;
      }
    }

    return Response.json({ live: true, series, cpiYoY } satisfies FredResponse);
  } catch {
    return Response.json({ live: false } satisfies FredError);
  }
}
