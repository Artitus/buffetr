"use client";

import { useLayoutEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

export interface ReceiptPoint {
  date: string;
  value: number;
}

interface ReceiptChartProps {
  data: ReceiptPoint[];
  color: string;
  formatValue: (value: number) => string;
  label: string;
}

export function ReceiptChart({
  data,
  color,
  formatValue,
  label,
}: ReceiptChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let chart: IChartApi;
    try {
      chart = createChart(el, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#8b9cb3",
          fontFamily: "var(--font-ibm-plex-mono), ui-monospace, monospace",
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(45, 62, 80, 0.35)" },
          horzLines: { color: "rgba(45, 62, 80, 0.35)" },
        },
        width: el.clientWidth,
        height: el.clientHeight,
        crosshair: {
          vertLine: { color: "#5a6d82", labelBackgroundColor: "#1a2332" },
          horzLine: { color: "#5a6d82", labelBackgroundColor: "#1a2332" },
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
    } catch (error) {
      console.error(error);
      return;
    }

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#8b9cb3",
      topColor: hexFade("#8b9cb3", 0.35),
      bottomColor: hexFade("#8b9cb3", 0),
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => String(Math.round(price)),
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      chart.applyOptions({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || data.length < 2) return;

    series.applyOptions({
      lineColor: color,
      topColor: hexFade(color, 0.35),
      bottomColor: hexFade(color, 0),
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatValue(price),
      },
    });

    try {
      series.setData(
        data.map((point) => ({
          time: point.date.slice(0, 10) as Time,
          value: point.value,
        }))
      );
      chart.timeScale().fitContent();
    } catch (error) {
      console.error(error);
    }
  }, [color, data, formatValue]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="img"
      aria-label={label}
    />
  );
}

function hexFade(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return `rgba(232, 238, 246, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
