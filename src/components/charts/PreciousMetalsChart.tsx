"use client";

import { Card, Title, Text, Metric, Flex, Grid, AreaChart, DonutChart } from "@tremor/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";

interface MetalPrice {
  date: string;
  value: number;
}

interface PreciousMetalsChartProps {
  goldData: MetalPrice[];
  silverData: MetalPrice[];
  latestGold?: number;
  latestSilver?: number;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function calculateChange(data: MetalPrice[]): { value: number; isPositive: boolean } {
  if (data.length < 2) return { value: 0, isPositive: true };
  const latest = data[0].value;
  const previous = data[data.length - 1].value;
  const change = ((latest - previous) / previous) * 100;
  return { value: Math.abs(change), isPositive: change >= 0 };
}

export function PreciousMetalsChart({
  goldData,
  silverData,
  latestGold,
  latestSilver,
  isLoading,
}: PreciousMetalsChartProps) {
  const goldChartData = useMemo(() => {
    return [...goldData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        Gold: d.value,
      }));
  }, [goldData]);

  const silverChartData = useMemo(() => {
    return [...silverData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        Silver: d.value,
      }));
  }, [silverData]);

  const currentGold = latestGold || (goldData.length > 0 ? goldData[0].value : 0);
  const currentSilver = latestSilver || (silverData.length > 0 ? silverData[0].value : 0);
  const goldSilverRatio = currentSilver > 0 ? currentGold / currentSilver : 0;

  const goldChange = calculateChange(goldData);
  const silverChange = calculateChange(silverData);

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
      <Title className="text-card-foreground">Precious Metals</Title>
      <Text className="text-muted-foreground">Gold & Silver Prices (USD)</Text>

      <Grid numItemsSm={2} className="gap-4 mt-4">
        {/* Gold Card */}
        <Card decoration="top" decorationColor="amber" className="bg-secondary/30">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text className="text-muted-foreground">Gold (XAU)</Text>
              <Metric className="text-amber-600 dark:text-amber-400">
                {formatCurrency(currentGold)}
              </Metric>
            </div>
            <Flex justifyContent="end" alignItems="center" className="gap-1">
              {goldChange.isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <Text
                className={goldChange.isPositive ? "text-emerald-500" : "text-red-500"}
              >
                {goldChange.value.toFixed(1)}%
              </Text>
            </Flex>
          </Flex>
        </Card>

        {/* Silver Card */}
        <Card decoration="top" decorationColor="slate" className="bg-secondary/30">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text className="text-muted-foreground">Silver (XAG)</Text>
              <Metric className="text-slate-500 dark:text-slate-300">
                {formatCurrency(currentSilver)}
              </Metric>
            </div>
            <Flex justifyContent="end" alignItems="center" className="gap-1">
              {silverChange.isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <Text
                className={silverChange.isPositive ? "text-emerald-500" : "text-red-500"}
              >
                {silverChange.value.toFixed(1)}%
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Grid>

      {/* Gold/Silver Ratio */}
      <div className="mt-4 p-3 rounded-lg bg-secondary/20">
        <Flex justifyContent="between" alignItems="center">
          <Text className="text-muted-foreground">Gold/Silver Ratio</Text>
          <Text className="font-semibold text-card-foreground">
            {goldSilverRatio.toFixed(1)}:1
          </Text>
        </Flex>
        <Text className="text-xs text-muted-foreground mt-1">
          Historical average: ~60:1 • Currently{" "}
          {goldSilverRatio > 60 ? "silver may be undervalued" : "ratio near historical average"}
        </Text>
      </div>

      {/* Charts */}
      <div className="mt-6 space-y-6">
        {goldChartData.length > 0 && (
          <div>
            <Text className="text-sm font-medium text-muted-foreground mb-2">Gold Price History</Text>
            <AreaChart
              className="h-32"
              data={goldChartData}
              index="date"
              categories={["Gold"]}
              colors={["amber"]}
              valueFormatter={(v) => formatCurrency(v)}
              showLegend={false}
              showAnimation
              curveType="monotone"
            />
          </div>
        )}

        {silverChartData.length > 0 && (
          <div>
            <Text className="text-sm font-medium text-muted-foreground mb-2">Silver Price History</Text>
            <AreaChart
              className="h-32"
              data={silverChartData}
              index="date"
              categories={["Silver"]}
              colors={["slate"]}
              valueFormatter={(v) => formatCurrency(v)}
              showLegend={false}
              showAnimation
              curveType="monotone"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

