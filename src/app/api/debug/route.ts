import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "FRED_API_KEY not set", hasKey: false });
  }

  // Try multiple Wilshire 5000 series IDs to find the correct one
  const seriesIds = ["WILL5000PR", "WILL5000IND", "WILL5000INDFC", "WILRESPR"];
  const results: Record<string, unknown> = {};

  for (const seriesId of seriesIds) {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=3&sort_order=desc`;
      const response = await fetch(url);
      const data = await response.json();
      results[seriesId] = {
        status: response.status,
        hasData: data.observations?.length > 0,
        sample: data.observations?.[0],
      };
    } catch (error) {
      results[seriesId] = { error: String(error) };
    }
  }

  return NextResponse.json({ results });
}

