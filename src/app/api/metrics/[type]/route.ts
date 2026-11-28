import { NextResponse } from "next/server";
import {
  getMetrics,
  getLatestMetric,
  isMetricType,
  METRIC_TYPES,
  type MetricType,
} from "@/lib/supabase";
import { historyIsComplete, loadFullHistory } from "@/lib/full-history";
import { loadHistoricalSeed } from "@/lib/seed/load-historical";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

const SEED_LABEL =
  "Historical seed (real FRED/market series snapshot) — not mocked; will refresh when public live / cron is available";

function cachedJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

function toIsoDay(date: string): string {
  if (date.includes("T")) return date;
  return `${date}T00:00:00.000Z`;
}

async function seedPoints(metricType: MetricType, limit: number) {
  const seed = await loadHistoricalSeed(metricType);
  if (!seed?.length) return [];

  return [...seed]
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((point, index) => ({
      id: index + 1,
      metric_type: metricType,
      value: point.value,
      recorded_at: toIsoDay(point.date),
      metadata: { source: "historical_seed" },
      created_at: new Date().toISOString(),
    }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (!isMetricType(type)) {
    return NextResponse.json(
      {
        error: "Invalid metric type",
        validTypes: METRIC_TYPES,
      },
      { status: 400 }
    );
  }

  const metricType = type as MetricType;

  const { searchParams } = new URL(request.url);
  const latest = searchParams.get("latest") === "true";
  const limit = parseInt(searchParams.get("limit") || "365", 10);
  const cappedLimit = Math.min(limit, 1000);

  if (searchParams.get("history") === "all") {
    try {
      const data = await loadFullHistory(metricType);
      return NextResponse.json(
        {
          data,
          count: data.length,
          metricType,
          empty: data.length === 0,
          source: "history",
        },
        {
          headers: {
            "Cache-Control": historyIsComplete(metricType, data.length)
              ? CACHE_CONTROL
              : "no-store",
          },
        }
      );
    } catch (error) {
      console.error(`Error loading full ${metricType} history:`, error);
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: 500 }
      );
    }
  }

  try {
    if (latest) {
      const metric = await getLatestMetric(metricType);
      if (metric) {
        return cachedJson({ data: metric, source: "supabase" });
      }

      const seeded = await seedPoints(metricType, cappedLimit);
      const last = seeded.at(-1);
      if (last) {
        return cachedJson({
          data: last,
          source: "historical_seed",
          label: SEED_LABEL,
        });
      }

      return cachedJson(
        { error: "No data available", empty: true },
        404
      );
    }

    let metrics: Awaited<ReturnType<typeof getMetrics>> = [];
    try {
      metrics = await getMetrics(metricType, cappedLimit);
    } catch {
      metrics = [];
    }

    if (metrics.length > 0) {
      return cachedJson({
        data: metrics,
        count: metrics.length,
        metricType,
        empty: false,
        source: "supabase",
      });
    }

    const seeded = await seedPoints(metricType, cappedLimit);
    if (seeded.length > 0) {
      const newestFirst = [...seeded].reverse();
      return cachedJson({
        data: newestFirst,
        count: newestFirst.length,
        metricType,
        empty: false,
        source: "historical_seed",
        label: SEED_LABEL,
      });
    }

    return cachedJson({
      data: [],
      count: 0,
      metricType,
      empty: true,
      source: "none",
    });
  } catch (error) {
    console.error(`Error fetching ${metricType}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
