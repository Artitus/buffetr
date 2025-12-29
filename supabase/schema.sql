-- Buffetr Database Schema
-- Run this in your Supabase SQL editor to set up the database

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

-- Index for getting latest values quickly
CREATE INDEX IF NOT EXISTS idx_metrics_latest ON metrics(metric_type, recorded_at DESC);

-- Enable Row Level Security (optional, for public read access)
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Allow public read access to metrics
CREATE POLICY "Allow public read access" ON metrics
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update (for cron jobs)
CREATE POLICY "Allow authenticated insert" ON metrics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON metrics
  FOR UPDATE
  USING (true);

-- Metric types reference:
-- buffett_indicator: Total Market Cap / GDP ratio (as percentage)
-- gold: Gold price in USD per troy ounce
-- silver: Silver price in USD per troy ounce  
-- sp500: S&P 500 index value
-- mortgage_rate: 30-year fixed mortgage rate (percentage)
-- home_price_index: Case-Shiller National Home Price Index
-- market_cap: Total US stock market capitalization (Wilshire 5000)
-- gdp: US Gross Domestic Product

-- Sample data insertion (for testing)
-- INSERT INTO metrics (metric_type, value, recorded_at) VALUES
--   ('buffett_indicator', 195.5, '2024-01-01'),
--   ('gold', 2050.00, '2024-01-01'),
--   ('silver', 23.50, '2024-01-01');

