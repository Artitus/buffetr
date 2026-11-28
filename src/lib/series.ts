import type { MetricType } from "@/lib/supabase";

export interface SeriesPoint {
  date: string;
  value: number;
}

export type SeriesMap = Partial<Record<MetricType, SeriesPoint[]>>;

export const EMPTY_SERIES: SeriesPoint[] = [];

/** One point per day, oldest first. Drops bad rows so the chart never sees duplicates. */
export function normalizeSeries(
  points: Array<{ date?: string; recorded_at?: string; value?: number }> | null | undefined
): SeriesPoint[] {
  if (!points?.length) return EMPTY_SERIES;
  const byDay = new Map<string, number>();
  for (const point of points) {
    if (!point || typeof point.value !== "number" || !Number.isFinite(point.value)) {
      continue;
    }
    const rawDate = point.date || point.recorded_at;
    if (!rawDate) continue;
    const day = String(rawDate).slice(0, 10);
    if (day.length < 10) continue;
    byDay.set(day, point.value);
  }
  if (byDay.size === 0) return EMPTY_SERIES;
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

/**
 * A live refresh may replace a series. An empty or failed read must not.
 * A single point can fill a blank receipt, and must not wipe a drawn chart.
 */
export function applyLiveSeries(
  prev: SeriesMap,
  metric: MetricType,
  points: SeriesPoint[]
): SeriesMap {
  if (points.length >= 2) return { ...prev, [metric]: points };
  if (points.length === 1 && (prev[metric]?.length ?? 0) < 2) {
    return { ...prev, [metric]: points };
  }
  return prev;
}
