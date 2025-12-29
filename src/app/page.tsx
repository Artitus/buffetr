"use client";

import { useEffect, useState } from "react";
import { AreaChart } from "@tremor/react";

interface DataPoint {
  date: string;
  ratio: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/metrics/buffett_indicator?limit=1000");
        const result = await response.json();
        
        if (result?.data?.length > 0) {
          // Sort by date ascending (oldest first, newest last for chart)
          const sorted = result.data
            .map((d: { recorded_at: string; value: number }) => ({
              date: d.recorded_at,
              ratio: d.value,
            }))
            .sort((a: DataPoint, b: DataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          setData(sorted);
        } else {
          setError("No data available. Trigger the cron job to fetch data.");
        }
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Format chart data with readable dates
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short",
    }),
    "Market Cap / GDP": d.ratio,
  }));

  // Get latest value
  const latestValue = data.length > 0 ? data[data.length - 1].ratio : 0;
  const latestDate = data.length > 0 ? new Date(data[data.length - 1].date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long", 
    day: "numeric"
  }) : "";

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-xl">Loading...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-xl">{error || "No data"}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Buffett Indicator</h1>
          <p className="text-muted-foreground mt-1">Total US Stock Market Cap / GDP</p>
        </div>
        <div className="text-right">
          <p className="text-6xl font-bold text-foreground">{latestValue.toFixed(1)}%</p>
          <p className="text-muted-foreground text-sm">{latestDate}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-4 pb-4">
        <AreaChart
          className="h-full w-full"
          data={chartData}
          index="date"
          categories={["Market Cap / GDP"]}
          colors={["rose"]}
          valueFormatter={(v) => `${v.toFixed(0)}%`}
          showLegend={false}
          showAnimation
          curveType="monotone"
          showGridLines
          yAxisWidth={60}
          minValue={0}
        />
      </div>
    </div>
  );
}
