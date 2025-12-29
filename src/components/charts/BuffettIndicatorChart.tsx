"use client";

import { AreaChart, Card, Title, Text, Metric, Flex, BadgeDelta } from "@tremor/react";
import { useMemo } from "react";

interface BuffettIndicatorData {
  date: string;
  ratio: number;
}

interface BuffettIndicatorChartProps {
  data: BuffettIndicatorData[];
  isLoading?: boolean;
}

// Buffett Indicator thresholds (based on historical averages)
const THRESHOLDS = {
  SEVERELY_UNDERVALUED: 50,
  UNDERVALUED: 75,
  FAIR_VALUE: 100,
  OVERVALUED: 115,
  SEVERELY_OVERVALUED: 140,
};

function getValuation(ratio: number): {
  label: string;
  color: "emerald" | "yellow" | "orange" | "red" | "rose";
  delta: "increase" | "moderateIncrease" | "unchanged" | "moderateDecrease" | "decrease";
} {
  if (ratio < THRESHOLDS.SEVERELY_UNDERVALUED) {
    return { label: "Severely Undervalued", color: "emerald", delta: "decrease" };
  } else if (ratio < THRESHOLDS.UNDERVALUED) {
    return { label: "Undervalued", color: "emerald", delta: "moderateDecrease" };
  } else if (ratio < THRESHOLDS.FAIR_VALUE) {
    return { label: "Fair Value", color: "yellow", delta: "unchanged" };
  } else if (ratio < THRESHOLDS.OVERVALUED) {
    return { label: "Modestly Overvalued", color: "orange", delta: "moderateIncrease" };
  } else if (ratio < THRESHOLDS.SEVERELY_OVERVALUED) {
    return { label: "Significantly Overvalued", color: "red", delta: "increase" };
  } else {
    return { label: "Severely Overvalued", color: "rose", delta: "increase" };
  }
}

export function BuffettIndicatorChart({ data, isLoading }: BuffettIndicatorChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        "Buffett Indicator": d.ratio,
      }));
  }, [data]);

  const latestValue = data.length > 0 ? data[0].ratio : 0;
  const valuation = getValuation(latestValue);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 dark:bg-gray-700" />
        <div className="h-80 bg-gray-100 rounded dark:bg-gray-800" />
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Title className="text-card-foreground">Warren Buffett Indicator</Title>
          <Text className="text-muted-foreground">Total Market Cap to GDP Ratio</Text>
        </div>
        <BadgeDelta deltaType={valuation.delta} size="sm">
          {valuation.label}
        </BadgeDelta>
      </Flex>
      <Metric className="mt-2 text-card-foreground">{latestValue.toFixed(1)}%</Metric>
      <Text className="text-muted-foreground text-sm mt-1">
        Fair value is ~100%. Currently{" "}
        {latestValue > 100
          ? `${(latestValue - 100).toFixed(1)}% above`
          : `${(100 - latestValue).toFixed(1)}% below`}{" "}
        fair value
      </Text>
      <AreaChart
        className="mt-6 h-72"
        data={chartData}
        index="date"
        categories={["Buffett Indicator"]}
        colors={[valuation.color]}
        valueFormatter={(v) => `${v.toFixed(1)}%`}
        showLegend={false}
        showAnimation
        curveType="monotone"
      />
    </Card>
  );
}

