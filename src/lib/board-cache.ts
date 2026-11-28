import type { MetricType } from "@/lib/supabase";
import {
  normalizeSeries,
  type SeriesMap,
  type SeriesPoint,
} from "@/lib/series";
import { RECEIPTS } from "@/lib/verdict";

const STORAGE_KEY = "buffetr.board.v1";
/** Long enough for daily yields back to 1976 and daily gold back to 2000. */
const MAX_POINTS = 20000;

const EMPTY_CACHE: SeriesMap = {};
const BOARD_METRICS = new Set<string>(RECEIPTS.map((receipt) => receipt.metric));

let cachedRaw: string | null | undefined;
let cachedSnapshot: SeriesMap = EMPTY_CACHE;
const listeners = new Set<() => void>();

function isBoardMetric(value: string): value is MetricType {
  return BOARD_METRICS.has(value);
}

function parseCache(raw: string | null): SeriesMap {
  if (!raw) return EMPTY_CACHE;
  try {
    const parsed = JSON.parse(raw) as { v?: number; series?: unknown };
    if (parsed?.v !== 1 || !parsed.series || typeof parsed.series !== "object") {
      return EMPTY_CACHE;
    }
    const series: SeriesMap = {};
    for (const [metric, points] of Object.entries(parsed.series)) {
      if (!isBoardMetric(metric) || !Array.isArray(points)) continue;
      const normalized = normalizeSeries(points).slice(-MAX_POINTS);
      if (normalized.length >= 2) series[metric] = normalized;
    }
    return Object.keys(series).length > 0 ? series : EMPTY_CACHE;
  } catch {
    return EMPTY_CACHE;
  }
}

function remember(raw: string | null, snapshot: SeriesMap): SeriesMap {
  cachedRaw = raw;
  cachedSnapshot = snapshot;
  return snapshot;
}

/** Last successful chartable series. Stable reference until storage changes. */
export function readBoardCache(): SeriesMap {
  if (typeof window === "undefined") return EMPTY_CACHE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_CACHE;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  return remember(raw, parseCache(raw));
}

export function getServerBoardCache(): SeriesMap {
  return EMPTY_CACHE;
}

export function subscribeBoardCache(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function writeBoardMetric(metric: MetricType, points: SeriesPoint[]): void {
  if (typeof window === "undefined" || points.length < 2) return;
  try {
    const series = { ...readBoardCache(), [metric]: points.slice(-MAX_POINTS) };
    const raw = JSON.stringify({ v: 1, series });
    window.localStorage.setItem(STORAGE_KEY, raw);
    remember(raw, series);
    for (const listener of listeners) listener();
  } catch {
    /* private mode or a full quota — the in-memory series still paints */
  }
}
