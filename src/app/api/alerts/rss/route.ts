import { NextResponse } from "next/server";
import { composeRssFeed } from "@/lib/alerts";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Public RSS skeleton. Returns a valid empty feed until live alert delivery is enabled.
 * Flux drafts are available via /api/alerts/preview (secret-gated).
 */
export async function GET() {
  const xml = composeRssFeed([]);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Buffetr-Alerts": "stubbed",
    },
  });
}
