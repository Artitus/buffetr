import {
  fetchBitcoinHistory,
  fetchBlockchainBitcoin,
  fetchFearGreedIndex,
  fetchFredSeries,
  fetchGoldFutures,
  fetchPaxGoldHistory,
  FRED_SERIES,
} from "@/lib/data-sources";
import { loadHistoricalSeed } from "@/lib/seed/load-historical";
import { mergeSeries, normalizeSeries, type SeriesPoint } from "@/lib/series";
import { getMetrics, type MetricType } from "@/lib/supabase";

const EMPTY: SeriesPoint[] = [];

/**
 * Full public span for All. Seed and any stored tail are merged on top so a
 * short cache cannot erase the older prints.
 *
 * Bitcoin: Blockchain.com daily market price from 2009, then CoinGecko's
 * latest year. CoinGecko's public API rejects every window older than 365 days.
 * Gold: futures back to 2000. There is no gold seed. Pax Gold covers a year
 * only when the long read fails.
 */
export async function loadFullHistory(metric: MetricType): Promise<SeriesPoint[]> {
  const [seed, pub, stored] = await Promise.all([
    seedLayer(metric),
    publicLayer(metric),
    storedLayer(metric),
  ]);
  return mergeSeries(mergeSeries(seed, pub), stored);
}

export function historyIsComplete(metric: MetricType, count: number): boolean {
  switch (metric) {
    case "bitcoin":
    case "gold":
    case "yield_curve":
      return count >= 1000;
    case "fear_greed":
    case "mortgage_rate":
      return count >= 400;
    case "home_price_index":
    case "federal_debt":
      return count >= 200;
    default:
      return count >= 2;
  }
}

async function seedLayer(metric: MetricType): Promise<SeriesPoint[]> {
  const seed = await loadHistoricalSeed(metric);
  return seed?.length ? normalizeSeries(seed) : EMPTY;
}

async function storedLayer(metric: MetricType): Promise<SeriesPoint[]> {
  try {
    const rows = await getMetrics(metric, 20000);
    return normalizeSeries(rows);
  } catch {
    return EMPTY;
  }
}

async function publicLayer(metric: MetricType): Promise<SeriesPoint[]> {
  switch (metric) {
    case "bitcoin":
      return bitcoinLayer();
    case "gold":
      return goldLayer();
    case "fear_greed":
      return fearLayer();
    case "buffett_indicator":
      return fredLayer(FRED_SERIES.BUFFETT_INDICATOR, "1970-01-01");
    case "home_price_index":
      return fredLayer(FRED_SERIES.HOME_PRICE_INDEX, "1980-01-01");
    case "federal_debt":
      return fredLayer(FRED_SERIES.FEDERAL_DEBT, "1960-01-01");
    case "yield_curve":
      return fredLayer(FRED_SERIES.YIELD_CURVE_10Y2Y, "1976-01-01");
    case "mortgage_rate":
      return fredLayer(FRED_SERIES.MORTGAGE_30Y, "1971-01-01");
    default:
      return EMPTY;
  }
}

async function bitcoinLayer(): Promise<SeriesPoint[]> {
  const [long, tail] = await Promise.all([
    fetchBlockchainBitcoin(),
    fetchBitcoinHistory(365),
  ]);
  return mergeSeries(normalizeSeries(long), normalizeSeries(tail));
}

async function goldLayer(): Promise<SeriesPoint[]> {
  const futures = normalizeSeries(await fetchGoldFutures());
  if (futures.length >= 2) return futures;
  return normalizeSeries(await fetchPaxGoldHistory(365));
}

async function fearLayer(): Promise<SeriesPoint[]> {
  const rows = await fetchFearGreedIndex(0);
  return normalizeSeries(rows);
}

async function fredLayer(seriesId: string, start: string): Promise<SeriesPoint[]> {
  const points = await fetchFredSeries(seriesId, start, undefined, 100000);
  return normalizeSeries(points);
}
