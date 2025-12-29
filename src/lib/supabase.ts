import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

export const supabase = {
  get client() {
    return getSupabase();
  },
};

export type MetricType =
  | "buffett_indicator"
  | "gold"
  | "silver"
  | "sp500"
  | "mortgage_rate"
  | "home_price_index"
  | "market_cap"
  | "gdp";

export interface Metric {
  id: number;
  metric_type: MetricType;
  value: number;
  recorded_at: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function getMetrics(
  metricType: MetricType,
  limit: number = 365
): Promise<Metric[]> {
  try {
    const { data, error } = await getSupabase()
      .from("metrics")
      .select("*")
      .eq("metric_type", metricType)
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching metrics:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Supabase not configured:", error);
    return [];
  }
}

export async function getLatestMetric(
  metricType: MetricType
): Promise<Metric | null> {
  try {
    const { data, error } = await getSupabase()
      .from("metrics")
      .select("*")
      .eq("metric_type", metricType)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching latest metric:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Supabase not configured:", error);
    return null;
  }
}

export async function upsertMetric(
  metricType: MetricType,
  value: number,
  recordedAt: Date,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await getSupabase().from("metrics").upsert(
      {
        metric_type: metricType,
        value,
        recorded_at: recordedAt.toISOString(),
        metadata,
      },
      {
        onConflict: "metric_type,recorded_at",
      }
    );

    if (error) {
      console.error("Error upserting metric:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase not configured:", error);
    return false;
  }
}

export async function bulkUpsertMetrics(
  metrics: Array<{
    metric_type: MetricType;
    value: number;
    recorded_at: Date;
    metadata?: Record<string, unknown>;
  }>
): Promise<boolean> {
  try {
    const formattedMetrics = metrics.map((m) => ({
      metric_type: m.metric_type,
      value: m.value,
      recorded_at: m.recorded_at.toISOString(),
      metadata: m.metadata || null,
    }));

    const { error } = await getSupabase().from("metrics").upsert(formattedMetrics, {
      onConflict: "metric_type,recorded_at",
    });

    if (error) {
      console.error("Error bulk upserting metrics:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase not configured:", error);
    return false;
  }
}
