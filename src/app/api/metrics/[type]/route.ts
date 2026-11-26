import { NextResponse } from "next/server";
import {
  getMetrics,
  getLatestMetric,
  isMetricType,
  METRIC_TYPES,
  type MetricType,
} from "@/lib/supabase";

export const runtime = "edge";

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

  try {
    if (latest) {
      const metric = await getLatestMetric(metricType);
      if (!metric) {
        return NextResponse.json(
          { error: "No data available", empty: true },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: metric });
    }

    const metrics = await getMetrics(metricType, Math.min(limit, 1000));

    return NextResponse.json({
      data: metrics,
      count: metrics.length,
      metricType,
      empty: metrics.length === 0,
    });
  } catch (error) {
    console.error(`Error fetching ${metricType}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
