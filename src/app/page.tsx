"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  TimeRangeSelector,
  filterDataByTimeRange,
  type TimeRange,
} from "@/components/TimeRangeSelector";
import { HeroBuffettChart } from "@/components/war-room/HeroBuffettChart";
import { SatelliteSparkline } from "@/components/war-room/SatelliteSparkline";
import { StatusStrip, type StatusItem } from "@/components/war-room/StatusStrip";
import {
  SATELLITE_DEFS,
  buffettStatus,
  formatMetricValue,
} from "@/lib/metrics-format";
import type { MetricType } from "@/lib/supabase";

interface SeriesPoint {
  date: string;
  value: number;
}

type SeriesMap = Partial<Record<MetricType, SeriesPoint[]>>;
type DataSource = "supabase" | "public_live" | "historical_seed" | "none";

/** Per-request ceiling so a hung /api/metrics call cannot pin "Loading war room…" forever. */
const FETCH_TIMEOUT_MS = 12_000;

async function fetchSeries(
  type: MetricType,
  limit = 500
): Promise<{ points: SeriesPoint[]; source: DataSource }> {
  try {
    const res = await fetch(`/api/metrics/${type}?limit=${limit}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { points: [], source: "none" };
    const json = await res.json();
    const source = (json?.source as DataSource) || "none";
    if (!json?.data?.length) return { points: [], source };
    const points = json.data
      .map((d: { recorded_at: string; value: number }) => ({
        date: d.recorded_at,
        value: d.value,
      }))
      .sort(
        (a: SeriesPoint, b: SeriesPoint) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    return { points, source };
  } catch {
    return { points: [], source: "none" };
  }
}

function latestOf(series?: SeriesPoint[]): SeriesPoint | null {
  if (!series?.length) return null;
  return series[series.length - 1];
}

export default function WarRoomDashboard() {
  const [series, setSeries] = useState<SeriesMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("ALL");
  const [configured, setConfigured] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>("none");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const types: MetricType[] = [
        "buffett_indicator",
        ...SATELLITE_DEFS.map((d) => d.id),
      ];
      // allSettled + timed fetchSeries: partial board still renders if some calls hang/fail
      const settled = await Promise.allSettled(
        types.map(async (t) => [t, await fetchSeries(t)] as const)
      );
      const next: SeriesMap = {};
      let sawPublic = false;
      let sawSeed = false;
      let sawSupabase = false;
      for (const entry of settled) {
        if (entry.status !== "fulfilled") continue;
        const [t, result] = entry.value;
        next[t] = result.points;
        if (result.source === "public_live") sawPublic = true;
        if (result.source === "historical_seed") sawSeed = true;
        if (result.source === "supabase") sawSupabase = true;
      }
      setSeries(next);
      setDataSource(
        sawSupabase
          ? "supabase"
          : sawPublic
            ? "public_live"
            : sawSeed
              ? "historical_seed"
              : "none"
      );
      setConfigured(true);
    } catch (err) {
      console.error(err);
      setError("Unable to reach the metrics API.");
      setConfigured(false);
      setDataSource("none");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buffettAll = useMemo(
    () => series.buffett_indicator || [],
    [series.buffett_indicator]
  );
  const buffett = useMemo(
    () => filterDataByTimeRange(buffettAll, range),
    [buffettAll, range]
  );
  const latestBuffett = latestOf(buffettAll);
  const status = latestBuffett
    ? buffettStatus(latestBuffett.value)
    : { label: "NO DATA", tone: "neutral" as const, color: "#8b9cb3" };

  const statusItems: StatusItem[] = useMemo(() => {
    const items: StatusItem[] = [
      {
        key: "buffett",
        label: "Buffett",
        value: latestBuffett
          ? formatMetricValue("buffett_indicator", latestBuffett.value)
          : "—",
        tone: status.tone,
      },
    ];

    const stripKeys: MetricType[] = [
      "yield_curve",
      "credit_spread",
      "fear_greed",
      "bitcoin",
      "mortgage_rate",
      "sp500",
    ];

    for (const key of stripKeys) {
      const pt = latestOf(series[key]);
      items.push({
        key,
        label: SATELLITE_DEFS.find((d) => d.id === key)?.title || key,
        value: pt ? formatMetricValue(key, pt.value) : "—",
        tone:
          key === "yield_curve" && pt && pt.value < 0
            ? "bad"
            : key === "fear_greed" && pt
              ? pt.value <= 25
                ? "bad"
                : pt.value >= 75
                  ? "warn"
                  : "neutral"
              : "neutral",
      });
    }

    return items;
  }, [latestBuffett, series, status.tone]);

  const hasAnyData = Object.values(series).some((s) => s && s.length > 0);

  if (loading) {
    return (
      <div className="war-room flex min-h-screen flex-col bg-[var(--wr-bg)]">
        <header className="border-b border-[var(--wr-border)] px-5 py-4">
          <p className="font-mono text-2xl font-bold tracking-tight text-[var(--wr-brand)]">
            BUFFETR
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--wr-dim)]">
            Loading war room…
          </p>
        </header>
        <div className="grid flex-1 gap-px bg-[var(--wr-border)] p-px md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[120px] animate-pulse bg-[var(--wr-panel)]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="war-room relative min-h-screen bg-[var(--wr-bg)] text-[var(--wr-fg)]">
        {/* Atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,107,74,0.08),_transparent_55%),linear-gradient(180deg,#0b1118_0%,#070b10_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Header — brand first */}
          <header className="flex flex-col gap-3 border-b border-[var(--wr-border)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-3xl font-bold tracking-tight text-[var(--wr-brand)] sm:text-4xl">
                  BUFFETR
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--wr-dim)]">
                  War Room
                </span>
                <a
                  href="/api/alerts/preview"
                  className="font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)] underline-offset-2 hover:text-[var(--wr-brand)] hover:underline"
                  title="Secret-gated in production"
                >
                  Alerts: stubbed
                </a>
                {dataSource === "public_live" && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider text-amber-400/90"
                    title="Serving live public APIs until Supabase + cron are configured"
                  >
                    Public live feed
                  </span>
                )}
                {dataSource === "historical_seed" && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider text-sky-400/90"
                    title="Committed historical snapshot of real series"
                  >
                    Historical seed
                  </span>
                )}
                {dataSource === "supabase" && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
                    Persisted
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-xl font-mono text-xs text-[var(--wr-muted)] sm:text-sm">
                Public bubble / FUD terminal — Buffett Indicator hero with
                correlated macro satellites.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TimeRangeSelector
                value={range}
                onChange={setRange}
                className="border-[var(--wr-border)] bg-[var(--wr-panel)] text-[var(--wr-fg)]"
              />
              <button
                type="button"
                onClick={load}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--wr-muted)] hover:text-[var(--wr-fg)]"
              >
                Refresh
              </button>
            </div>
          </header>

          <StatusStrip items={statusItems} />

          {(dataSource === "public_live" || dataSource === "historical_seed") && (
            <div
              className={
                dataSource === "public_live"
                  ? "border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 font-mono text-[11px] text-amber-200/90 sm:px-6"
                  : "border-b border-sky-500/25 bg-sky-500/10 px-4 py-2 font-mono text-[11px] text-sky-100/90 sm:px-6"
              }
            >
              {dataSource === "public_live"
                ? "Showing real public series (FRED CSV / CoinGecko / Fear&Greed / CAPE) — not mocked. Add Supabase + FRED key + cron on Vercel to persist."
                : "Showing historical seed of real series (snapshot) — not mocked. Live public/cron refresh when upstream is reachable; persist via Supabase env."}
            </div>
          )}

          {/* Hero Buffett */}
          <section className="relative flex min-h-[42vh] flex-col border-b border-[var(--wr-border)] sm:min-h-[48vh]">
            <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--wr-muted)]">
                  Buffett Indicator
                </h2>
                <p className="font-mono text-[10px] text-[var(--wr-dim)]">
                  US total market cap / GDP
                </p>
              </div>
              <div className="flex items-baseline gap-3">
                {latestBuffett ? (
                  <>
                    <p
                      className="font-mono text-4xl font-bold tabular-nums sm:text-5xl"
                      style={{ color: status.color }}
                    >
                      {latestBuffett.value.toFixed(1)}
                      <span className="text-lg text-[var(--wr-dim)]">%</span>
                    </p>
                    <span
                      className="font-mono text-[10px] uppercase tracking-wider"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </span>
                  </>
                ) : (
                  <p className="font-mono text-sm text-[var(--wr-dim)]">—</p>
                )}
              </div>
            </div>

            <div className="relative flex-1 px-1 pb-2 sm:px-2">
              {buffett.length > 0 ? (
                <HeroBuffettChart data={buffett} />
              ) : (
                <EmptyHero />
              )}
            </div>
          </section>

          {/* Satellites */}
          <section className="px-4 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--wr-muted)]">
                Satellite panels
              </h2>
              {!hasAnyData && (
                <p className="font-mono text-[10px] text-[var(--wr-dim)]">
                  Empty board — connect data sources to populate
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {SATELLITE_DEFS.map((def) => {
                const raw = series[def.id] || [];
                const filtered = filterDataByTimeRange(raw, range);
                return (
                  <SatelliteSparkline
                    key={def.id}
                    id={def.id}
                    title={def.title}
                    subtitle={def.subtitle}
                    data={filtered}
                    accent={def.accent}
                    empty={raw.length === 0}
                    formatValue={(v) => formatMetricValue(def.id, v)}
                  />
                );
              })}
            </div>
          </section>

          {error && (
            <div className="mx-4 mb-4 border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-300 sm:mx-6">
              {error}{" "}
              <button
                type="button"
                onClick={load}
                className="underline hover:text-rose-100"
              >
                Retry
              </button>
            </div>
          )}

          {!hasAnyData && !error && (
            <div className="mx-4 mb-6 border border-[var(--wr-border)] bg-[var(--wr-panel)] px-4 py-6 text-center sm:mx-6">
              <p className="font-mono text-sm text-[var(--wr-fg)]">
                War room is live — metrics board is empty
              </p>
              <p className="mt-2 font-mono text-xs text-[var(--wr-muted)]">
                {configured
                  ? "Configure Supabase + FRED, set SUPABASE_SERVICE_ROLE_KEY, then run the ingest cron to seed the board."
                  : "Metrics API unreachable. Check deployment configuration."}
              </p>
            </div>
          )}

          <footer className="mt-auto flex flex-col gap-1 border-t border-[var(--wr-border)] px-4 py-3 font-mono text-[10px] text-[var(--wr-dim)] sm:flex-row sm:justify-between sm:px-6">
            <span>
              Sources: FRED · CoinGecko · Alternative.me · metals.live · datahub
              CAPE
            </span>
            <span>Buffetr · public free · alerts stubbed · no live X post</span>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function EmptyHero() {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center border border-dashed border-[var(--wr-border)] bg-[var(--wr-panel)]/40">
      <div className="max-w-md px-6 text-center">
        <p className="font-mono text-sm text-[var(--wr-muted)]">
          Buffett Indicator chart awaits first ingest
        </p>
        <p className="mt-2 font-mono text-[11px] text-[var(--wr-dim)]">
          Once cron writes FRED series DDDM01USA156NWDB, the hero fills edge to
          edge.
        </p>
      </div>
    </div>
  );
}
