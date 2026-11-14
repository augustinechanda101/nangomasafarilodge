-- Nangoma Safari Lodge — canonical schema (Supabase)
-- Run once in the Supabase SQL editor. Idempotent-ish: fresh DB expected.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- LOCATIONS  (added: Dam Lodge / Farm House)
CREATE TABLE locations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USERS  (changed: Supabase auth instead of firebase_uid; added 'staff' role)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('staff','reception','gm')),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','disabled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id            SERIAL PRIMARY KEY,
  location_id   INT NOT NULL REFERENCES locations(id),   -- added
  number        TEXT NOT NULL,
  type          TEXT,
  nightly_rate  NUMERIC(10,2) NOT NULL,
  -- ready | needs_inspection | awaiting_cleaning
  housekeeping  TEXT NOT NULL DEFAULT 'ready'
                CHECK (housekeeping IN ('ready','needs_inspection','awaiting_cleaning')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, number)                           -- changed: per location
);

CREATE TABLE bookings (
  id               SERIAL PRIMARY KEY,
  invoice          TEXT,                                 -- added: links a group booking
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT NOT NULL,
  expected_arrival TIMESTAMPTZ NOT NULL,
  checkout_at      TIMESTAMPTZ NOT NULL,                 -- always 10:00, computed on create
  status           TEXT NOT NULL DEFAULT 'booked'
                   CHECK (status IN ('booked','checked_in','checked_out','cancelled')),
  checked_in_at    TIMESTAMPTZ,
  checked_in_by    INT REFERENCES users(id),             -- nullable until auth is wired
  checked_out_at   TIMESTAMPTZ,
  checked_out_by   INT REFERENCES users(id),
  created_by       INT REFERENCES users(id),             -- nullable until auth is wired
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookings_invoice_idx    ON bookings (invoice);
CREATE INDEX bookings_arrival_idx    ON bookings (expected_arrival);
CREATE INDEX bookings_status_idx     ON bookings (status);

-- one row per room the guest sleeps in; a move adds a row
CREATE TABLE stays (
  id          SERIAL PRIMARY KEY,
  booking_id  INT NOT NULL REFERENCES bookings(id),
  room_id     INT NOT NULL REFERENCES rooms(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  CHECK (ends_at > starts_at),
  -- the safety net: same room, overlapping time = rejected by Postgres
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (active)
);

CREATE INDEX stays_booking_idx ON stays (booking_id);
CREATE INDEX stays_room_idx    ON stays (room_id);

CREATE TABLE holds (
  id          SERIAL PRIMARY KEY,
  room_id     INT NOT NULL REFERENCES rooms(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  note        TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  set_by      INT REFERENCES users(id),                  -- nullable until auth
  released    BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX holds_room_idx ON holds (room_id);

CREATE TABLE payments (
  id           SERIAL PRIMARY KEY,
  booking_id   INT NOT NULL REFERENCES bookings(id),
  amount       NUMERIC(10,2) NOT NULL,    -- negative = credit/refund line
  method       TEXT NOT NULL,             -- Mobile money | Cash | Bank transfer
  reference    TEXT,
  invoice      TEXT,                      -- added: mirrors the booking's invoice
  recorded_by  INT REFERENCES users(id),  -- nullable until auth
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided       BOOLEAN NOT NULL DEFAULT false,
  void_reason  TEXT,
  voided_by    INT REFERENCES users(id)
);

CREATE INDEX payments_booking_idx ON payments (booking_id);
CREATE INDEX payments_invoice_idx ON payments (invoice);

CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),                  -- nullable until auth
  action      TEXT NOT NULL,
  booking_id  INT REFERENCES bookings(id),
  room_id     INT REFERENCES rooms(id),
  before      JSONB,
  after       JSONB,
  reason      TEXT,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activity_log_at_idx ON activity_log (at DESC);

CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  message     TEXT NOT NULL,
  booking_id  INT REFERENCES bookings(id),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the two locations
INSERT INTO locations (name) VALUES ('Dam Lodge'), ('Farm House')
ON CONFLICT (name) DO NOTHING;

-- RLS  (added — required for the publishable key to reach the data)
ALTER TABLE locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stays          ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- MVP: permissive while the app runs pre-auth. Tighten when Supabase Auth lands:
-- staff/reception read everything; only reception/gm write; users read own row.
CREATE POLICY "mvp read locations"     ON locations     FOR SELECT USING (true);
CREATE POLICY "mvp write locations"    ON locations     FOR INSERT WITH CHECK (true);

CREATE POLICY "mvp read rooms"         ON rooms         FOR SELECT USING (true);
CREATE POLICY "mvp write rooms"        ON rooms         FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp update rooms"       ON rooms         FOR UPDATE USING (true);

CREATE POLICY "mvp read bookings"      ON bookings      FOR SELECT USING (true);
CREATE POLICY "mvp insert bookings"    ON bookings      FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp update bookings"    ON bookings      FOR UPDATE USING (true);

CREATE POLICY "mvp read stays"         ON stays         FOR SELECT USING (true);
CREATE POLICY "mvp insert stays"       ON stays         FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp update stays"       ON stays         FOR UPDATE USING (true);

CREATE POLICY "mvp read holds"         ON holds         FOR SELECT USING (true);
CREATE POLICY "mvp insert holds"       ON holds         FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp update holds"       ON holds         FOR UPDATE USING (true);

CREATE POLICY "mvp read payments"      ON payments      FOR SELECT USING (true);
CREATE POLICY "mvp insert payments"    ON payments      FOR INSERT WITH CHECK (true);
CREATE POLICY "mvp update payments"    ON payments      FOR UPDATE USING (true);

CREATE POLICY "mvp read logs"          ON activity_log  FOR SELECT USING (true);
CREATE POLICY "mvp insert logs"        ON activity_log  FOR INSERT WITH CHECK (true);

CREATE POLICY "mvp read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "mvp update notifications" ON notifications FOR UPDATE USING (true);
