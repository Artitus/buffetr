"use client";

import { startTransition, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SayingLine } from "@/components/SayingLine";
import { ReceiptChart } from "@/components/ReceiptChart";
import {
  getServerBoardCache,
  readBoardCache,
  subscribeBoardCache,
  writeBoardMetric,
} from "@/lib/board-cache";
import {
  applyLiveSeries,
  EMPTY_SERIES,
  normalizeSeries,
  type SeriesMap,
  type SeriesPoint,
} from "@/lib/series";
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

/** One hung public feed must not outlive this. The board does not wait on it. */
const FETCH_TIMEOUT_MS = 12_000;

async function fetchSeries(
  type: MetricType,
  signal: AbortSignal
): Promise<SeriesPoint[]> {
  try {
    const res = await fetch(`/api/metrics/${type}?limit=1000`, { signal });
    if (!res.ok) return EMPTY_SERIES;
    const json = await res.json();
    return normalizeSeries(json?.data);
  } catch {
    return EMPTY_SERIES;
  }
}

export function Board({
  initialSeries,
  initialSlug,
}: {
  initialSeries: SeriesMap;
  initialSlug: ReceiptSlug;
}) {
  const cached = useSyncExternalStore(
    subscribeBoardCache,
    readBoardCache,
    getServerBoardCache
  );
  const [live, setLive] = useState<SeriesMap>({});
  const [slug, setSlug] = useState<ReceiptSlug>(initialSlug);
  const [range, setRange] = useState<RangeWord>("ALL");

  const series = useMemo(() => {
    const seeded: SeriesMap = { ...initialSeries };
    for (const receipt of RECEIPTS) {
      const known = cached[receipt.metric];
      if (known && known.length >= 2) seeded[receipt.metric] = known;
    }
    return RECEIPTS.reduce(
      (next, receipt) => {
        const fresh = live[receipt.metric];
        return fresh ? applyLiveSeries(next, receipt.metric, fresh) : next;
      },
      seeded
    );
  }, [cached, initialSeries, live]);

  useEffect(() => {
    const sync = () => {
      setSlug(parseSlug(new URLSearchParams(window.location.search).get("m")));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    for (const receipt of RECEIPTS) {
      void fetchSeries(receipt.metric, controller.signal).then((points) => {
        if (controller.signal.aborted || points.length === 0) return;
        if (points.length >= 2) writeBoardMetric(receipt.metric, points);
        startTransition(() => {
          setLive((prev) => applyLiveSeries(prev, receipt.metric, points));
        });
      });
    }

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  const active = receiptBySlug(slug);
  const buffettValue = series.buffett_indicator?.at(-1)?.value ?? null;
  const verdict = buffettValue == null ? null : verdictFromBuffett(buffettValue);
  const activePoints = series[active.metric] ?? EMPTY_SERIES;
  const activeValue = activePoints.at(-1)?.value ?? null;
  const activeNumber =
    activeValue == null ? "—" : stickerNumber(active.metric, activeValue);

  const chartData = useMemo(
    () => filterByRange(activePoints, range),
    [activePoints, range]
  );

  const formatValue = useCallback(
    (value: number) => stickerNumber(active.metric, value),
    [active.metric]
  );

  const promote = (next: ReceiptSlug) => {
    setSlug(next);
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
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--wr-bg)] text-[var(--wr-fg)]">
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-end justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-5">
          <h1
            className="text-5xl font-bold leading-none tracking-tight sm:text-7xl lg:text-8xl"
            style={{ color: verdict?.color ?? "#d5dde8" }}
          >
            {verdict?.word ?? "—"}
          </h1>
          <p className="font-mono text-3xl font-medium tabular-nums tracking-tight sm:text-5xl">
            {activeNumber}
          </p>
        </div>

        <SayingLine band={verdict?.word ?? null} ready />

        <div className="relative min-h-0 flex-1">
          {chartData.length >= 2 ? (
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
              —
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
          const points = series[receipt.metric] ?? EMPTY_SERIES;
          const value = points.at(-1)?.value ?? null;
          const number = value == null ? "—" : stickerNumber(receipt.metric, value);
          const arrow = value == null ? null : arrowFor(points.map((point) => point.value));
          const selected = slug === receipt.slug;
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
