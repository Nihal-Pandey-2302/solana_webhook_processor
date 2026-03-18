CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watched_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address_id UUID NOT NULL REFERENCES watched_addresses(id) ON DELETE CASCADE,
  condition_type VARCHAR NOT NULL,
  condition_value VARCHAR,
  channels JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature VARCHAR NOT NULL UNIQUE,
  slot BIGINT NOT NULL,
  fee_payer VARCHAR,
  source_address VARCHAR,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
