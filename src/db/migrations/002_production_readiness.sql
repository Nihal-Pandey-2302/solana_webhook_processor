-- Idempotent Webhooks Tracking
CREATE TABLE IF NOT EXISTS processed_signatures (
  signature VARCHAR PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Basic metrics counter for skipped duplicates
CREATE TABLE IF NOT EXISTS duplicate_skips (
  id SERIAL PRIMARY KEY,
  time_bucket TIMESTAMP DEFAULT date_trunc('hour', NOW()),
  count INT DEFAULT 1,
  UNIQUE(time_bucket)
);

-- Dead Letter Jobs
CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_queue VARCHAR NOT NULL,
  job_id VARCHAR,
  job_data JSONB,
  failure_reason TEXT,
  failed_at TIMESTAMP DEFAULT NOW(),
  retry_count INT,
  status VARCHAR DEFAULT 'pending'
);
