import { NextResponse } from "next/server";
import {
  bulkUpsertMetrics,
  getLatestRecordedAt,
  type MetricType,
} from "@/lib/supabase";
import {
  FRED_SERIES,
  fetchCapeHistory,
  fetchFearGreedIndex,
  fetchFredSeries,
  fetchBitcoinHistory,
  fetchMetalsLive,
  fetchPaxGoldHistory,
} from "@/lib/data-sources";
import { loadHistoricalSeed } from "@/lib/seed/load-historical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type SeriesResult = { success: boolean; count: number; error?: string };
type Point = {
  date: string;
  value: number;
  metadata?: Record<string, unknown>;
};

const SEEDED: MetricType[] = [
  "buffett_indicator",
  "m2_real",
  "cpi",
  "federal_debt",
  "federal_interest",
  "home_price_index",
  "mortgage_rate",
  "sp500",
  "yield_curve",
  "credit_spread",
  "margin_debt",
  "cape",
  "bitcoin",
  "fear_greed",
];

const FRED_TAILS: Array<[string, MetricType, string]> = [
  ["buffett", "buffett_indicator", FRED_SERIES.BUFFETT_INDICATOR],
  ["mortgage", "mortgage_rate", FRED_SERIES.MORTGAGE_30Y],
  ["homePrice", "home_price_index", FRED_SERIES.HOME_PRICE_INDEX],
  ["sp500", "sp500", FRED_SERIES.SP500],
  ["m2Real", "m2_real", FRED_SERIES.M2_REAL],
  ["federalDebt", "federal_debt", FRED_SERIES.FEDERAL_DEBT],
  ["federalInterest", "federal_interest", FRED_SERIES.FEDERAL_INTEREST],
  ["marginDebt", "margin_debt", FRED_SERIES.MARGIN_DEBT],
  ["yieldCurve", "yield_curve", FRED_SERIES.YIELD_CURVE_10Y2Y],
  ["creditSpread", "credit_spread", FRED_SERIES.CREDIT_SPREAD],
];

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function spanDays(fromDay: string | null, fallback: number): number {
  if (!fromDay) return fallback;
  const elapsed = Date.now() - new Date(`${fromDay}T00:00:00.000Z`).getTime();
  const days = Math.ceil(elapsed / 86_400_000) + 2;
  return Math.min(400, Math.max(2, days));
}

function byDay(points: Array<{ date: string; value: number }>): Point[] {
  const values = new Map<string, number>();
  for (const point of points) {
    if (!Number.isFinite(point.value)) continue;
    values.set(point.date.slice(0, 10), point.value);
  }
  return [...values.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}

async function seedIfEmpty(
  metricType: MetricType,
  results: Record<string, SeriesResult>
): Promise<string | null> {
  const existing = await getLatestRecordedAt(metricType);
  if (existing) return existing;

  const seed = await loadHistoricalSeed(metricType);
  if (!seed?.length) return null;

  const points = byDay(seed).map((point) => ({
    ...point,
    metadata: { source: "historical_seed" },
  }));
  const success = await storePoints(metricType, points);
  results[`seed:${metricType}`] = {
    success,
    count: points.length,
    error: success ? undefined : "Seed upsert failed",
  };
  if (!success || points.length === 0) return null;
  return points[points.length - 1].date;
}

async function storePoints(
  metricType: MetricType,
  points: Point[]
): Promise<boolean> {
  if (points.length === 0) return true;
  return bulkUpsertMetrics(
    points.map((point) => ({
      metric_type: metricType,
      value: point.value,
      recorded_at: new Date(`${point.date.slice(0, 10)}T00:00:00.000Z`),
      metadata: point.metadata,
    }))
  );
}

async function storeTail(
  label: string,
  metricType: MetricType,
  points: Point[],
  watermark: string | null,
  results: Record<string, SeriesResult>
): Promise<void> {
  const fresh = points.filter(
    (point) => Number.isFinite(point.value) && (!watermark || point.date > watermark)
  );
  if (fresh.length === 0) {
    results[label] = { success: true, count: 0 };
    return;
  }
  const success = await storePoints(metricType, fresh);
  results[label] = {
    success,
    count: fresh.length,
    error: success ? undefined : "Upsert failed",
  };
}

function withYoy(points: Point[]): Point[] {
  return points.map((point) => {
    const itemDate = new Date(`${point.date}T00:00:00.000Z`);
    const yearAgo = points.find((earlier) => {
      const earlierDate = new Date(`${earlier.date}T00:00:00.000Z`);
      const monthDiff =
        (itemDate.getUTCFullYear() - earlierDate.getUTCFullYear()) * 12 +
        (itemDate.getUTCMonth() - earlierDate.getUTCMonth());
      return monthDiff >= 11 && monthDiff <= 13;
    });
    const yoyChange = yearAgo
      ? ((point.value - yearAgo.value) / yearAgo.value) * 100
      : undefined;
    return {
      ...point,
      metadata:
        yoyChange === undefined
          ? { source: "fred_csv" }
          : { source: "fred_csv", yoyChange },
    };
  });
}

function btcGoldRatio(bitcoin: Point[], gold: Point[]): Point[] {
  const sortedGold = [...gold].sort((a, b) => a.date.localeCompare(b.date));
  let goldIndex = 0;
  const ratios: Point[] = [];
  for (const btc of [...bitcoin].sort((a, b) => a.date.localeCompare(b.date))) {
    while (
      goldIndex + 1 < sortedGold.length &&
      sortedGold[goldIndex + 1].date <= btc.date
    ) {
      goldIndex++;
    }
    const ounce = sortedGold[goldIndex];
    if (!ounce || ounce.date > btc.date || ounce.value <= 0) continue;
    ratios.push({
      date: btc.date,
      value: btc.value / ounce.value,
      metadata: { source: "computed" },
    });
  }
  return ratios;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, SeriesResult> = {};
  const watermarks = new Map<MetricType, string | null>();

  try {
    for (const metricType of SEEDED) {
      watermarks.set(metricType, await seedIfEmpty(metricType, results));
    }
    for (const metricType of ["gold", "silver", "btc_gold_ratio"] as const) {
      watermarks.set(metricType, await getLatestRecordedAt(metricType));
    }

    await Promise.all(
      FRED_TAILS.map(async ([label, metricType, seriesId]) => {
        const watermark = watermarks.get(metricType) ?? null;
        const start = watermark ?? shiftDays(todayUtc(), -120);
        const points = byDay(
          await fetchFredSeries(seriesId, start)
        ).map((point) => ({
          ...point,
          metadata: { source: "fred_csv" },
        }));
        await storeTail(label, metricType, points, watermark, results);
      })
    );

    const cpiWatermark = watermarks.get("cpi") ?? null;
    const cpiStart = cpiWatermark
      ? shiftDays(cpiWatermark, -400)
      : shiftDays(todayUtc(), -500);
    const cpi = withYoy(byDay(await fetchFredSeries(FRED_SERIES.CPI, cpiStart)));
    await storeTail("cpi", "cpi", cpi, cpiWatermark, results);

    const capeWatermark = watermarks.get("cape") ?? null;
    const cape = byDay(await fetchCapeHistory()).map((point) => ({
      ...point,
      metadata: { source: "cape" },
    }));
    await storeTail("cape", "cape", cape, capeWatermark, results);

    const bitcoinWatermark = watermarks.get("bitcoin") ?? null;
    const bitcoin = byDay(
      await fetchBitcoinHistory(spanDays(bitcoinWatermark, 120))
    ).map((point) => ({
      ...point,
      metadata: { source: "coingecko" },
    }));
    await storeTail("bitcoin", "bitcoin", bitcoin, bitcoinWatermark, results);

    const goldWatermark = watermarks.get("gold") ?? null;
    const gold = byDay(
      await fetchPaxGoldHistory(spanDays(goldWatermark, 365))
    ).map((point) => ({
      ...point,
      metadata: { source: "coingecko" },
    }));
    await storeTail("gold", "gold", gold, goldWatermark, results);

    const spot = await withTimeout(fetchMetalsLive(), 5000);
    if (spot) {
      const spotDay = spot.timestamp.toISOString().slice(0, 10);
      await storeTail(
        "silver",
        "silver",
        [{ date: spotDay, value: spot.silver, metadata: { source: "metals" } }],
        watermarks.get("silver") ?? null,
        results
      );
      await storeTail(
        "goldSpot",
        "gold",
        [{ date: spotDay, value: spot.gold, metadata: { source: "metals" } }],
        goldWatermark,
        results
      );
    } else {
      results.silver = { success: false, count: 0, error: "No metals spot" };
    }

    const fearWatermark = watermarks.get("fear_greed") ?? null;
    const fear = await fetchFearGreedIndex(spanDays(fearWatermark, 30));
    await storeTail(
      "fearGreed",
      "fear_greed",
      fear.map((point) => ({
        date: point.date,
        value: point.value,
        metadata: { source: "fear_greed", classification: point.classification },
      })),
      fearWatermark,
      results
    );

    await storeTail(
      "btcGold",
      "btc_gold_ratio",
      btcGoldRatio(bitcoin, gold),
      watermarks.get("btc_gold_ratio") ?? null,
      results
    );

    const anySuccess = Object.values(results).some((result) => result.success);

    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? "War-room metrics updated"
        : "No metrics stored — check API keys and service role",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    );
  }
}
