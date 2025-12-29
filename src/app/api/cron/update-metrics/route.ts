import { NextResponse } from "next/server";
import { bulkUpsertMetrics, type MetricType } from "@/lib/supabase";
import { fetchBuffettIndicatorData } from "@/lib/data-sources";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Verify cron secret for security
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron or authorized
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch ALL Buffett Indicator data from FRED (10+ years)
    const buffettData = await fetchBuffettIndicatorData();
    
    if (buffettData.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data fetched from FRED. Check FRED_API_KEY.",
      }, { status: 500 });
    }

    // Store ALL data points
    const metrics = buffettData.map((d) => ({
      metric_type: "buffett_indicator" as MetricType,
      value: d.ratio,
      recorded_at: new Date(d.date),
    }));

    const success = await bulkUpsertMetrics(metrics);

    return NextResponse.json({
      success,
      message: `Stored ${metrics.length} Buffett Indicator data points`,
      count: metrics.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
