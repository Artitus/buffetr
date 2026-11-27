"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.length < 2) return;

    const chart = createChart(el, {
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

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: hexFade(color, 0.35),
      bottomColor: hexFade(color, 0),
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatValue(price),
      },
    });

    series.setData(
      data.map((d) => ({
        time: d.date.slice(0, 10) as Time,
        value: d.value,
      }))
    );
    chart.timeScale().fitContent();

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
    };
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
