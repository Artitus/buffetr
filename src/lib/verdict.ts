import type { MetricType } from "@/lib/supabase";

/** Sticker words. Thresholds match the Buffett bands already used on the board. */
export type VerdictWord = "CHEAP" | "FINE" | "HOT" | "COOKED";

export type ReceiptSlug =
  | "buffett"
  | "btc"
  | "houses"
  | "debt"
  | "gold"
  | "fear"
  | "yield"
  | "rates";

export type RangeWord = "1Y" | "5Y" | "ALL";

export const RANGE_WORDS: RangeWord[] = ["1Y", "5Y", "ALL"];

export const RECEIPTS: ReadonlyArray<{
  slug: ReceiptSlug;
  name: string;
  metric: MetricType;
}> = [
  { slug: "buffett", name: "Buffett", metric: "buffett_indicator" },
  { slug: "btc", name: "BTC", metric: "bitcoin" },
  { slug: "houses", name: "Houses", metric: "home_price_index" },
  { slug: "debt", name: "Debt", metric: "federal_debt" },
  { slug: "gold", name: "Gold", metric: "gold" },
  { slug: "fear", name: "Fear", metric: "fear_greed" },
  { slug: "yield", name: "Yield", metric: "yield_curve" },
  { slug: "rates", name: "Rates", metric: "mortgage_rate" },
];

const SLUGS = new Set<string>(RECEIPTS.map((r) => r.slug));

export function parseSlug(raw: string | null | undefined): ReceiptSlug {
  const value = (raw || "").trim().toLowerCase();
  if (SLUGS.has(value)) return value as ReceiptSlug;
  return "buffett";
}

export function receiptBySlug(slug: ReceiptSlug) {
  return RECEIPTS.find((r) => r.slug === slug) ?? RECEIPTS[0];
}

export function verdictFromBuffett(value: number): {
  word: VerdictWord;
  copyWord: "Cheap" | "Fine" | "Hot" | "Cooked";
  color: string;
} {
  if (value < 75) {
    return { word: "CHEAP", copyWord: "Cheap", color: "#34d399" };
  }
  if (value < 100) {
    return { word: "FINE", copyWord: "Fine", color: "#d5dde8" };
  }
  if (value < 140) {
    return { word: "HOT", copyWord: "Hot", color: "#fbbf24" };
  }
  return { word: "COOKED", copyWord: "Cooked", color: "#fb4d5a" };
}

/** Number printed under the word, on a receipt, and in the copy line. */
export function stickerNumber(metric: MetricType, value: number): string {
  if (!Number.isFinite(value)) return "—";
  switch (metric) {
    case "buffett_indicator":
      return Math.round(value).toString();
    case "bitcoin":
    case "gold":
      return Math.round(value).toLocaleString("en-US");
    case "fear_greed":
      return Math.round(value).toString();
    case "home_price_index":
      return value.toFixed(1);
    case "federal_debt": {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}T`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}B`;
      return Math.round(value).toString();
    }
    case "yield_curve":
    case "mortgage_rate":
      return `${value.toFixed(2)}%`;
    default:
      return value.toFixed(2);
  }
}

export function copySentence(
  name: string,
  number: string,
  copyWord: string | null
): string {
  if (copyWord) return `${name} ${number}. ${copyWord}.`;
  return `${name} ${number}.`;
}

export function arrowFor(values: number[]): "↑" | "↓" | "→" | null {
  if (values.length < 2) return null;
  const prev = values[values.length - 2];
  const last = values[values.length - 1];
  if (!Number.isFinite(prev) || !Number.isFinite(last)) return null;
  if (last > prev) return "↑";
  if (last < prev) return "↓";
  return "→";
}

export function filterByRange<T extends { date: string }>(
  points: T[],
  range: RangeWord
): T[] {
  if (range === "ALL" || points.length === 0) return points;
  const years = range === "1Y" ? 1 : 5;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const t = cutoff.getTime();
  return points.filter((p) => new Date(p.date).getTime() >= t);
}
