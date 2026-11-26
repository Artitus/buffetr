import { NextResponse } from "next/server";
import {
  getMetrics,
  getLatestMetric,
  isMetricType,
  METRIC_TYPES,
  type MetricType,
} from "@/lib/supabase";
import { fetchPublicMetricSeries } from "@/lib/public-metrics";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  try {
    if (latest) {
      const metric = await getLatestMetric(metricType);
      if (metric) {
        return NextResponse.json({ data: metric, source: "supabase" });
      }

      const pub = await fetchPublicMetricSeries(metricType, cappedLimit);
      if (pub?.data.length) {
        const last = pub.data[pub.data.length - 1];
        return NextResponse.json({
          data: last,
          source: pub.source,
          label: pub.label,
        });
      }

      return NextResponse.json(
        { error: "No data available", empty: true },
        { status: 404 }
      );
    }

    let metrics: Awaited<ReturnType<typeof getMetrics>> = [];
    try {
      metrics = await getMetrics(metricType, cappedLimit);
    } catch {
      metrics = [];
    }

    if (metrics.length > 0) {
      return NextResponse.json({
        data: metrics,
        count: metrics.length,
        metricType,
        empty: false,
        source: "supabase",
      });
    }

    const pub = await fetchPublicMetricSeries(metricType, cappedLimit);
    if (pub?.data.length) {
      // API historically returns newest-first from Supabase; keep that shape
      const newestFirst = [...pub.data].reverse();
      return NextResponse.json({
        data: newestFirst,
        count: newestFirst.length,
        metricType,
        empty: false,
        source: pub.source,
        label: pub.label,
      });
    }

    return NextResponse.json({
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
