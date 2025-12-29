import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "FRED_API_KEY not set", hasKey: false });
  }

  // Test fetching Wilshire 5000 directly
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=WILL5000PRFC&api_key=${apiKey}&file_type=json&limit=5&sort_order=desc`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    return NextResponse.json({
      hasKey: true,
      keyLength: apiKey.length,
      status: response.status,
      response: text.slice(0, 500), // First 500 chars
    });
  } catch (error) {
    return NextResponse.json({
      hasKey: true,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

