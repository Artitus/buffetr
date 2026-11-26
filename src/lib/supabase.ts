import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let _anon: SupabaseClient | null = null;
let _service: SupabaseClient | null = null;

function getAnonClient(): SupabaseClient {
  if (!_anon) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    _anon = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _anon;
}

/** Service-role client for cron / server writes. Bypasses RLS. */
function getServiceClient(): SupabaseClient {
  if (!_service) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Supabase service role not configured. Set SUPABASE_SERVICE_ROLE_KEY for writes."
      );
    }
    _service = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}

export const supabase = {
  get client() {
    return getAnonClient();
  },
};

export const METRIC_TYPES = [
  "buffett_indicator",
  "gold",
  "silver",
  "sp500",
  "mortgage_rate",
  "home_price_index",
  "market_cap",
  "gdp",
  "m2_real",
  "cpi",
  "federal_debt",
  "federal_interest",
  "bitcoin",
  "btc_gold_ratio",
  "margin_debt",
  "cape",
  "fear_greed",
  "yield_curve",
  "credit_spread",
] as const;

export type MetricType = (typeof METRIC_TYPES)[number];

export function isMetricType(value: string): value is MetricType {
  return (METRIC_TYPES as readonly string[]).includes(value);
}

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
    const { data, error } = await getAnonClient()
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
    const { data, error } = await getAnonClient()
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
    const { error } = await getServiceClient().from("metrics").upsert(
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
    console.error("Supabase write failed:", error);
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
  if (metrics.length === 0) return true;

  try {
    const formattedMetrics = metrics.map((m) => ({
      metric_type: m.metric_type,
      value: m.value,
      recorded_at: m.recorded_at.toISOString(),
      metadata: m.metadata || null,
    }));

    const { error } = await getServiceClient()
      .from("metrics")
      .upsert(formattedMetrics, {
        onConflict: "metric_type,recorded_at",
      });

    if (error) {
      console.error("Error bulk upserting metrics:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase write failed:", error);
    return false;
  }
}
