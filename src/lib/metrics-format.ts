import type { MetricType } from "@/lib/supabase";

export function buffettStatus(value: number): {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
  color: string;
} {
  if (value < 75) return { label: "UNDERVALUED", tone: "good", color: "#34d399" };
  if (value < 100) return { label: "FAIR VALUE", tone: "warn", color: "#fbbf24" };
  if (value < 140) return { label: "OVERVALUED", tone: "warn", color: "#fb923c" };
  return { label: "EXTREME", tone: "bad", color: "#fb7185" };
}

export function formatMetricValue(type: MetricType, value: number): string {
  switch (type) {
    case "buffett_indicator":
    case "mortgage_rate":
    case "yield_curve":
    case "credit_spread":
      return `${value.toFixed(2)}%`;
    case "cpi":
      return value.toFixed(1);
    case "m2_real":
    case "federal_debt":
    case "federal_interest":
    case "margin_debt":
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(2)}T`
        : value >= 1_000
          ? `${(value / 1_000).toFixed(1)}B`
          : value.toFixed(1);
    case "bitcoin":
    case "gold":
    case "silver":
    case "sp500":
      return value.toLocaleString("en-US", {
        maximumFractionDigits: value >= 1000 ? 0 : 2,
      });
    case "btc_gold_ratio":
      return `${value.toFixed(1)} oz`;
    case "cape":
      return value.toFixed(1);
    case "fear_greed":
      return `${Math.round(value)}`;
    case "home_price_index":
      return value.toFixed(1);
    default:
      return value.toFixed(2);
  }
}

export const SATELLITE_DEFS: Array<{
  id: MetricType;
  title: string;
  subtitle: string;
  accent: string;
  limit?: number;
}> = [
  {
    id: "m2_real",
    title: "Real M2",
    subtitle: "Money stock (real)",
    accent: "cyan",
  },
  {
    id: "cpi",
    title: "CPI",
    subtitle: "Consumer prices",
    accent: "rose",
  },
  {
    id: "federal_debt",
    title: "Federal Debt",
    subtitle: "Total public debt",
    accent: "amber",
  },
  {
    id: "federal_interest",
    title: "Interest Outlays",
    subtitle: "Federal interest",
    accent: "orange",
  },
  {
    id: "home_price_index",
    title: "Case-Shiller",
    subtitle: "National HPI",
    accent: "blue",
  },
  {
    id: "mortgage_rate",
    title: "30Y Mortgage",
    subtitle: "Fixed rate",
    accent: "indigo",
  },
  {
    id: "bitcoin",
    title: "Bitcoin",
    subtitle: "USD",
    accent: "yellow",
  },
  {
    id: "btc_gold_ratio",
    title: "BTC / Gold",
    subtitle: "Oz equivalent",
    accent: "amber",
  },
  {
    id: "margin_debt",
    title: "Margin Debt",
    subtitle: "Broker leverage",
    accent: "pink",
  },
  {
    id: "cape",
    title: "CAPE",
    subtitle: "Shiller PE10",
    accent: "violet",
  },
  {
    id: "fear_greed",
    title: "Fear & Greed",
    subtitle: "Crypto sentiment",
    accent: "emerald",
  },
  {
    id: "yield_curve",
    title: "Yield Curve",
    subtitle: "10Y − 2Y",
    accent: "teal",
  },
  {
    id: "credit_spread",
    title: "Credit Spread",
    subtitle: "Baa − 10Y",
    accent: "red",
  },
  {
    id: "sp500",
    title: "S&P 500",
    subtitle: "Index",
    accent: "lime",
  },
  {
    id: "gold",
    title: "Gold",
    subtitle: "USD / oz",
    accent: "amber",
  },
];
