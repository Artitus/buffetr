import type { SeriesMap, SeriesPoint } from "@/lib/series";
import {
  filterByRange,
  RECEIPTS,
  type RangeWord,
  type ReceiptSlug,
} from "@/lib/verdict";

/** Stable ink for each receipt. Buffett is repainted with the sticker color. */
export const RECEIPT_COLOR: Record<ReceiptSlug, string> = {
  buffett: "#d5dde8",
  btc: "#f7931a",
  houses: "#7dd3fc",
  debt: "#c4b5fd",
  gold: "#f5d061",
  fear: "#fb7185",
  yield: "#34d399",
  rates: "#38bdf8",
};

export interface OverlayEntry {
  slug: ReceiptSlug;
  name: string;
  color: string;
  correlation: number | null;
  /** 0–100 within this series' own min and max on the selected range. */
  points: SeriesPoint[];
}

const MIN_PAIRS = 3;
/** Quarterly debt still lines up with an annual Buffett print inside this window. */
const MAX_GAP_DAYS = 120;

/**
 * Map each point onto that series' own span so different units share one plot.
 * A flat series sits on the midline.
 */
export function percentOfRange(points: SeriesPoint[]): SeriesPoint[] {
  if (points.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }
  const span = max - min;
  if (!Number.isFinite(span) || span === 0) {
    return points.map((point) => ({ date: point.date, value: 50 }));
  }
  return points.map((point) => ({
    date: point.date,
    value: ((point.value - min) / span) * 100,
  }));
}

export function formatCorrelation(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const clamped = Math.max(-1, Math.min(1, value));
  return clamped.toFixed(2);
}

function daysBetween(earlier: string, later: string): number {
  const start = Date.parse(`${earlier}T00:00:00Z`);
  const end = Date.parse(`${later}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.POSITIVE_INFINITY;
  return Math.round((end - start) / 86_400_000);
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < MIN_PAIRS) return null;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - meanX;
    const b = ys[i] - meanY;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  const value = num / Math.sqrt(dx * dy);
  return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : null;
}

/**
 * Pearson r of this series against Buffett on the selected range.
 * Each Buffett print is paired with the latest other-series print on or
 * before that day, within 120 days. Needs three shared prints.
 */
export function correlationWithReference(
  reference: SeriesPoint[],
  series: SeriesPoint[]
): number | null {
  if (reference.length < MIN_PAIRS || series.length < MIN_PAIRS) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  let index = 0;
  for (const ref of reference) {
    while (index + 1 < series.length && series[index + 1].date <= ref.date) {
      index++;
    }
    const sample = series[index];
    if (!sample || sample.date > ref.date) continue;
    if (daysBetween(sample.date, ref.date) > MAX_GAP_DAYS) continue;
    xs.push(ref.value);
    ys.push(sample.value);
  }
  return pearson(xs, ys);
}

function cutoffDay(range: RangeWord): string {
  const years = range === "1Y" ? 1 : 5;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const month = String(cutoff.getMonth() + 1).padStart(2, "0");
  const day = String(cutoff.getDate()).padStart(2, "0");
  return `${cutoff.getFullYear()}-${month}-${day}`;
}

function todayDay(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Points inside the selected range. A series that last printed before the
 * window still draws: its last value is held from the left edge to today.
 * Correlation keeps using the real prints only.
 */
function lineOnRange(points: SeriesPoint[], range: RangeWord): SeriesPoint[] {
  if (range === "ALL" || points.length === 0) return points;
  const inRange = filterByRange(points, range);
  const start = cutoffDay(range);
  const prior = [...points].reverse().find((point) => point.date < start);
  const line = [...inRange];
  if (prior && line[0]?.date !== start) {
    line.unshift({ date: start, value: prior.value });
  }
  if (line.length === 1) {
    const end = todayDay();
    if (line[0].date < end) line.push({ date: end, value: line[0].value });
  }
  return line;
}

function byCorrelation(
  a: { correlation: number | null; index: number },
  b: { correlation: number | null; index: number }
): number {
  if (a.correlation == null && b.correlation == null) return a.index - b.index;
  if (a.correlation == null) return 1;
  if (b.correlation == null) return -1;
  if (a.correlation !== b.correlation) return b.correlation - a.correlation;
  return a.index - b.index;
}

/**
 * Legend order: Buffett first, then everyone else by correlation with Buffett
 * (highest first). Draw order is the reverse, with Buffett painted last.
 */
export function buildOverlay(
  series: SeriesMap,
  range: RangeWord,
  referenceColor: string
): { legend: OverlayEntry[]; draw: OverlayEntry[] } {
  const rows = RECEIPTS.map((receipt, index) => {
    const real = filterByRange(series[receipt.metric] ?? [], range);
    return {
      receipt,
      index,
      real,
      line: lineOnRange(series[receipt.metric] ?? [], range),
    };
  }).filter((row) => row.line.length >= 2);

  const reference = rows.find((row) => row.receipt.slug === "buffett")?.real ?? [];

  const entries = rows.map((row) => {
    const slug = row.receipt.slug;
    const correlation =
      slug === "buffett"
        ? row.real.length >= 2
          ? 1
          : null
        : reference.length >= MIN_PAIRS
          ? correlationWithReference(reference, row.real)
          : null;
    const entry: OverlayEntry = {
      slug,
      name: row.receipt.name,
      color: slug === "buffett" ? referenceColor : RECEIPT_COLOR[slug],
      correlation,
      points: percentOfRange(row.line),
    };
    return { entry, correlation, index: row.index };
  });

  const buffett = entries.find((row) => row.entry.slug === "buffett") ?? null;
  const others = entries
    .filter((row) => row.entry.slug !== "buffett")
    .sort(byCorrelation)
    .map((row) => row.entry);

  const legend = buffett ? [buffett.entry, ...others] : others;
  const draw = [...others].reverse();
  if (buffett) draw.push(buffett.entry);
  return { legend, draw };
}
