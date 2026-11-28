import type { SeriesMap } from "@/lib/series";
import { normalizeSeries } from "@/lib/series";
import { RECEIPTS } from "@/lib/verdict";
import { loadHistoricalSeed } from "@/lib/seed/load-historical";

/**
 * Bundled historical series for the eight receipts. Local JSON only — this is
 * what the board paints before any public metric request returns.
 * Gold has no committed seed; that receipt stays blank until a live read lands.
 */
let cached: Promise<SeriesMap> | null = null;

export function loadBoardSeed(): Promise<SeriesMap> {
  if (!cached) {
    cached = readBoardSeed().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

async function readBoardSeed(): Promise<SeriesMap> {
  const loaded = await Promise.all(
    RECEIPTS.map(async (receipt) => {
      const points = await loadHistoricalSeed(receipt.metric);
      return [receipt.metric, normalizeSeries(points)] as const;
    })
  );

  const series: SeriesMap = {};
  for (const [metric, points] of loaded) {
    if (points.length > 0) series[metric] = points;
  }
  return series;
}
