import { NextResponse } from "next/server";
import { bulkUpsertMetrics, type MetricType } from "@/lib/supabase";
import {
  fetchBuffettIndicatorData,
  fetchMortgageRate,
  fetchHomePriceIndex,
  fetchSP500,
  fetchMetalsPrices,
  fetchM2Real,
  fetchCPI,
  fetchFederalDebt,
  fetchFederalInterest,
  fetchMarginDebt,
  fetchCreditSpread,
  fetchYieldCurveSeries,
  fetchGoldUsd,
  fetchBitcoinHistory,
  fetchFearGreedIndex,
  fetchCapeHistory,
} from "@/lib/data-sources";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SeriesResult = { success: boolean; count: number; error?: string };

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

async function ingestSeries(
  label: string,
  metricType: MetricType,
  points: Array<{ date: string; value: number; metadata?: Record<string, unknown> }>,
  results: Record<string, SeriesResult>
): Promise<void> {
  if (points.length === 0) {
    results[label] = { success: false, count: 0, error: "No data fetched" };
    return;
  }

  const metrics = points.map((d) => ({
    metric_type: metricType,
    value: d.value,
    recorded_at: new Date(d.date),
    metadata: d.metadata,
  }));

  const success = await bulkUpsertMetrics(metrics);
  results[label] = { success, count: metrics.length };
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, SeriesResult> = {};

  try {
    // Buffett Indicator (full history)
    const buffettData = await fetchBuffettIndicatorData();
    await ingestSeries(
      "buffett",
      "buffett_indicator",
      buffettData.map((d) => ({ date: d.date, value: d.ratio })),
      results
    );

    // Housing
    await ingestSeries(
      "mortgage",
      "mortgage_rate",
      await fetchMortgageRate(),
      results
    );
    await ingestSeries(
      "homePrice",
      "home_price_index",
      await fetchHomePriceIndex(),
      results
    );

    // Equities
    await ingestSeries("sp500", "sp500", await fetchSP500(), results);

    // Monetary / inflation
    await ingestSeries("m2Real", "m2_real", await fetchM2Real(), results);
    const cpiData = await fetchCPI();
    await ingestSeries(
      "cpi",
      "cpi",
      cpiData.map((d) => ({
        date: d.date,
        value: d.value,
        metadata: d.yoyChange !== undefined ? { yoyChange: d.yoyChange } : undefined,
      })),
      results
    );

    // Federal balance sheet
    await ingestSeries(
      "federalDebt",
      "federal_debt",
      await fetchFederalDebt(),
      results
    );
    await ingestSeries(
      "federalInterest",
      "federal_interest",
      await fetchFederalInterest(),
      results
    );

    // Leverage / valuation
    await ingestSeries(
      "marginDebt",
      "margin_debt",
      await fetchMarginDebt(),
      results
    );
    await ingestSeries("cape", "cape", await fetchCapeHistory(), results);

    // Rates / credit stress
    await ingestSeries(
      "yieldCurve",
      "yield_curve",
      await fetchYieldCurveSeries(),
      results
    );
    await ingestSeries(
      "creditSpread",
      "credit_spread",
      await fetchCreditSpread(),
      results
    );

    // Metals (spot) + historical gold for ratios
    const metalsData = await fetchMetalsPrices();
    if (metalsData) {
      const success = await bulkUpsertMetrics([
        {
          metric_type: "gold",
          value: metalsData.gold,
          recorded_at: metalsData.timestamp,
        },
        {
          metric_type: "silver",
          value: metalsData.silver,
          recorded_at: metalsData.timestamp,
        },
      ]);
      results.metals = { success, count: 2 };
    } else {
      // Fallback: FRED gold history
      const goldHist = await fetchGoldUsd();
      await ingestSeries("gold", "gold", goldHist, results);
      results.metals = {
        success: goldHist.length > 0,
        count: goldHist.length,
        error: goldHist.length ? undefined : "No metals data",
      };
    }

    const goldHist = await fetchGoldUsd();
    if (goldHist.length > 0 && !results.gold) {
      // Keep a denser gold series for BTC/gold even when spot metals worked
      await ingestSeries("goldHist", "gold", goldHist.slice(-500), results);
    }

    // Bitcoin + BTC/gold
    const btcHistory = await fetchBitcoinHistory(365);
    await ingestSeries("bitcoin", "bitcoin", btcHistory, results);

    if (btcHistory.length > 0 && goldHist.length > 0) {
      const goldMap = new Map(goldHist.map((g) => [g.date, g.value]));
      // Forward-fill gold to nearest prior date for daily BTC
      const sortedGold = [...goldHist].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      let gi = 0;
      const ratios: Array<{ date: string; value: number }> = [];
      for (const btc of btcHistory) {
        while (
          gi + 1 < sortedGold.length &&
          sortedGold[gi + 1].date <= btc.date
        ) {
          gi++;
        }
        const g = goldMap.get(btc.date) ?? sortedGold[gi]?.value;
        if (g && g > 0) {
          ratios.push({ date: btc.date, value: btc.value / g });
        }
      }
      await ingestSeries("btcGold", "btc_gold_ratio", ratios, results);
    } else if (btcHistory.length > 0 && metalsData?.gold) {
      const latest = btcHistory[btcHistory.length - 1];
      await ingestSeries(
        "btcGold",
        "btc_gold_ratio",
        [{ date: latest.date, value: latest.value / metalsData.gold }],
        results
      );
    } else {
      results.btcGold = {
        success: false,
        count: 0,
        error: "Missing BTC or gold for ratio",
      };
    }

    // Fear & Greed
    const fg = await fetchFearGreedIndex(90);
    await ingestSeries(
      "fearGreed",
      "fear_greed",
      fg.map((d) => ({
        date: d.date,
        value: d.value,
        metadata: { classification: d.classification },
      })),
      results
    );

    const anySuccess = Object.values(results).some((r) => r.success);

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
