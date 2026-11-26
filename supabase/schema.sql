-- Buffetr Database Schema (source of truth)
-- Run this in your Supabase SQL editor to set up the database.
-- Cron writes must use the service role key (bypasses RLS).
-- Anon key is read-only.

-- Core metrics table for all time-series data
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  value DECIMAL(20, 6) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(metric_type, recorded_at)
);

-- Index for fast time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_type_date ON metrics(metric_type, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Drop legacy open write policies if re-running
DROP POLICY IF EXISTS "Allow public read access" ON metrics;
DROP POLICY IF EXISTS "Allow authenticated insert" ON metrics;
DROP POLICY IF EXISTS "Allow authenticated update" ON metrics;
DROP POLICY IF EXISTS "Allow public read" ON metrics;
DROP POLICY IF EXISTS "Allow insert" ON metrics;
DROP POLICY IF EXISTS "Allow update" ON metrics;

-- Anon / public: read-only
CREATE POLICY "metrics_public_read" ON metrics
  FOR SELECT
  USING (true);

-- Writes: service role only (bypasses RLS). No anon INSERT/UPDATE/DELETE.

-- Metric types reference:
-- buffett_indicator  — Total Market Cap / GDP (%)
-- gold / silver      — USD per troy ounce
-- sp500              — S&P 500 index
-- mortgage_rate      — 30-year fixed mortgage (%)
-- home_price_index   — Case-Shiller National HPI
-- market_cap / gdp   — components (when available)
-- m2_real            — Real M2 money stock
-- cpi                — CPI index level
-- federal_debt       — Total public debt ($M)
-- federal_interest   — Federal interest outlays
-- bitcoin            — BTC/USD
-- btc_gold_ratio     — BTC price / gold oz
-- margin_debt        — Broker-dealer margin accounts
-- cape               — Shiller CAPE proxy / PE
-- fear_greed         — Crypto Fear & Greed (0-100)
-- yield_curve        — 10Y–2Y Treasury spread (pp)
-- credit_spread      — Baa–10Y credit spread (pp)
