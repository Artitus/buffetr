import { NextResponse } from "next/server";
import { getMetrics, METRIC_TYPES, type MetricType } from "@/lib/supabase";
import {
  composeRssFeed,
  composeTweet,
  detectFlux,
  DEFAULT_FLUX_RULES,
  type MetricSample,
} from "@/lib/alerts";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function verifySecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

const WATCHED: MetricType[] = [
  "buffett_indicator",
  "yield_curve",
  "credit_spread",
  "fear_greed",
  "bitcoin",
];

export async function GET(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const samples: MetricSample[] = [];

  for (const metricType of WATCHED) {
    const rows = await getMetrics(metricType, 2);
    if (rows.length === 0) continue;
    samples.push({
      metricType,
      value: rows[0].value,
      previousValue: rows[1]?.value,
      recordedAt: rows[0].recorded_at,
    });
  }

  const events = detectFlux(samples, DEFAULT_FLUX_RULES);
  const tweet = composeTweet(events);
  const rss = composeRssFeed(events);

  return NextResponse.json({
    stub: true,
    livePost: false,
    message: "Alerts are stubbed — drafts only, no X/Twitter post",
    watched: WATCHED,
    validMetricTypes: METRIC_TYPES,
    samples,
    events,
    draft: {
      tweet,
      rssPreview: rss.slice(0, 500) + (rss.length > 500 ? "…" : ""),
    },
    timestamp: new Date().toISOString(),
  });
}
