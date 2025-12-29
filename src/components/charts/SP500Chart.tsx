"use client";

import { Card, Title, Text, Metric, Flex, AreaChart, BadgeDelta } from "@tremor/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";

interface SP500Data {
  date: string;
  value: number;
}

interface SP500ChartProps {
  data: SP500Data[];
  isLoading?: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function SP500Chart({ data, isLoading }: SP500ChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        "S&P 500": d.value,
      }));
  }, [data]);

  const latestValue = data.length > 0 ? data[0].value : 0;
  const previousValue = data.length > 1 ? data[data.length - 1].value : latestValue;
  const change = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  // Calculate 52-week high/low
  const high52Week = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);
  const low52Week = useMemo(() => Math.min(...data.map((d) => d.value)), [data]);
  const percentFromHigh = high52Week > 0 ? ((latestValue - high52Week) / high52Week) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4 dark:bg-gray-700" />
        <div className="h-64 bg-gray-100 rounded dark:bg-gray-800" />
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Title className="text-card-foreground">S&P 500 Index</Title>
          <Text className="text-muted-foreground">US Stock Market Performance</Text>
        </div>
        <BadgeDelta
          deltaType={isPositive ? "increase" : "decrease"}
          size="sm"
        >
          {isPositive ? "+" : ""}{change.toFixed(1)}%
        </BadgeDelta>
      </Flex>

      <Flex alignItems="baseline" className="mt-2 gap-2">
        <Metric className="text-card-foreground">{formatNumber(latestValue)}</Metric>
        <Flex alignItems="center" className="gap-1">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </Flex>
      </Flex>

      {/* 52-Week Range */}
      <div className="mt-4 space-y-2">
        <Flex justifyContent="between">
          <Text className="text-xs text-muted-foreground">52-Week Range</Text>
          <Text className="text-xs text-muted-foreground">
            {formatNumber(low52Week)} - {formatNumber(high52Week)}
          </Text>
        </Flex>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
            style={{
              width: high52Week - low52Week > 0 
                ? `${((latestValue - low52Week) / (high52Week - low52Week)) * 100}%`
                : "50%",
            }}
          />
        </div>
        <Text className="text-xs text-muted-foreground">
          {percentFromHigh === 0
            ? "At 52-week high"
            : `${Math.abs(percentFromHigh).toFixed(1)}% from 52-week high`}
        </Text>
      </div>

      <AreaChart
        className="mt-6 h-48"
        data={chartData}
        index="date"
        categories={["S&P 500"]}
        colors={[isPositive ? "emerald" : "red"]}
        valueFormatter={(v) => formatNumber(v)}
        showLegend={false}
        showAnimation
        curveType="monotone"
      />
    </Card>
  );
}

