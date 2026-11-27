import { ImageResponse } from "next/og";
import type { MetricType } from "@/lib/supabase";
import {
  parseSlug,
  receiptBySlug,
  stickerNumber,
  verdictFromBuffett,
} from "@/lib/verdict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;
const BUDGET_MS = 3500;

const STATIC_FALLBACK = {
  word: "COOKED",
  number: "—",
  name: "Buffett",
  color: "#fb4d5a",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = parseSlug(url.searchParams.get("m"));
  const receipt = receiptBySlug(slug);

  const card = await loadCard(url.origin, receipt.metric, receipt.name);
  return renderCard(card ?? STATIC_FALLBACK);
}

async function loadCard(
  origin: string,
  metric: MetricType,
  name: string
): Promise<{
  word: string;
  number: string;
  name: string;
  color: string;
} | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  try {
    const [buffett, active] = await Promise.all([
      metric === "buffett_indicator"
        ? Promise.resolve<number | null>(null)
        : latestValue(origin, "buffett_indicator", controller.signal),
      latestValue(origin, metric, controller.signal),
    ]);
    if (controller.signal.aborted) return null;
    const buffettValue = metric === "buffett_indicator" ? active : buffett;
    const number = active == null ? "—" : stickerNumber(metric, active);
    if (buffettValue == null) {
      return { word: "—", number, name, color: "#d5dde8" };
    }
    const verdict = verdictFromBuffett(buffettValue);
    return { word: verdict.word, number, name, color: verdict.color };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function latestValue(
  origin: string,
  type: string,
  signal: AbortSignal
): Promise<number | null> {
  const res = await fetch(`${origin}/api/metrics/${type}?latest=true`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { value?: unknown } };
  const value = json?.data?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function renderCard(card: {
  word: string;
  number: string;
  name: string;
  color: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070b10",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 168,
            fontWeight: 700,
            letterSpacing: -6,
            lineHeight: 0.9,
            color: card.color,
          }}
        >
          {card.word}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 84,
            fontWeight: 500,
            color: "#e8eef6",
            letterSpacing: -2,
          }}
        >
          {card.number}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 32,
            color: "#8b9cb3",
            letterSpacing: 1,
          }}
        >
          {card.name}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=300",
      },
    }
  );
}
