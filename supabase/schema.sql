CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE locations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  location_id   INT NOT NULL REFERENCES locations(id),
  number        TEXT NOT NULL,
  type          TEXT,
  nightly_rate  NUMERIC(10,2) NOT NULL,
  housekeeping  TEXT NOT NULL DEFAULT 'ready'
                CHECK (housekeeping IN ('ready','needs_inspection','awaiting_cleaning')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, number)
);

CREATE TABLE bookings (
  id               SERIAL PRIMARY KEY,
  invoice          TEXT,
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT NOT NULL,
  expected_arrival TIMESTAMPTZ NOT NULL,
  checkout_at      TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'booked'
                   CHECK (status IN ('booked','checked_in','checked_out','cancelled')),
  checked_in_at    TIMESTAMPTZ,
  checked_in_by    UUID REFERENCES users(id),
  checked_out_at   TIMESTAMPTZ,
  checked_out_by   UUID REFERENCES users(id),
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookings_invoice_idx    ON bookings (invoice);
CREATE INDEX bookings_arrival_idx    ON bookings (expected_arrival);
CREATE INDEX bookings_status_idx     ON bookings (status);

CREATE TABLE stays (
  id          SERIAL PRIMARY KEY,
  booking_id  INT NOT NULL REFERENCES bookings(id),
  room_id     INT NOT NULL REFERENCES rooms(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  CHECK (ends_at > starts_at),
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
  set_by      UUID REFERENCES users(id),
  released    BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX holds_room_idx ON holds (room_id);

CREATE TABLE payments (
  id           SERIAL PRIMARY KEY,
  booking_id   INT NOT NULL REFERENCES bookings(id),
  amount       NUMERIC(10,2) NOT NULL,
  method       TEXT NOT NULL,
  reference    TEXT,
  invoice      TEXT,
  recorded_by  UUID REFERENCES users(id),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided       BOOLEAN NOT NULL DEFAULT false,
  void_reason  TEXT,
  voided_by    UUID REFERENCES users(id)
);

CREATE INDEX payments_booking_idx ON payments (booking_id);
CREATE INDEX payments_invoice_idx ON payments (invoice);

CREATE TABLE activity_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
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

INSERT INTO locations (name) VALUES ('Dam Lodge'), ('Farm House')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stays          ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION create_booking(
  p_location_id    INT,
  p_room_numbers   TEXT[],
  p_guest_name     TEXT,
  p_guest_phone    TEXT,
  p_expected_arrival TIMESTAMPTZ,
  p_nights         INT,
  p_amount         NUMERIC,
  p_method         TEXT,
  p_reference      TEXT,
  p_invoice        TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id INT;
  v_invoice    TEXT;
  v_room_id    INT;
  v_checkout   TIMESTAMPTZ;
  v_i          INT;
BEGIN
  v_invoice := COALESCE(p_invoice, 'INV-' || to_char(now() AT TIME ZONE 'Africa/Lusaka', 'YYMMDD') || '-' || floor(random() * 9000 + 1000)::int);
  v_checkout := ((p_expected_arrival AT TIME ZONE 'Africa/Lusaka')::date + p_nights)::timestamp
                AT TIME ZONE 'Africa/Lusaka' + interval '10 hours';

  INSERT INTO bookings (invoice, guest_name, guest_phone, expected_arrival, checkout_at, status)
  VALUES (v_invoice, p_guest_name, p_guest_phone, p_expected_arrival, v_checkout, 'booked')
  RETURNING id INTO v_booking_id;

  FOR v_i IN 1..coalesce(array_length(p_room_numbers, 1), 0) LOOP
    SELECT id INTO v_room_id
    FROM rooms WHERE location_id = p_location_id AND number = p_room_numbers[v_i];
    IF v_room_id IS NULL THEN
      RAISE EXCEPTION 'Room % not found at location %', p_room_numbers[v_i], p_location_id;
    END IF;
    INSERT INTO stays (booking_id, room_id, starts_at, ends_at)
    VALUES (v_booking_id, v_room_id, p_expected_arrival, v_checkout);
  END LOOP;

  IF p_amount IS NOT NULL AND p_amount > 0 THEN
    INSERT INTO payments (booking_id, amount, method, reference, invoice)
    VALUES (v_booking_id, p_amount, p_method, p_reference, v_invoice);
  END IF;

  INSERT INTO activity_log (action, booking_id)
  VALUES ('booking created: ' || p_guest_name || ' · rooms ' || array_to_string(p_room_numbers, ', '), v_booking_id);

  RETURN json_build_object('booking_id', v_booking_id, 'invoice', v_invoice);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'One of the selected rooms is already booked for those dates');
END;
$$;
