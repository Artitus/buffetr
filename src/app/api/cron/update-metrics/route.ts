import { NextResponse } from "next/server";
import { bulkUpsertMetrics, type MetricType } from "@/lib/supabase";
import {
  fetchBuffettIndicatorData,
  fetchMortgageRate,
  fetchHomePriceIndex,
  fetchSP500,
  fetchMetalsPrices,
} from "@/lib/data-sources";

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

  const results: Record<string, { success: boolean; count: number; error?: string }> = {};

  try {
    // Fetch and store Buffett Indicator data
    const buffettData = await fetchBuffettIndicatorData();
    if (buffettData.length > 0) {
      const metrics = buffettData.slice(0, 30).map((d) => ({
        metric_type: "buffett_indicator" as MetricType,
        value: d.ratio,
        recorded_at: new Date(d.date),
        metadata: { marketCap: d.marketCap, gdp: d.gdp },
      }));

      // Also store market cap and GDP separately
      const marketCapMetrics = buffettData.slice(0, 30).map((d) => ({
        metric_type: "market_cap" as MetricType,
        value: d.marketCap,
        recorded_at: new Date(d.date),
      }));

      const gdpMetrics = buffettData.slice(0, 30).map((d) => ({
        metric_type: "gdp" as MetricType,
        value: d.gdp,
        recorded_at: new Date(d.date),
      }));

      const success = await bulkUpsertMetrics([
        ...metrics,
        ...marketCapMetrics,
        ...gdpMetrics,
      ]);
      results.buffett = { success, count: metrics.length };
    } else {
      results.buffett = { success: false, count: 0, error: "No data fetched" };
    }

    // Fetch and store mortgage rate
    const mortgageData = await fetchMortgageRate();
    if (mortgageData.length > 0) {
      const metrics = mortgageData.slice(0, 52).map((d) => ({
        metric_type: "mortgage_rate" as MetricType,
        value: d.value,
        recorded_at: new Date(d.date),
      }));
      const success = await bulkUpsertMetrics(metrics);
      results.mortgage = { success, count: metrics.length };
    } else {
      results.mortgage = { success: false, count: 0, error: "No data fetched" };
    }

    // Fetch and store home price index
    const homePriceData = await fetchHomePriceIndex();
    if (homePriceData.length > 0) {
      const metrics = homePriceData.slice(0, 36).map((d) => ({
        metric_type: "home_price_index" as MetricType,
        value: d.value,
        recorded_at: new Date(d.date),
      }));
      const success = await bulkUpsertMetrics(metrics);
      results.homePrice = { success, count: metrics.length };
    } else {
      results.homePrice = { success: false, count: 0, error: "No data fetched" };
    }

    // Fetch and store S&P 500
    const sp500Data = await fetchSP500();
    if (sp500Data.length > 0) {
      const metrics = sp500Data.slice(0, 30).map((d) => ({
        metric_type: "sp500" as MetricType,
        value: d.value,
        recorded_at: new Date(d.date),
      }));
      const success = await bulkUpsertMetrics(metrics);
      results.sp500 = { success, count: metrics.length };
    } else {
      results.sp500 = { success: false, count: 0, error: "No data fetched" };
    }

    // Fetch and store metals prices
    const metalsData = await fetchMetalsPrices();
    if (metalsData) {
      const metrics = [
        {
          metric_type: "gold" as MetricType,
          value: metalsData.gold,
          recorded_at: metalsData.timestamp,
        },
        {
          metric_type: "silver" as MetricType,
          value: metalsData.silver,
          recorded_at: metalsData.timestamp,
        },
      ];
      const success = await bulkUpsertMetrics(metrics);
      results.metals = { success, count: 2 };
    } else {
      results.metals = { success: false, count: 0, error: "No data fetched" };
    }

    return NextResponse.json({
      success: true,
      message: "Metrics updated successfully",
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

