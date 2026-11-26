import type { MetricType } from "@/lib/supabase";

type SeedFile = {
  source: string;
  updated: string;
  points: Array<{ date: string; value: number }>;
};

const LOADERS: Partial<
  Record<MetricType, () => Promise<{ default: SeedFile }>>
> = {
  buffett_indicator: () => import("./historical/buffett_indicator.json"),
  m2_real: () => import("./historical/m2_real.json"),
  cpi: () => import("./historical/cpi.json"),
  federal_debt: () => import("./historical/federal_debt.json"),
  federal_interest: () => import("./historical/federal_interest.json"),
  home_price_index: () => import("./historical/home_price_index.json"),
  mortgage_rate: () => import("./historical/mortgage_rate.json"),
  sp500: () => import("./historical/sp500.json"),
  yield_curve: () => import("./historical/yield_curve.json"),
  credit_spread: () => import("./historical/credit_spread.json"),
  margin_debt: () => import("./historical/margin_debt.json"),
  cape: () => import("./historical/cape.json"),
  bitcoin: () => import("./historical/bitcoin.json"),
  fear_greed: () => import("./historical/fear_greed.json"),
};

export async function loadHistoricalSeed(
  metricType: MetricType
): Promise<Array<{ date: string; value: number }> | null> {
  const loader = LOADERS[metricType];
  if (!loader) return null;
  try {
    const mod = await loader();
    const points = mod.default?.points;
    return Array.isArray(points) && points.length ? points : null;
  } catch (error) {
    console.error(`Historical seed miss for ${metricType}:`, error);
    return null;
  }
}
