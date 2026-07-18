CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT,
  year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'daily' CHECK (vehicle_type IN ('daily', 'collector', 'business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  vehicle_count INTEGER NOT NULL DEFAULT 1 CHECK (vehicle_count > 0),
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  preferred_date DATE,
  service_type TEXT NOT NULL DEFAULT 'membership_detail',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_customer_id_idx ON memberships(stripe_customer_id);
CREATE INDEX IF NOT EXISTS service_requests_user_id_idx ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status);
