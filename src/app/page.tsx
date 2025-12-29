"use client";

import { useEffect, useState } from "react";
import { Grid, Title, Text, Tab, TabGroup, TabList, TabPanel, TabPanels, Flex, Badge } from "@tremor/react";
import { RefreshCw, TrendingUp, DollarSign, Home, Gem } from "lucide-react";
import { BuffettIndicatorChart, PreciousMetalsChart, HousingChart, SP500Chart } from "@/components/charts";
import { Button } from "@/components/ui/button";

// Mock data for development (when Supabase is not configured)
const MOCK_DATA = {
  buffettIndicator: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    ratio: 185 + Math.random() * 20 - 10 + (i * 0.3),
  })).reverse(),
  gold: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 2600 + Math.random() * 100 - 50,
  })).reverse(),
  silver: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 30 + Math.random() * 4 - 2,
  })).reverse(),
  sp500: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 5900 + Math.random() * 200 - 100,
  })).reverse(),
  mortgageRate: Array.from({ length: 52 }, (_, i) => ({
    date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 6.5 + Math.random() * 1 - 0.5,
  })).reverse(),
  homePriceIndex: Array.from({ length: 36 }, (_, i) => ({
    date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    value: 310 + Math.random() * 10 - 5 + (i * 0.5),
  })).reverse(),
};

interface MetricsData {
  buffettIndicator: Array<{ date: string; ratio: number }>;
  gold: Array<{ date: string; value: number }>;
  silver: Array<{ date: string; value: number }>;
  sp500: Array<{ date: string; value: number }>;
  mortgageRate: Array<{ date: string; value: number }>;
  homePriceIndex: Array<{ date: string; value: number }>;
}

export default function Dashboard() {
  const [data, setData] = useState<MetricsData>(MOCK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Try to fetch real data from API
      const [buffett, gold, silver, sp500, mortgage, homePrice] = await Promise.all([
        fetch("/api/metrics/buffett_indicator").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/gold").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/silver").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/sp500").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/mortgage_rate").then((r) => r.json()).catch(() => null),
        fetch("/api/metrics/home_price_index").then((r) => r.json()).catch(() => null),
      ]);

      // If we have real data, use it; otherwise fall back to mock
      const hasRealData = buffett?.data?.length > 0;
      
      if (hasRealData) {
        setData({
          buffettIndicator: buffett.data.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            ratio: d.value,
          })),
          gold: gold?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || [],
          silver: silver?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || [],
          sp500: sp500?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || [],
          mortgageRate: mortgage?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || [],
          homePriceIndex: homePrice?.data?.map((d: { recorded_at: string; value: number }) => ({
            date: d.recorded_at,
            value: d.value,
          })) || [],
        });
        setUseMockData(false);
      } else {
        setData(MOCK_DATA);
        setUseMockData(true);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      setData(MOCK_DATA);
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <Flex justifyContent="between" alignItems="start" className="flex-col sm:flex-row gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <Title className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Buffetr
                  </Title>
                  <Text className="text-slate-400 font-medium tracking-wide">
                    Warren Buffett Indicator & Market Analytics
                  </Text>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {useMockData && (
                <Badge color="amber" size="sm">
                  Demo Mode
                </Badge>
              )}
              {lastUpdated && (
                <Text className="text-slate-500 text-sm">
                  Updated {lastUpdated.toLocaleTimeString()}
                </Text>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </Flex>
        </header>

        {/* Tab Navigation */}
        <TabGroup>
          <TabList className="mb-8">
            <Tab className="text-slate-400 hover:text-white data-[selected]:text-emerald-400 data-[selected]:border-emerald-400">
              <Flex alignItems="center" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </Flex>
            </Tab>
            <Tab className="text-slate-400 hover:text-white data-[selected]:text-amber-400 data-[selected]:border-amber-400">
              <Flex alignItems="center" className="gap-2">
                <Gem className="w-4 h-4" />
                Precious Metals
              </Flex>
            </Tab>
            <Tab className="text-slate-400 hover:text-white data-[selected]:text-cyan-400 data-[selected]:border-cyan-400">
              <Flex alignItems="center" className="gap-2">
                <Home className="w-4 h-4" />
                Housing
              </Flex>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <Grid numItemsMd={2} className="gap-6">
                <div className="md:col-span-2">
                  <BuffettIndicatorChart data={data.buffettIndicator} isLoading={isLoading} />
                </div>
                <SP500Chart data={data.sp500} isLoading={isLoading} />
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                      <Text className="text-amber-400 text-sm font-medium">Gold</Text>
                      <p className="text-2xl font-bold text-amber-300 mt-1">
                        ${data.gold[data.gold.length - 1]?.value.toFixed(0) || "---"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 border border-slate-500/20">
                      <Text className="text-slate-300 text-sm font-medium">Silver</Text>
                      <p className="text-2xl font-bold text-slate-200 mt-1">
                        ${data.silver[data.silver.length - 1]?.value.toFixed(2) || "---"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
                      <Text className="text-cyan-400 text-sm font-medium">30Y Mortgage</Text>
                      <p className="text-2xl font-bold text-cyan-300 mt-1">
                        {data.mortgageRate[data.mortgageRate.length - 1]?.value.toFixed(2) || "---"}%
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                      <Text className="text-blue-400 text-sm font-medium">Home Index</Text>
                      <p className="text-2xl font-bold text-blue-300 mt-1">
                        {data.homePriceIndex[data.homePriceIndex.length - 1]?.value.toFixed(1) || "---"}
                      </p>
                    </div>
                  </div>
                  {/* Info Box */}
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-2">What is the Buffett Indicator?</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      The Warren Buffett Indicator compares total US stock market capitalization to GDP. 
                      Values above 100% suggest overvaluation. Warren Buffett called it &quot;probably the 
                      best single measure of where valuations stand at any given moment.&quot;
                    </p>
                  </div>
                </div>
              </Grid>
            </TabPanel>

            {/* Precious Metals Tab */}
            <TabPanel>
              <PreciousMetalsChart
                goldData={data.gold}
                silverData={data.silver}
                latestGold={data.gold[data.gold.length - 1]?.value}
                latestSilver={data.silver[data.silver.length - 1]?.value}
                isLoading={isLoading}
              />
            </TabPanel>

            {/* Housing Tab */}
            <TabPanel>
              <HousingChart
                mortgageData={data.mortgageRate}
                homePriceData={data.homePriceIndex}
                isLoading={isLoading}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-800">
          <Flex justifyContent="between" className="flex-col sm:flex-row gap-4">
            <Text className="text-slate-500 text-sm">
              Data sources: FRED (Federal Reserve), metals.live
            </Text>
            <Text className="text-slate-600 text-sm">
              © 2024 Buffetr. For informational purposes only.
            </Text>
          </Flex>
        </footer>
      </div>
    </div>
  );
}
