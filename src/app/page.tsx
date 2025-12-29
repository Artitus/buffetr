"use client";

import { useEffect, useState, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, AreaData, Time } from "lightweight-charts";

interface DataPoint {
  date: string;
  ratio: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/metrics/buffett_indicator?limit=1000");
        const result = await response.json();
        
        if (result?.data?.length > 0) {
          const sorted = result.data
            .map((d: { recorded_at: string; value: number }) => ({
              date: d.recorded_at,
              ratio: d.value,
            }))
            .sort((a: DataPoint, b: DataPoint) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
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

  // Create and manage chart
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#a0a0a0",
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#555",
          width: 1,
          style: 2,
          labelBackgroundColor: "#333",
        },
        horzLine: {
          color: "#555",
          width: 1,
          style: 2,
          labelBackgroundColor: "#333",
        },
      },
      rightPriceScale: {
        borderColor: "#2a2a2a",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#2a2a2a",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Add area series
    const areaSeries = chart.addAreaSeries({
      lineColor: "#ef4444",
      topColor: "rgba(239, 68, 68, 0.4)",
      bottomColor: "rgba(239, 68, 68, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(1) + "%",
      },
    });

    seriesRef.current = areaSeries;

    // Format data for chart
    const chartData: AreaData<Time>[] = data.map((d) => ({
      time: d.date.split("T")[0] as Time,
      value: d.ratio,
    }));

    areaSeries.setData(chartData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  // Get latest value
  const latestValue = data.length > 0 ? data[data.length - 1].ratio : 0;
  const latestDate = data.length > 0 
    ? new Date(data[data.length - 1].date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short", 
        day: "numeric"
      }) 
    : "";

  // Get status
  const getStatus = (value: number) => {
    if (value < 75) return { label: "UNDERVALUED", color: "#22c55e" };
    if (value < 100) return { label: "FAIR VALUE", color: "#eab308" };
    if (value < 140) return { label: "OVERVALUED", color: "#f97316" };
    return { label: "EXTREMELY OVERVALUED", color: "#ef4444" };
  };
  const status = getStatus(latestValue);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-500 text-xl font-mono">Loading...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-500 text-xl font-mono">{error || "No data"}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a1a1a] flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
              BUFFETT INDICATOR
            </h1>
            <span 
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ backgroundColor: status.color + "20", color: status.color }}
            >
              {status.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm font-mono">
            US Total Market Cap / GDP Ratio
          </p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-bold text-white font-mono">
            {latestValue.toFixed(1)}
            <span className="text-2xl text-gray-500">%</span>
          </p>
          <p className="text-gray-500 text-xs font-mono">{latestDate}</p>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="flex-1" />

      {/* Footer */}
      <div className="px-6 py-2 border-t border-[#1a1a1a] flex justify-between text-gray-600 text-xs font-mono">
        <span>Source: FRED (Federal Reserve Economic Data)</span>
        <span>{data.length} data points • Scroll to zoom • Drag to pan</span>
      </div>
    </div>
  );
}
