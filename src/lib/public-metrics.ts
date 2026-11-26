/**
 * Public metric fetchers — no Supabase / FRED_API_KEY required.
 * Prefer live public APIs; fall back to committed historical seed so the board
 * never stays empty when upstream times out (common on Edge + FRED CSV).
 */

import type { MetricType } from "@/lib/supabase";
import {
  fetchBuffettIndicatorData,
  fetchMortgageRate,
  fetchHomePriceIndex,
  fetchSP500,
  fetchM2Real,
  fetchCPI,
  fetchFederalDebt,
  fetchFederalInterest,
  fetchMarginDebt,
  fetchCreditSpread,
  fetchYieldCurveSeries,
  fetchBitcoinHistory,
  fetchPaxGoldHistory,
  fetchFearGreedIndex,
  fetchCapeHistory,
  fetchMetalsPrices,
} from "@/lib/data-sources";
import { loadHistoricalSeed } from "@/lib/seed/load-historical";

export type PublicMetricPoint = {
  id: number;
  metric_type: MetricType;
  value: number;
  recorded_at: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PublicMetricsResult = {
  data: PublicMetricPoint[];
  source: "public_live" | "historical_seed";
  label: string;
};

function toIsoDay(date: string): string {
  if (date.includes("T")) return date;
  return `${date}T00:00:00.000Z`;
}

function wrap(
  metricType: MetricType,
  points: Array<{ date: string; value: number; metadata?: Record<string, unknown> }>,
  limit: number,
  source: "public_live" | "historical_seed"
): PublicMetricPoint[] {
  const sorted = [...points]
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const sliced = sorted.slice(-Math.min(limit, 1000));

  return sliced.map((p, i) => ({
    id: i + 1,
    metric_type: metricType,
    value: p.value,
    recorded_at: toIsoDay(p.date),
    metadata: {
      ...(p.metadata || {}),
      source,
    },
    created_at: new Date().toISOString(),
  }));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}

async function goldSeries(): Promise<
  Array<{ date: string; value: number; metadata?: Record<string, unknown> }>
> {
  const paxg = await withTimeout(fetchPaxGoldHistory(365), 6000);
  if (paxg && paxg.length > 0) {
    return paxg.map((p) => ({
      ...p,
      metadata: { proxy: "pax-gold", note: "PAXG ≈ USD/oz via CoinGecko" },
    }));
  }
  const metals = await withTimeout(fetchMetalsPrices(), 4000);
  if (metals) {
    return [
      {
        date: metals.timestamp.toISOString(),
        value: metals.gold,
        metadata: { proxy: "metals.live spot" },
      },
    ];
  }
  return [];
}

async function livePoints(
  metricType: MetricType,
  limit: number
): Promise<Array<{ date: string; value: number; metadata?: Record<string, unknown> }> | null> {
  switch (metricType) {
    case "buffett_indicator": {
      const data = await withTimeout(fetchBuffettIndicatorData(), 7000);
      return data
        ? data.map((d) => ({
            date: d.date,
            value: d.ratio,
            metadata: { note: "FRED DDDM01USA156NWDB (typically annual)" },
          }))
        : null;
    }
    case "mortgage_rate":
      return withTimeout(fetchMortgageRate(), 7000);
    case "home_price_index":
      return withTimeout(fetchHomePriceIndex(), 7000);
    case "sp500":
      return withTimeout(fetchSP500(), 7000);
    case "m2_real":
      return withTimeout(fetchM2Real(), 7000);
    case "cpi": {
      const cpi = await withTimeout(fetchCPI(), 7000);
      return cpi
        ? cpi.map((d) => ({
            date: d.date,
            value: d.value,
            metadata:
              d.yoyChange !== undefined ? { yoyChange: d.yoyChange } : undefined,
          }))
        : null;
    }
    case "federal_debt":
      return withTimeout(fetchFederalDebt(), 7000);
    case "federal_interest":
      return withTimeout(fetchFederalInterest(), 7000);
    case "margin_debt":
      return withTimeout(fetchMarginDebt(), 7000);
    case "credit_spread":
      return withTimeout(fetchCreditSpread(), 7000);
    case "yield_curve":
      return withTimeout(fetchYieldCurveSeries(), 7000);
    case "bitcoin":
      return withTimeout(fetchBitcoinHistory(Math.min(limit, 365)), 8000);
    case "gold":
      return goldSeries();
    case "silver": {
      const metals = await withTimeout(fetchMetalsPrices(), 4000);
      if (!metals) return null;
      return [
        {
          date: metals.timestamp.toISOString(),
          value: metals.silver,
          metadata: { proxy: "metals.live spot" },
        },
      ];
    }
    case "btc_gold_ratio": {
      const [btc, gold] = await Promise.all([
        withTimeout(fetchBitcoinHistory(365), 8000),
        goldSeries(),
      ]);
      if (!btc?.length || !gold.length) return null;
      const sortedGold = [...gold].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let gi = 0;
      const points: Array<{ date: string; value: number }> = [];
      for (const b of btc) {
        while (
          gi + 1 < sortedGold.length &&
          sortedGold[gi + 1].date.split("T")[0] <= b.date
        ) {
          gi++;
        }
        const g = sortedGold[gi]?.value;
        if (g && g > 0) points.push({ date: b.date, value: b.value / g });
      }
      return points;
    }
    case "fear_greed": {
      const fg = await withTimeout(
        fetchFearGreedIndex(Math.min(limit, 90)),
        6000
      );
      return fg
        ? fg.map((d) => ({
            date: d.date,
            value: d.value,
            metadata: { classification: d.classification },
          }))
        : null;
    }
    case "cape":
      return withTimeout(fetchCapeHistory(), 8000);
    default:
      return null;
  }
}

export async function fetchPublicMetricSeries(
  metricType: MetricType,
  limit: number = 365
): Promise<PublicMetricsResult | null> {
  const live = await livePoints(metricType, limit);
  if (live && live.length > 0) {
    return {
      data: wrap(metricType, live, limit, "public_live"),
      source: "public_live",
      label:
        "Public live feed (FRED CSV / CoinGecko / Alt.me) — configure Supabase + cron to persist",
    };
  }

  const seed = await loadHistoricalSeed(metricType);
  if (seed && seed.length > 0) {
    return {
      data: wrap(metricType, seed, limit, "historical_seed"),
      source: "historical_seed",
      label:
        "Historical seed (real FRED/market series snapshot) — not mocked; will refresh when public live / cron is available",
    };
  }

  return null;
}
