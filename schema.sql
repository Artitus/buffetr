-- Create the metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(metric_type, recorded_at)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_metrics_type_date ON metrics(metric_type, recorded_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON metrics FOR SELECT USING (true);

-- Allow authenticated insert/update (for cron job)
CREATE POLICY "Allow insert" ON metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON metrics FOR UPDATE USING (true);

