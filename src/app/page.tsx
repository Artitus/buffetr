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
        const response = await fetch("/api/metrics/buffett_indicator");
        const result = await response.json();
        
        if (result?.data?.length > 0) {
          setData(
            result.data.map((d: { recorded_at: string; value: number }) => ({
              date: d.recorded_at,
              ratio: d.value,
            }))
          );
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

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { year: "numeric", month: "short" }),
    "Buffett Indicator": d.ratio,
  }));

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{error || "No data"}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background p-4">
      <AreaChart
        className="h-full w-full"
        data={chartData}
        index="date"
        categories={["Buffett Indicator"]}
        colors={["rose"]}
        valueFormatter={(v) => `${v.toFixed(0)}%`}
        showLegend={false}
        showAnimation
        curveType="monotone"
        showGridLines
        yAxisWidth={50}
      />
    </div>
  );
}
