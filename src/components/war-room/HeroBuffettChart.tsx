"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type Time,
} from "lightweight-charts";

export interface HeroPoint {
  date: string;
  value: number;
}

interface HeroBuffettChartProps {
  data: HeroPoint[];
}

export function HeroBuffettChart({ data }: HeroBuffettChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b9cb3",
        fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "rgba(45, 62, 80, 0.45)" },
        horzLines: { color: "rgba(45, 62, 80, 0.45)" },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#5a6d82",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1a2332",
        },
        horzLine: {
          color: "#5a6d82",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1a2332",
        },
      },
      rightPriceScale: {
        borderColor: "#2d3e50",
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "#2d3e50",
        timeVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#ff6b4a",
      topColor: "rgba(255, 107, 74, 0.35)",
      bottomColor: "rgba(255, 107, 74, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(1)}%`,
      },
    });

    seriesRef.current = areaSeries;

    const chartData: AreaData<Time>[] = data.map((d) => ({
      time: d.date.split("T")[0] as Time,
      value: d.value,
    }));

    areaSeries.setData(chartData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-[280px]"
      role="img"
      aria-label="Buffett Indicator historical chart"
    />
  );
}
