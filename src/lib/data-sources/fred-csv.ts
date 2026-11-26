/**
 * Keyless FRED CSV download (same endpoint as the site Download button).
 * Used when FRED_API_KEY is unset so the war room can still light up.
 * https://fred.stlouisfed.org/graph/fredgraph.csv?id=SERIES
 */

const FRED_CSV_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv";

function defaultStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 12);
  return d.toISOString().slice(0, 10);
}

export async function fetchFredCsvSeries(
  seriesId: string,
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<Array<{ date: string; value: number }>> {
  const params = new URLSearchParams({ id: seriesId });
  // Bound history so edge functions stay under timeout
  params.set("cosd", options?.startDate || defaultStartDate());
  if (options?.endDate) params.set("coed", options.endDate);

  try {
    const response = await fetch(`${FRED_CSV_BASE}?${params}`, {
      headers: {
        "User-Agent": "buffetr-war-room/1.0 (public dashboard; keyless CSV)",
        Accept: "text/csv",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`FRED CSV error: ${response.status}`);
    }

    const text = await response.text();
    if (text.trimStart().startsWith("<")) {
      throw new Error(`FRED CSV returned HTML for ${seriesId}`);
    }

    const lines = text.trim().split(/\r?\n/).slice(1);
    const points: Array<{ date: string; value: number }> = [];

    for (const line of lines) {
      const [date, raw] = line.split(",");
      if (!date || raw === undefined || raw === "" || raw === ".") continue;
      const value = parseFloat(raw);
      if (!Number.isFinite(value)) continue;
      points.push({ date: date.trim(), value });
    }

    if (options?.limit && points.length > options.limit) {
      return points.slice(-options.limit);
    }

    return points;
  } catch (error) {
    console.error(`Error fetching FRED CSV ${seriesId}:`, error);
    return [];
  }
}
