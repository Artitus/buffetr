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
      className="flex min-h-screen flex-col bg-[var(--wr-bg)] text-[var(--wr-fg)]"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <h1
            className="text-7xl font-bold leading-[0.85] tracking-tight sm:text-8xl md:text-9xl"
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
          <p className="mt-4 font-mono text-4xl font-medium tabular-nums tracking-tight sm:text-5xl">
            {loading ? "\u00a0" : activeNumber}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
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
                className={`rounded-full px-3 py-2 font-mono text-sm tabular-nums transition-colors ${
                  selected
                    ? "bg-white/10 text-[var(--wr-fg)]"
                    : "text-[var(--wr-dim)] hover:text-[var(--wr-muted)]"
                }`}
              >
                <span>{receipt.name}</span>{" "}
                <span>{number}</span>
                {arrow ? <span aria-hidden> {arrow}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {!loading && chartData.length >= 2 ? (
            <ErrorBoundary
              fallback={
                <p className="flex h-[280px] items-center justify-center font-mono text-4xl text-[var(--wr-dim)]">
                  —
                </p>
              }
            >
              <ReceiptChart
                data={chartData}
                color={verdict?.color ?? "#8b9cb3"}
                formatValue={formatValue}
                label={active.name}
              />
            </ErrorBoundary>
          ) : (
            <div className="flex h-[280px] items-center justify-center font-mono text-4xl text-[var(--wr-dim)]">
              {loading ? "" : "—"}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
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

        <footer className="pt-12 text-center font-mono text-[10px] text-[var(--wr-dim)]">
          FRED · CoinGecko · Alternative.me · metals.live
        </footer>
      </div>
    </main>
  );
}
