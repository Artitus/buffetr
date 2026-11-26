/**
 * Public live metric fetchers — no Supabase / FRED_API_KEY required.
 * Used when the DB is empty so the war room still shows real charts.
 * Sources: FRED CSV (keyless), CoinGecko, Alternative.me, datahub CAPE, metals/PAXG.
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
  source: "public_live";
  label: string;
};

function toIsoDay(date: string): string {
  if (date.includes("T")) return date;
  return `${date}T00:00:00.000Z`;
}

function wrap(
  metricType: MetricType,
  points: Array<{ date: string; value: number; metadata?: Record<string, unknown> }>,
  limit: number
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
      source: "public_live",
    },
    created_at: new Date().toISOString(),
  }));
}

async function goldSeries(): Promise<
  Array<{ date: string; value: number; metadata?: Record<string, unknown> }>
> {
  const metals = await fetchMetalsPrices();
  const paxg = await fetchPaxGoldHistory(365);
  if (paxg.length > 0) {
    return paxg.map((p) => ({
      ...p,
      metadata: { proxy: "pax-gold", note: "PAXG ≈ USD/oz via CoinGecko" },
    }));
  }
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

export async function fetchPublicMetricSeries(
  metricType: MetricType,
  limit: number = 365
): Promise<PublicMetricsResult | null> {
  let points: Array<{ date: string; value: number; metadata?: Record<string, unknown> }> =
    [];

  switch (metricType) {
    case "buffett_indicator": {
      const data = await fetchBuffettIndicatorData();
      points = data.map((d) => ({
        date: d.date,
        value: d.ratio,
        metadata: { note: "FRED DDDM01USA156NWDB (typically annual)" },
      }));
      break;
    }
    case "mortgage_rate":
      points = await fetchMortgageRate();
      break;
    case "home_price_index":
      points = await fetchHomePriceIndex();
      break;
    case "sp500":
      points = await fetchSP500();
      break;
    case "m2_real":
      points = await fetchM2Real();
      break;
    case "cpi": {
      const cpi = await fetchCPI();
      points = cpi.map((d) => ({
        date: d.date,
        value: d.value,
        metadata:
          d.yoyChange !== undefined ? { yoyChange: d.yoyChange } : undefined,
      }));
      break;
    }
    case "federal_debt":
      points = await fetchFederalDebt();
      break;
    case "federal_interest":
      points = await fetchFederalInterest();
      break;
    case "margin_debt":
      points = await fetchMarginDebt();
      break;
    case "credit_spread":
      points = await fetchCreditSpread();
      break;
    case "yield_curve":
      points = await fetchYieldCurveSeries();
      break;
    case "bitcoin":
      points = await fetchBitcoinHistory(Math.min(limit, 365));
      break;
    case "gold":
      points = await goldSeries();
      break;
    case "silver": {
      const metals = await fetchMetalsPrices();
      if (metals) {
        points = [
          {
            date: metals.timestamp.toISOString(),
            value: metals.silver,
            metadata: { proxy: "metals.live spot" },
          },
        ];
      }
      break;
    }
    case "btc_gold_ratio": {
      const [btc, gold] = await Promise.all([
        fetchBitcoinHistory(365),
        goldSeries(),
      ]);
      if (!btc.length || !gold.length) break;
      const sortedGold = [...gold].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let gi = 0;
      for (const b of btc) {
        while (
          gi + 1 < sortedGold.length &&
          sortedGold[gi + 1].date.split("T")[0] <= b.date
        ) {
          gi++;
        }
        const g = sortedGold[gi]?.value;
        if (g && g > 0) {
          points.push({
            date: b.date,
            value: b.value / g,
            metadata: { note: "BTC / PAXG oz" },
          });
        }
      }
      break;
    }
    case "fear_greed": {
      const fg = await fetchFearGreedIndex(Math.min(limit, 90));
      points = fg.map((d) => ({
        date: d.date,
        value: d.value,
        metadata: { classification: d.classification },
      }));
      break;
    }
    case "cape":
      points = await fetchCapeHistory();
      break;
    case "market_cap":
    case "gdp":
      return null;
    default:
      return null;
  }

  const data = wrap(metricType, points, limit);
  if (data.length === 0) return null;

  return {
    data,
    source: "public_live",
    label: "Public live feed (FRED CSV / CoinGecko / Alt.me) — configure Supabase + cron to persist",
  };
}
