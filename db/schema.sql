CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  stripe_customer_id TEXT UNIQUE,
  phone TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT,
  year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'daily' CHECK (vehicle_type IN ('daily', 'collector', 'business')),
  license_plate TEXT,
  plate_state TEXT,
  vin_last_six TEXT,
  service_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate_state TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin_last_six TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS service_notes TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  vehicle_count INTEGER NOT NULL DEFAULT 1 CHECK (vehicle_count > 0),
  status TEXT NOT NULL DEFAULT 'incomplete',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS membership_vehicles (
  membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (membership_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  preferred_date DATE,
  preferred_window TEXT,
  service_type TEXT NOT NULL DEFAULT 'membership_detail',
  service_location TEXT NOT NULL DEFAULT 'home',
  service_address TEXT,
  notes TEXT,
  admin_notes TEXT,
  assigned_detailer TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS preferred_window TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_location TEXT NOT NULL DEFAULT 'home';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_address TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_detailer TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_customer_id_idx ON memberships(stripe_customer_id);
CREATE INDEX IF NOT EXISTS membership_vehicles_user_id_idx ON membership_vehicles(user_id);
CREATE INDEX IF NOT EXISTS membership_vehicles_vehicle_id_idx ON membership_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS service_requests_user_id_idx ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status);
