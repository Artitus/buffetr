import { NextResponse } from "next/server";
import { getMetrics, getLatestMetric, type MetricType } from "@/lib/supabase";

export const runtime = "edge";

const VALID_METRIC_TYPES: MetricType[] = [
  "buffett_indicator",
  "gold",
  "silver",
  "sp500",
  "mortgage_rate",
  "home_price_index",
  "market_cap",
  "gdp",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  // Validate metric type
  if (!VALID_METRIC_TYPES.includes(type as MetricType)) {
    return NextResponse.json(
      {
        error: "Invalid metric type",
        validTypes: VALID_METRIC_TYPES,
      },
      { status: 400 }
    );
  }

  const metricType = type as MetricType;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const latest = searchParams.get("latest") === "true";
  const limit = parseInt(searchParams.get("limit") || "365", 10);

  try {
    if (latest) {
      const metric = await getLatestMetric(metricType);
      if (!metric) {
        return NextResponse.json(
          { error: "No data available" },
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
    });
  } catch (error) {
    console.error(`Error fetching ${metricType}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

