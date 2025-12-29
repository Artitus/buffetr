import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/supabase";

export const runtime = "edge";

export async function GET() {
  // Check database
  try {
    const data = await getMetrics("buffett_indicator", 10);
    return NextResponse.json({
      dbConnected: true,
      recordCount: data.length,
      sample: data.slice(0, 3),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "not set",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set",
    });
  } catch (error) {
    return NextResponse.json({
      dbConnected: false,
      error: String(error),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "not set",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set",
    });
  }
}

