"use client";

import { useLayoutEffect, useRef } from "react";
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineWidth,
  type Time,
} from "lightweight-charts";
import type { OverlayEntry } from "@/lib/overlay";
import type { ReceiptSlug } from "@/lib/verdict";

interface OverlayChartProps {
  lines: OverlayEntry[];
  focus: ReceiptSlug;
}

export function OverlayChart({ lines, focus }: OverlayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const focusRef = useRef(focus);
  const stackKey = lines.map((line) => line.slug).join(",");
  const dataKey = lines
    .map((line) => {
      const first = line.points[0];
      const last = line.points[line.points.length - 1];
      return `${line.slug}:${line.points.length}:${first?.date}:${last?.date}:${last?.value}`;
    })
    .join("|");

  useLayoutEffect(() => {
    focusRef.current = focus;
  }, [focus]);

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
          horzLine: { visible: false, labelVisible: false },
        },
        rightPriceScale: {
          visible: false,
          scaleMargins: { top: 0.08, bottom: 0.06 },
        },
        leftPriceScale: { visible: false },
        timeScale: {
          borderColor: "#2d3e50",
          timeVisible: false,
          minBarSpacing: 0,
          rightOffset: 0,
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

    chartRef.current = chart;
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
      seriesRef.current = [];
    };
  }, []);

  useLayoutEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const series of seriesRef.current) {
      chart.removeSeries(series);
    }
    seriesRef.current = [];

    for (const line of lines) {
      if (line.points.length < 2) continue;
      const series = chart.addSeries(LineSeries, {
        color: lineColor(line, focusRef.current),
        lineWidth: lineWidth(line, focusRef.current),
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: line.slug === focusRef.current,
        priceScaleId: "right",
      });
      try {
        series.setData(
          line.points.map((point) => ({
            time: point.date.slice(0, 10) as Time,
            value: point.value,
          }))
        );
      } catch (error) {
        console.error(error);
      }
      seriesRef.current.push(series);
    }

    try {
      chart.timeScale().fitContent();
    } catch (error) {
      console.error(error);
    }
  }, [dataKey, lines, stackKey]);

  useLayoutEffect(() => {
    lines.forEach((line, index) => {
      seriesRef.current[index]?.applyOptions({
        color: lineColor(line, focus),
        lineWidth: lineWidth(line, focus),
        crosshairMarkerVisible: line.slug === focus,
      });
    });
  }, [focus, lines]);

  const label = lines.map((line) => line.name).join(", ");

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="img"
      aria-label={label ? `Overlaid ${label}` : "Overlay"}
    />
  );
}

function lineWidth(line: OverlayEntry, focus: ReceiptSlug): LineWidth {
  if (line.slug === focus) return 3;
  if (line.slug === "buffett") return 2;
  return 1;
}

function lineColor(line: OverlayEntry, focus: ReceiptSlug): string {
  if (line.slug === focus) return withAlpha(line.color, 1);
  if (line.slug === "buffett") return withAlpha(line.color, 0.85);
  return withAlpha(line.color, 0.55);
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return `rgba(232, 238, 246, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
