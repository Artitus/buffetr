"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, Title, Text, Metric, Flex, Grid, AreaChart, LineChart, Badge, ProgressBar } from "@tremor/react";
import { 
  RefreshCw, TrendingUp, TrendingDown, Sparkles, Coins, Home, 
  BarChart3, Info, Activity, Percent, Users, Bitcoin, Gauge,
  ArrowUpDown, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector, type TimeRange, filterDataByTimeRange } from "@/components/TimeRangeSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getMockFearGreedData, getFearGreedEmoji, getFearGreedColor } from "@/lib/data-sources/fear-greed";
import { getMockBitcoinData } from "@/lib/data-sources/crypto";
import { NewsHeadlines } from "@/components/NewsHeadlines";
import { ScreenshotButton } from "@/components/ScreenshotButton";

// Mock data for development
const generateMockData = () => ({
  buffettIndicator: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    ratio: 185 + Math.sin(i / 30) * 15 + Math.random() * 10,
  })).reverse(),
  gold: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 2400 + (i / 365) * 300 + Math.random() * 100,
  })).reverse(),
  silver: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 28 + (i / 365) * 4 + Math.random() * 2,
  })).reverse(),
  sp500: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 5200 + (i / 365) * 800 + Math.random() * 100,
  })).reverse(),
  mortgageRate: Array.from({ length: 52 }, (_, i) => ({
    date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 6.2 + Math.sin(i / 10) * 0.5 + Math.random() * 0.3,
  })).reverse(),
  homePriceIndex: Array.from({ length: 36 }, (_, i) => ({
    date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 300 + (i / 36) * 20 + Math.random() * 5,
  })).reverse(),
  vix: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 15 + Math.random() * 15 + (Math.random() > 0.95 ? 20 : 0),
  })).reverse(),
  yieldCurve: Array.from({ length: 365 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    spread: -0.5 + (i / 365) * 1 + Math.random() * 0.3,
  })).reverse(),
  cpi: Array.from({ length: 24 }, (_, i) => ({
    date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 310 + i * 0.8,
    yoyChange: 3.5 - (i / 24) * 2 + Math.random() * 0.5,
  })).reverse(),
  unemployment: Array.from({ length: 36 }, (_, i) => ({
    date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 3.7 + Math.random() * 0.5,
  })).reverse(),
  fearGreed: getMockFearGreedData(),
  bitcoin: getMockBitcoinData(),
});

const MOCK_DATA = generateMockData();

interface MetricsData {
  buffettIndicator: Array<{ date: string; ratio: number }>;
  gold: Array<{ date: string; value: number }>;
  silver: Array<{ date: string; value: number }>;
  sp500: Array<{ date: string; value: number }>;
  mortgageRate: Array<{ date: string; value: number }>;
  homePriceIndex: Array<{ date: string; value: number }>;
  vix: Array<{ date: string; value: number }>;
  yieldCurve: Array<{ date: string; spread: number }>;
  cpi: Array<{ date: string; value: number; yoyChange?: number }>;
  unemployment: Array<{ date: string; value: number }>;
  fearGreed: Array<{ date: string; value: number; classification: string }>;
  bitcoin: { price: number; change24h: number; history: Array<{ date: string; value: number }> };
}

// Tooltip content for each metric
const TOOLTIPS = {
  buffett: "The Buffett Indicator compares total US stock market value to GDP. Above 100% suggests stocks may be overvalued. Warren Buffett called it 'the best single measure of where valuations stand.'",
  sp500: "The S&P 500 tracks 500 of the largest US companies. It's the most-watched stock market index and a key economic health indicator.",
  gold: "Gold is a traditional safe-haven asset. Prices often rise during economic uncertainty or inflation fears.",
  silver: "Silver is both a precious metal and industrial commodity. The gold/silver ratio helps identify relative value.",
  fearGreed: "The Fear & Greed Index measures market sentiment from 0 (extreme fear) to 100 (extreme greed). Extreme readings often signal potential turning points.",
  vix: "The VIX measures expected market volatility. High readings (>30) indicate fear, low readings (<15) suggest complacency.",
  yieldCurve: "The yield curve spread (10Y - 2Y) predicts recessions. Negative spreads (inversions) have preceded every recession since 1955.",
  mortgage: "The 30-year fixed mortgage rate affects housing affordability. Higher rates cool the housing market.",
  homeIndex: "The Case-Shiller Index tracks home price changes. A value of 100 equals January 2000 prices.",
  inflation: "Year-over-year CPI change measures inflation. The Fed targets 2% annual inflation.",
  unemployment: "The unemployment rate shows the percentage of the labor force without jobs. Below 4% is considered 'full employment.'",
  bitcoin: "Bitcoin is the largest cryptocurrency by market cap. Known for high volatility, it's increasingly viewed as 'digital gold.'",
};

function getBuffettStatus(ratio: number): { label: string; color: "emerald" | "yellow" | "orange" | "red"; emoji: string } {
  if (ratio < 75) return { label: "Undervalued", color: "emerald", emoji: "🟢" };
  if (ratio < 100) return { label: "Fair Value", color: "yellow", emoji: "🟡" };
  if (ratio < 140) return { label: "Overvalued", color: "orange", emoji: "🟠" };
  return { label: "Very Overvalued", color: "red", emoji: "🔴" };
}

function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 inline-flex items-center justify-center rounded-full w-4 h-4 bg-muted hover:bg-muted/80 transition-colors">
            <Info className="w-3 h-3 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm" side="top">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function HistoricalEvent({ 
  date, 
  title, 
  description, 
  emoji,
  buffettIndicator 
}: { 
  date: string;
  title: string; 
  description: string; 
  emoji: string;
  buffettIndicator: number;
}) {
  return (
    <div className="p-3 rounded-xl bg-secondary/30 border border-border">
      <Flex alignItems="start" className="gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Text className="font-semibold">{title}</Text>
              <Text className="text-muted-foreground text-sm">{date}</Text>
            </div>
            <Badge color={buffettIndicator > 100 ? "red" : "emerald"} size="sm">
              {buffettIndicator}%
            </Badge>
          </Flex>
          <Text className="text-muted-foreground text-xs mt-1">{description}</Text>
        </div>
      </Flex>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<MetricsData>(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");
  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [buffett, gold, silver, sp500, mortgage, homePrice] = await Promise.all([
        fetch("/api/metrics/buffett_indicator").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/gold").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/silver").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/sp500").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/mortgage_rate").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/home_price_index").then((r) => r.json()).catch(() => null),
      ]);

      const hasRealData = buffett?.data?.length > 0;
      
      if (hasRealData) {
        setData({
          ...MOCK_DATA, // Keep mock data for new metrics
          buffettIndicator: buffett.data.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            ratio: d.value,
          })),
          gold: gold?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || MOCK_DATA.gold,
          silver: silver?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || MOCK_DATA.silver,
          sp500: sp500?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || MOCK_DATA.sp500,
          mortgageRate: mortgage?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || MOCK_DATA.mortgageRate,
          homePriceIndex: homePrice?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || MOCK_DATA.homePriceIndex,
        });
      } else {
        setData(MOCK_DATA);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      setData(MOCK_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data by time range
  const filteredData = useMemo(() => ({
    buffettIndicator: filterDataByTimeRange(data.buffettIndicator, timeRange),
    sp500: filterDataByTimeRange(data.sp500, timeRange),
    gold: filterDataByTimeRange(data.gold, timeRange),
    silver: filterDataByTimeRange(data.silver, timeRange),
    vix: filterDataByTimeRange(data.vix, timeRange),
    yieldCurve: filterDataByTimeRange(data.yieldCurve, timeRange),
    bitcoin: filterDataByTimeRange(data.bitcoin.history, timeRange),
    fearGreed: filterDataByTimeRange(data.fearGreed, timeRange),
  }), [data, timeRange]);

  // Latest values
  const latestBuffett = data.buffettIndicator[data.buffettIndicator.length - 1]?.ratio || 0;
  const buffettStatus = getBuffettStatus(latestBuffett);
  const latestGold = data.gold[data.gold.length - 1]?.value || 0;
  const latestSilver = data.silver[data.silver.length - 1]?.value || 0;
  const latestSP500 = data.sp500[data.sp500.length - 1]?.value || 0;
  const latestMortgage = data.mortgageRate[data.mortgageRate.length - 1]?.value || 0;
  const latestHomeIndex = data.homePriceIndex[data.homePriceIndex.length - 1]?.value || 0;
  const latestVix = data.vix[data.vix.length - 1]?.value || 0;
  const latestYieldSpread = data.yieldCurve[data.yieldCurve.length - 1]?.spread || 0;
  const latestInflation = data.cpi[data.cpi.length - 1]?.yoyChange || 0;
  const latestUnemployment = data.unemployment[data.unemployment.length - 1]?.value || 0;
  const latestFearGreed = data.fearGreed[data.fearGreed.length - 1] || { value: 50, classification: "Neutral" };

  // Chart data formatters
  const buffettChartData = filteredData.buffettIndicator.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "Market to GDP": d.ratio,
  }));

  const sp500ChartData = filteredData.sp500.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "S&P 500": d.value,
  }));

  const vixChartData = filteredData.vix.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    VIX: d.value,
  }));

  const yieldChartData = filteredData.yieldCurve.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "Spread": d.spread,
  }));

  const bitcoinChartData = filteredData.bitcoin.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Bitcoin: d.value,
  }));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-chart-2/20 to-chart-3/10 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 right-1/4 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-chart-4/20 to-chart-5/10 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div ref={dashboardRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <Flex justifyContent="between" alignItems="center" className="flex-col sm:flex-row gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold gradient-text">
                  Buffetr
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Your friendly guide to market conditions ✨
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              {lastUpdated && (
                <span className="text-muted-foreground text-sm hidden md:inline">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="rounded-full px-4 hover-lift"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <ScreenshotButton targetRef={dashboardRef} filename="buffetr-snapshot" />
            </div>
          </Flex>
        </header>

        {/* HERO: Buffett Indicator - Full Width */}
        <Card className="mb-8 hover-lift overflow-hidden">
          <div className="p-2 sm:p-4">
            {/* Hero Header */}
            <Flex justifyContent="between" alignItems="start" className="flex-col lg:flex-row gap-4 mb-6">
              <div>
                <Flex alignItems="center" className="gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <Title className="text-2xl sm:text-3xl">Warren Buffett Indicator</Title>
                    <Text className="text-muted-foreground">
                      Total US Stock Market Cap / GDP
                      <InfoTooltip content={TOOLTIPS.buffett} />
                    </Text>
                  </div>
                </Flex>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-baseline gap-3 justify-end">
                    <Metric className="text-5xl sm:text-6xl lg:text-7xl font-bold">{latestBuffett.toFixed(0)}%</Metric>
                    <span className="text-4xl sm:text-5xl">{buffettStatus.emoji}</span>
                  </div>
                  <Badge color={buffettStatus.color} size="xl" className="mt-2">
                    {buffettStatus.label}
                  </Badge>
                </div>
              </div>
            </Flex>

            {/* Main Chart - Full Width */}
            <AreaChart
              className="h-64 sm:h-80 lg:h-96"
              data={buffettChartData}
              index="date"
              categories={["Market to GDP"]}
              colors={["rose"]}
              valueFormatter={(v) => `${v.toFixed(0)}%`}
              showLegend={false}
              showAnimation
              curveType="monotone"
              showGridLines={true}
            />

            {/* Valuation Scale */}
            <div className="mt-6 p-4 rounded-xl bg-secondary/30">
              <Text className="font-medium mb-3">Market Valuation Scale</Text>
              <div className="flex flex-wrap gap-3">
                <Badge color="emerald" size="sm">{"<75% Undervalued"}</Badge>
                <Badge color="yellow" size="sm">75-100% Fair Value</Badge>
                <Badge color="orange" size="sm">100-140% Overvalued</Badge>
                <Badge color="red" size="sm">{">140% Very Overvalued"}</Badge>
              </div>
              <Text className="text-muted-foreground text-sm mt-3">
                Warren Buffett called this &quot;probably the best single measure of where valuations stand at any given moment.&quot;
                A reading above 100% historically suggests the market may be overvalued relative to the economy.
              </Text>
            </div>
          </div>
        </Card>

        {/* Secondary Metrics Row - Compact */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Fear & Greed */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <span className="text-lg">{getFearGreedEmoji(latestFearGreed.value)}</span>
            <span className="text-sm font-medium text-muted-foreground">Fear/Greed</span>
            <span className="text-sm font-bold">{latestFearGreed.value}</span>
          </div>

          {/* S&P 500 */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <TrendingUp className="w-4 h-4 text-chart-5" />
            <span className="text-sm font-medium text-muted-foreground">S&P 500</span>
            <span className="text-sm font-bold">{latestSP500.toFixed(0)}</span>
          </div>

          {/* VIX */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <Activity className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-muted-foreground">VIX</span>
            <span className={`text-sm font-bold ${latestVix > 20 ? "text-red-500" : "text-emerald-500"}`}>
              {latestVix.toFixed(1)}
            </span>
          </div>

          {/* Yield Curve */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <ArrowUpDown className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-muted-foreground">Yield</span>
            <span className={`text-sm font-bold ${latestYieldSpread < 0 ? "text-red-500" : "text-emerald-500"}`}>
              {latestYieldSpread.toFixed(2)}%
            </span>
            {latestYieldSpread < 0 && <span className="text-xs">⚠️</span>}
          </div>

          {/* Bitcoin */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <Bitcoin className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-muted-foreground">BTC</span>
            <span className="text-sm font-bold">{formatCurrency(data.bitcoin.price)}</span>
            <span className={`text-xs ${data.bitcoin.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {data.bitcoin.change24h >= 0 ? "+" : ""}{data.bitcoin.change24h.toFixed(1)}%
            </span>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">Gold</span>
            <span className="text-sm font-bold">{formatCurrency(latestGold)}</span>
          </div>

          {/* Silver */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <Coins className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-muted-foreground">Silver</span>
            <span className="text-sm font-bold">${latestSilver.toFixed(2)}</span>
          </div>

          {/* Mortgage */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover-lift">
            <Home className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-muted-foreground">30Y Rate</span>
            <span className="text-sm font-bold">{latestMortgage.toFixed(2)}%</span>
          </div>
        </div>

        {/* Charts Section */}
        <Grid numItemsMd={2} className="gap-6 mb-6">
          {/* S&P 500 Chart */}
          <Card className="hover-lift">
            <Flex justifyContent="between" alignItems="center" className="mb-4">
              <Title>S&P 500 Index</Title>
            </Flex>
            <AreaChart
              className="h-52"
              data={sp500ChartData}
              index="date"
              categories={["S&P 500"]}
              colors={["indigo"]}
              valueFormatter={(v) => v.toFixed(0)}
              showLegend={false}
              showAnimation
              curveType="monotone"
            />
          </Card>

          {/* VIX Chart */}
          <Card className="hover-lift">
            <Flex justifyContent="between" alignItems="center" className="mb-4">
              <Title>VIX Volatility Index</Title>
            </Flex>
            <AreaChart
              className="h-52"
              data={vixChartData}
              index="date"
              categories={["VIX"]}
              colors={["red"]}
              valueFormatter={(v) => v.toFixed(1)}
              showLegend={false}
              showAnimation
              curveType="monotone"
            />
          </Card>
        </Grid>

        {/* Economic Indicators */}
        <Card className="mb-6 hover-lift">
          <Title className="mb-4">Economic Health</Title>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
            {/* Inflation */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
              <Flex alignItems="center" className="gap-2 mb-2">
                <Percent className="w-4 h-4 text-rose-500" />
                <Text className="font-medium text-rose-900">Inflation (CPI)</Text>
                <InfoTooltip content={TOOLTIPS.inflation} />
              </Flex>
              <Metric className="text-2xl text-rose-900">{latestInflation.toFixed(1)}%</Metric>
              <Text className="text-rose-600 text-sm">Year-over-year</Text>
            </div>

            {/* Unemployment */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <Flex alignItems="center" className="gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <Text className="font-medium text-blue-900">Unemployment</Text>
                <InfoTooltip content={TOOLTIPS.unemployment} />
              </Flex>
              <Metric className="text-2xl text-blue-900">{latestUnemployment.toFixed(1)}%</Metric>
              <Badge color={latestUnemployment < 4 ? "emerald" : latestUnemployment < 6 ? "yellow" : "red"} size="sm" className="mt-1">
                {latestUnemployment < 4 ? "Strong" : latestUnemployment < 6 ? "Moderate" : "Weak"}
              </Badge>
            </div>

            {/* Mortgage */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100">
              <Flex alignItems="center" className="gap-2 mb-2">
                <Home className="w-4 h-4 text-cyan-500" />
                <Text className="font-medium text-cyan-900">30Y Mortgage</Text>
                <InfoTooltip content={TOOLTIPS.mortgage} />
              </Flex>
              <Metric className="text-2xl text-cyan-900">{latestMortgage.toFixed(2)}%</Metric>
              <Badge color={latestMortgage > 7 ? "red" : latestMortgage > 6 ? "orange" : "emerald"} size="sm" className="mt-1">
                {latestMortgage > 7 ? "High" : latestMortgage > 6 ? "Elevated" : "Moderate"}
              </Badge>
            </div>

            {/* Home Price Index */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
              <Flex alignItems="center" className="gap-2 mb-2">
                <Home className="w-4 h-4 text-emerald-500" />
                <Text className="font-medium text-emerald-900">Home Prices</Text>
                <InfoTooltip content={TOOLTIPS.homeIndex} />
              </Flex>
              <Metric className="text-2xl text-emerald-900">{latestHomeIndex.toFixed(0)}</Metric>
              <Text className="text-emerald-600 text-sm">Case-Shiller Index</Text>
            </div>
          </Grid>
        </Card>

        {/* Precious Metals & Bitcoin */}
        <Card className="mb-6 hover-lift">
          <Title className="mb-4">Precious Metals & Crypto</Title>
          <Grid numItemsSm={3} className="gap-4">
            {/* Gold */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100">
              <Flex alignItems="center" className="gap-2 mb-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <Text className="font-semibold text-amber-900">Gold</Text>
                  <InfoTooltip content={TOOLTIPS.gold} />
                </div>
              </Flex>
              <Metric className="text-3xl text-amber-900">{formatCurrency(latestGold)}</Metric>
            </div>

            {/* Silver */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200">
              <Flex alignItems="center" className="gap-2 mb-3">
                <div className="p-2 rounded-full bg-slate-100">
                  <Coins className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <Text className="font-semibold text-slate-900">Silver</Text>
                  <InfoTooltip content={TOOLTIPS.silver} />
                </div>
              </Flex>
              <Metric className="text-3xl text-slate-900">${latestSilver.toFixed(2)}</Metric>
              <Text className="text-slate-500 text-sm mt-1">
                Gold/Silver: {(latestGold / latestSilver).toFixed(0)}:1
              </Text>
            </div>

            {/* Bitcoin */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
              <Flex alignItems="center" className="gap-2 mb-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <Bitcoin className="w-5 h-5 text-orange-600" />
                </div>
                <Text className="font-semibold text-orange-900">Bitcoin</Text>
              </Flex>
              <Metric className="text-3xl text-orange-900">{formatCurrency(data.bitcoin.price)}</Metric>
              <Flex alignItems="center" className="mt-1 gap-1">
                {data.bitcoin.change24h >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <Text className={data.bitcoin.change24h >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {data.bitcoin.change24h >= 0 ? "+" : ""}{data.bitcoin.change24h.toFixed(1)}% (24h)
                </Text>
              </Flex>
            </div>
          </Grid>
        </Card>

        {/* Yield Curve & Bitcoin Charts */}
        <Grid numItemsMd={2} className="gap-6 mb-6">
          <Card className="hover-lift">
            <Title className="mb-4">Yield Curve Spread (10Y - 2Y)</Title>
            <LineChart
              className="h-48"
              data={yieldChartData}
              index="date"
              categories={["Spread"]}
              colors={["violet"]}
              valueFormatter={(v) => `${v.toFixed(2)}%`}
              showLegend={false}
              showAnimation
              curveType="monotone"
            />
            <Text className="text-muted-foreground text-xs mt-2">
              Negative values indicate yield curve inversion - a recession warning signal
            </Text>
          </Card>

          <Card className="hover-lift">
            <Title className="mb-4">Bitcoin Price</Title>
            <AreaChart
              className="h-48"
              data={bitcoinChartData}
              index="date"
              categories={["Bitcoin"]}
              colors={["orange"]}
              valueFormatter={(v) => formatCurrency(v)}
              showLegend={false}
              showAnimation
              curveType="monotone"
            />
          </Card>
        </Grid>

        {/* News & Historical Context */}
        <Grid numItemsMd={2} className="gap-6 mb-6">
          <NewsHeadlines limit={5} />
          
          {/* Historical Events Reference */}
          <Card className="hover-lift">
            <Title className="mb-4">Historical Context</Title>
            <Text className="text-muted-foreground mb-4">
              Key market events for reference
            </Text>
            <div className="space-y-3">
              <HistoricalEvent
                date="March 2020"
                title="COVID-19 Crash"
                description="S&P 500 dropped 34% in 33 days"
                emoji="🦠"
                buffettIndicator={142}
              />
              <HistoricalEvent
                date="2008-2009"
                title="Financial Crisis"
                description="Banks failed, housing bubble burst"
                emoji="🏦"
                buffettIndicator={57}
              />
              <HistoricalEvent
                date="2000"
                title="Dot-com Bubble"
                description="Tech stocks crashed after peak"
                emoji="💻"
                buffettIndicator={148}
              />
              <HistoricalEvent
                date="1987"
                title="Black Monday"
                description="Largest one-day market crash (22.6%)"
                emoji="📉"
                buffettIndicator={60}
              />
            </div>
          </Card>
        </Grid>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border">
          <Text className="text-muted-foreground text-sm">
            Data from FRED, CoinGecko, Alternative.me & metals.live • For informational purposes only
          </Text>
          <Text className="text-muted-foreground/60 text-xs mt-2">
            Made with 💜 • Not financial advice
          </Text>
        </footer>
      </div>
    </div>
  );
}
