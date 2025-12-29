/**
 * Data Sources Index
 * Central export for all data source clients
 */

export * from "./fred";
export * from "./metals";

// Aggregate function to fetch all metrics at once
import { fetchBuffettIndicatorData, fetchMortgageRate, fetchHomePriceIndex, fetchSP500 } from "./fred";
import { fetchMetalsPrices, getMockMetalsPrices } from "./metals";

export interface AllMetricsData {
  buffettIndicator: Array<{ date: string; marketCap: number; gdp: number; ratio: number }>;
  mortgageRate: Array<{ date: string; value: number }>;
  homePriceIndex: Array<{ date: string; value: number }>;
  sp500: Array<{ date: string; value: number }>;
  metals: { gold: number; silver: number; timestamp: Date } | null;
}

export async function fetchAllMetrics(): Promise<AllMetricsData> {
  const [buffettIndicator, mortgageRate, homePriceIndex, sp500, metals] =
    await Promise.all([
      fetchBuffettIndicatorData(),
      fetchMortgageRate(),
      fetchHomePriceIndex(),
      fetchSP500(),
      fetchMetalsPrices(),
    ]);

  return {
    buffettIndicator,
    mortgageRate,
    homePriceIndex,
    sp500,
    metals: metals || getMockMetalsPrices(),
  };
}

