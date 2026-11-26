"use client";

import { useMemo } from "react";
import { AreaChart } from "@tremor/react";
import { cn } from "@/lib/utils";

export interface SparkPoint {
  date: string;
  value: number;
}

interface SatelliteSparklineProps {
  id: string;
  title: string;
  subtitle?: string;
  data: SparkPoint[];
  formatValue?: (v: number) => string;
  accent?: string;
  empty?: boolean;
  loading?: boolean;
}

export function SatelliteSparkline({
  id,
  title,
  subtitle,
  data,
  formatValue = (v) => v.toFixed(1),
  accent = "orange",
  empty,
  loading,
}: SatelliteSparklineProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        value: d.value,
      }));
  }, [data]);

  const latest = data.length
    ? [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
    : null;

  const prior =
    data.length > 1
      ? [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[1]
      : null;

  const change =
    latest && prior && prior.value !== 0
      ? ((latest.value - prior.value) / Math.abs(prior.value)) * 100
      : null;

  return (
    <section
      id={id}
      className={cn(
        "flex flex-col border border-[var(--wr-border)] bg-[var(--wr-panel)]/80 p-3",
        "backdrop-blur-sm transition-colors hover:border-[var(--wr-border-bright)]"
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--wr-muted)]">
            {title}
          </h3>
          {subtitle && (
            <p className="truncate text-[10px] text-[var(--wr-dim)]">{subtitle}</p>
          )}
        </div>
        {change !== null && (
          <span
            className={cn(
              "shrink-0 font-mono text-[10px] tabular-nums",
              change >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-2 h-16 animate-pulse bg-[var(--wr-border)]/40" />
      ) : empty || !latest ? (
        <div className="mt-2 flex h-16 items-center justify-center">
          <p className="font-mono text-[10px] text-[var(--wr-dim)]">Awaiting data</p>
        </div>
      ) : (
        <>
          <p className="font-mono text-xl font-semibold tabular-nums text-[var(--wr-fg)]">
            {formatValue(latest.value)}
          </p>
          {chartData.length > 1 && (
            <AreaChart
              className="mt-1 h-14"
              data={chartData}
              index="date"
              categories={["value"]}
              colors={[accent]}
              showLegend={false}
              showXAxis={false}
              showYAxis={false}
              showGridLines={false}
              showAnimation={false}
              curveType="monotone"
            />
          )}
        </>
      )}
    </section>
  );
}
