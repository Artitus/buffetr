"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReceiptChart } from "@/components/ReceiptChart";
import type { MetricType } from "@/lib/supabase";
import {
  RANGE_WORDS,
  RECEIPTS,
  arrowFor,
  copySentence,
  filterByRange,
  parseSlug,
  receiptBySlug,
  stickerNumber,
  verdictFromBuffett,
  type RangeWord,
  type ReceiptSlug,
} from "@/lib/verdict";

interface SeriesPoint {
  date: string;
  value: number;
}

type SeriesMap = Partial<Record<MetricType, SeriesPoint[]>>;

/** Per-request ceiling so one hung /api/metrics call cannot pin the word slot. */
const FETCH_TIMEOUT_MS = 12_000;

async function fetchSeries(
  type: MetricType,
  limit = 1000
): Promise<SeriesPoint[]> {
  try {
    const res = await fetch(`/api/metrics/${type}?limit=${limit}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json?.data?.length) return [];
    const byDay = new Map<string, number>();
    for (const d of json.data as { recorded_at?: string; value?: number }[]) {
      if (typeof d?.value !== "number" || !Number.isFinite(d.value)) continue;
      if (!d.recorded_at) continue;
      byDay.set(String(d.recorded_at).slice(0, 10), d.value);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));
  } catch {
    return [];
  }
}

function latestValue(points?: SeriesPoint[]): number | null {
  if (!points?.length) return null;
  return points[points.length - 1].value;
}

export default function Page() {
  const [series, setSeries] = useState<SeriesMap>({});
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<ReceiptSlug>("buffett");
  const [urlReady, setUrlReady] = useState(false);
  const [range, setRange] = useState<RangeWord>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const types = RECEIPTS.map((r) => r.metric);
      const settled = await Promise.allSettled(
        types.map(async (t) => [t, await fetchSeries(t)] as const)
      );
      const next: SeriesMap = {};
      for (const entry of settled) {
        if (entry.status !== "fulfilled") continue;
        const [t, points] = entry.value;
        next[t] = points;
      }
      setSeries(next);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      setSlug(parseSlug(new URLSearchParams(window.location.search).get("m")));
    };
    sync();
    setUrlReady(true);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = receiptBySlug(slug);
  const buffettValue = latestValue(series.buffett_indicator);
  const verdict =
    buffettValue == null ? null : verdictFromBuffett(buffettValue);
  const activeValue = latestValue(series[active.metric]);
  const activeNumber =
    activeValue == null ? "—" : stickerNumber(active.metric, activeValue);

  const chartData = useMemo(
    () => filterByRange(series[active.metric] ?? [], range),
    [series, active.metric, range]
  );

  const formatValue = useCallback(
    (value: number) => stickerNumber(active.metric, value),
    [active.metric]
  );

  const promote = (next: ReceiptSlug) => {
    setSlug(next);
    setUrlReady(true);
    const url = new URL(window.location.href);
    url.searchParams.set("m", next);
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
  };

  const onCopy = async () => {
    const sentence = copySentence(
      active.name,
      activeNumber,
      verdict?.copyWord ?? null
    );
    const line = `${sentence} ${window.location.href}`;
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main
      aria-busy={loading}
      className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--wr-bg)] text-[var(--wr-fg)]"
    >
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-end justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-5">
          <h1
            className="text-5xl font-bold leading-none tracking-tight sm:text-7xl lg:text-8xl"
            style={{ color: verdict?.color ?? "#d5dde8" }}
          >
            {loading ? (
              <span
                aria-hidden
                className="inline-block h-[0.72em] w-[4.6ch] animate-pulse rounded-md bg-current"
              />
            ) : (
              (verdict?.word ?? "—")
            )}
          </h1>
          <p className="font-mono text-3xl font-medium tabular-nums tracking-tight sm:text-5xl">
            {loading ? "\u00a0" : activeNumber}
          </p>
        </div>

        <div className="relative min-h-0 flex-1">
          {!loading && chartData.length >= 2 ? (
            <ErrorBoundary
              fallback={
                <p className="flex h-full items-center justify-center font-mono text-4xl text-[var(--wr-dim)]">
                  —
                </p>
              }
            >
              <div className="absolute inset-0">
                <ReceiptChart
                  data={chartData}
                  color={verdict?.color ?? "#8b9cb3"}
                  formatValue={formatValue}
                  label={active.name}
                />
              </div>
            </ErrorBoundary>
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-4xl text-[var(--wr-dim)]">
              {loading ? "" : "—"}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 sm:px-6">
          <div className="flex gap-4 font-mono text-sm">
            {RANGE_WORDS.map((word) => (
              <button
                key={word}
                type="button"
                aria-pressed={range === word}
                onClick={() => setRange(word)}
                className={
                  range === word
                    ? "text-[var(--wr-fg)]"
                    : "text-[var(--wr-dim)] hover:text-[var(--wr-muted)]"
                }
              >
                {word}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="font-mono text-sm text-[var(--wr-muted)] hover:text-[var(--wr-fg)]"
          >
            Copy
          </button>
        </div>
      </section>

      <section className="grid shrink-0 grid-cols-4 gap-px border-t border-[var(--wr-border)] bg-[var(--wr-border)] lg:grid-cols-8">
        {RECEIPTS.map((receipt) => {
          const points = series[receipt.metric];
          const value = latestValue(points);
          const number =
            loading || value == null
              ? "—"
              : stickerNumber(receipt.metric, value);
          const arrow =
            !loading && value != null
              ? arrowFor((points ?? []).map((p) => p.value))
              : null;
          const selected = urlReady && slug === receipt.slug;
          return (
            <button
              key={receipt.slug}
              type="button"
              aria-pressed={selected}
              onClick={() => promote(receipt.slug)}
              className={`flex min-w-0 flex-col items-start gap-0.5 px-3 py-2.5 text-left font-mono tabular-nums transition-colors sm:px-4 ${
                selected
                  ? "bg-white/10 text-[var(--wr-fg)]"
                  : "bg-[var(--wr-bg)] text-[var(--wr-dim)] hover:bg-white/5 hover:text-[var(--wr-muted)]"
              }`}
            >
              <span className="text-[10px] uppercase tracking-[0.14em]">
                {receipt.name}
              </span>
              <span className="text-sm sm:text-base">
                {number}
                {arrow ? <span aria-hidden> {arrow}</span> : null}
              </span>
            </button>
          );
        })}
      </section>

      <footer className="shrink-0 border-t border-[var(--wr-border)] px-4 py-1.5 text-center font-mono text-[10px] text-[var(--wr-dim)]">
        FRED · CoinGecko · Alternative.me · metals.live
      </footer>
    </main>
  );
}
