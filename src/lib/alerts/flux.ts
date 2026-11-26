import type { MetricType } from "@/lib/supabase";

export type FluxSeverity = "info" | "watch" | "alert";

export interface MetricSample {
  metricType: MetricType;
  value: number;
  previousValue?: number;
  recordedAt: string;
}

export interface FluxRule {
  id: string;
  metricType: MetricType;
  label: string;
  /** Absolute band crossed (e.g. Buffett > 140) */
  bandAbove?: number;
  bandBelow?: number;
  /** Percent move vs previous sample */
  pctMoveAbove?: number;
  severity: FluxSeverity;
}

export interface FluxEvent {
  ruleId: string;
  metricType: MetricType;
  label: string;
  severity: FluxSeverity;
  value: number;
  previousValue?: number;
  pctChange?: number;
  message: string;
  recordedAt: string;
}

/** Default war-room flux rules (stub — no live delivery). */
export const DEFAULT_FLUX_RULES: FluxRule[] = [
  {
    id: "buffett-extreme",
    metricType: "buffett_indicator",
    label: "Buffett extreme overvaluation",
    bandAbove: 140,
    severity: "alert",
  },
  {
    id: "buffett-undervalued",
    metricType: "buffett_indicator",
    label: "Buffett undervalued zone",
    bandBelow: 75,
    severity: "watch",
  },
  {
    id: "buffett-move",
    metricType: "buffett_indicator",
    label: "Buffett sharp move",
    pctMoveAbove: 5,
    severity: "watch",
  },
  {
    id: "yield-inverted",
    metricType: "yield_curve",
    label: "Yield curve inverted",
    bandBelow: 0,
    severity: "alert",
  },
  {
    id: "credit-stress",
    metricType: "credit_spread",
    label: "Credit spread widening",
    bandAbove: 3,
    pctMoveAbove: 10,
    severity: "watch",
  },
  {
    id: "fear-extreme",
    metricType: "fear_greed",
    label: "Extreme fear",
    bandBelow: 25,
    severity: "info",
  },
  {
    id: "fear-greed-extreme",
    metricType: "fear_greed",
    label: "Extreme greed",
    bandAbove: 75,
    severity: "info",
  },
  {
    id: "btc-move",
    metricType: "bitcoin",
    label: "Bitcoin sharp move",
    pctMoveAbove: 8,
    severity: "watch",
  },
];

export function detectFlux(
  samples: MetricSample[],
  rules: FluxRule[] = DEFAULT_FLUX_RULES
): FluxEvent[] {
  const byType = new Map(samples.map((s) => [s.metricType, s]));
  const events: FluxEvent[] = [];

  for (const rule of rules) {
    const sample = byType.get(rule.metricType);
    if (!sample) continue;

    const pctChange =
      sample.previousValue !== undefined && sample.previousValue !== 0
        ? ((sample.value - sample.previousValue) / Math.abs(sample.previousValue)) *
          100
        : undefined;

    let hit = false;
    const reasons: string[] = [];

    if (rule.bandAbove !== undefined && sample.value > rule.bandAbove) {
      hit = true;
      reasons.push(`above ${rule.bandAbove}`);
    }
    if (rule.bandBelow !== undefined && sample.value < rule.bandBelow) {
      hit = true;
      reasons.push(`below ${rule.bandBelow}`);
    }
    if (
      rule.pctMoveAbove !== undefined &&
      pctChange !== undefined &&
      Math.abs(pctChange) >= rule.pctMoveAbove
    ) {
      hit = true;
      reasons.push(`${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}% move`);
    }

    if (!hit) continue;

    events.push({
      ruleId: rule.id,
      metricType: rule.metricType,
      label: rule.label,
      severity: rule.severity,
      value: sample.value,
      previousValue: sample.previousValue,
      pctChange,
      message: `${rule.label}: ${sample.value.toFixed(2)} (${reasons.join(", ")})`,
      recordedAt: sample.recordedAt,
    });
  }

  return events;
}
