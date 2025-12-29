"use client";

import { Card, Title, Text, Metric, Flex, LineChart, BarList, Color } from "@tremor/react";
import { Home, Percent } from "lucide-react";
import { useMemo } from "react";

interface MortgageData {
  date: string;
  value: number;
}

interface HomePriceData {
  date: string;
  value: number;
}

interface HousingChartProps {
  mortgageData: MortgageData[];
  homePriceData: HomePriceData[];
  isLoading?: boolean;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function HousingChart({ mortgageData, homePriceData, isLoading }: HousingChartProps) {
  const mortgageChartData = useMemo(() => {
    return [...mortgageData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        "30-Year Fixed Rate": d.value,
      }));
  }, [mortgageData]);

  const homePriceChartData = useMemo(() => {
    return [...homePriceData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        "Home Price Index": d.value,
      }));
  }, [homePriceData]);

  const currentMortgageRate = mortgageData.length > 0 ? mortgageData[0].value : 0;
  const currentHomeIndex = homePriceData.length > 0 ? homePriceData[0].value : 0;

  // Calculate year-over-year change in home prices
  const yoyChange = useMemo(() => {
    if (homePriceData.length < 12) return null;
    const latest = homePriceData[0].value;
    const yearAgo = homePriceData[11]?.value || homePriceData[homePriceData.length - 1].value;
    return ((latest - yearAgo) / yearAgo) * 100;
  }, [homePriceData]);

  // Mortgage rate context
  const rateContext = useMemo(() => {
    if (currentMortgageRate < 4) return { label: "Historically Low", color: "emerald" as Color };
    if (currentMortgageRate < 5) return { label: "Low", color: "emerald" as Color };
    if (currentMortgageRate < 6) return { label: "Moderate", color: "yellow" as Color };
    if (currentMortgageRate < 7) return { label: "Elevated", color: "orange" as Color };
    return { label: "High", color: "red" as Color };
  }, [currentMortgageRate]);

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
      <Title className="text-card-foreground">Housing Market</Title>
      <Text className="text-muted-foreground">Mortgage Rates & Home Prices</Text>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card decoration="left" decorationColor={rateContext.color} className="bg-secondary/30">
          <Flex alignItems="center" className="gap-2">
            <Percent className="w-5 h-5 text-muted-foreground" />
            <Text className="text-muted-foreground">30-Year Mortgage</Text>
          </Flex>
          <Metric className="mt-1 text-card-foreground">{formatPercent(currentMortgageRate)}</Metric>
          <Text className={`text-xs text-${rateContext.color}-500`}>{rateContext.label}</Text>
        </Card>

        <Card decoration="left" decorationColor="blue" className="bg-secondary/30">
          <Flex alignItems="center" className="gap-2">
            <Home className="w-5 h-5 text-muted-foreground" />
            <Text className="text-muted-foreground">Home Price Index</Text>
          </Flex>
          <Metric className="mt-1 text-card-foreground">{currentHomeIndex.toFixed(1)}</Metric>
          {yoyChange !== null && (
            <Text className={`text-xs ${yoyChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {yoyChange >= 0 ? "+" : ""}{yoyChange.toFixed(1)}% YoY
            </Text>
          )}
        </Card>
      </div>

      {/* Mortgage Rate Chart */}
      {mortgageChartData.length > 0 && (
        <div className="mt-6">
          <Text className="text-sm font-medium text-muted-foreground mb-2">
            30-Year Fixed Mortgage Rate History
          </Text>
          <LineChart
            className="h-40"
            data={mortgageChartData}
            index="date"
            categories={["30-Year Fixed Rate"]}
            colors={["cyan"]}
            valueFormatter={(v) => formatPercent(v)}
            showLegend={false}
            showAnimation
            curveType="monotone"
          />
        </div>
      )}

      {/* Home Price Index Chart */}
      {homePriceChartData.length > 0 && (
        <div className="mt-6">
          <Text className="text-sm font-medium text-muted-foreground mb-2">
            Case-Shiller Home Price Index
          </Text>
          <LineChart
            className="h-40"
            data={homePriceChartData}
            index="date"
            categories={["Home Price Index"]}
            colors={["blue"]}
            valueFormatter={(v) => v.toFixed(1)}
            showLegend={false}
            showAnimation
            curveType="monotone"
          />
        </div>
      )}

      {/* Context */}
      <div className="mt-4 p-3 rounded-lg bg-secondary/20">
        <Text className="text-xs text-muted-foreground">
          The Case-Shiller Index (Jan 2000 = 100) tracks home price changes in major US metros.
          Higher mortgage rates typically cool home prices, but with limited housing supply,
          prices may remain elevated.
        </Text>
      </div>
    </Card>
  );
}

